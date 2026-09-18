import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import {
  createSystemInstruction,
  generateFallbackResponse,
  buildConversationStateInventory,
} from './server';

// HTTP Live Session Fallback State Store
interface HttpLiveSession {
  sessionId: string;
  candidate: any;
  scenario: string;
  availableSlots: any[];
  languagePreference: string;
  mode: 'gemini_live' | 'conversational_engine';
  session: any;
  conversationHistory: Array<{ sender: 'agent' | 'candidate'; text: string }>;
  sseClients: express.Response[];
}

const httpLiveSessions = new Map<string, HttpLiveSession>();

export function setupGeminiLiveWebSocket(server: http.Server, app: express.Express) {
  // 1. Mount HTTP Fallback Endpoints for Reverse Proxy Environments
  app.post('/api/live-session/start', async (req, res) => {
    const { sessionId, candidate, scenario, availableSlots, languagePreference } = req.body;
    const sid = sessionId || `session_${Date.now()}`;

    const currentLang = languagePreference || 'Auto';
    const name = candidate?.name || 'Candidate';
    let greeting = '';
    if (scenario === 'screening') {
      greeting =
        currentLang === 'Hindi'
          ? `Namaste, kya meri baat ${name} ji se ho rahi hai?`
          : `Hi, am I speaking with ${name}?`;
    } else if (scenario === 'reminder') {
      greeting =
        currentLang === 'Hindi'
          ? `Namaste ${name} ji, main White Collar Realty se Arjun bol raha hoon. Kal interview scheduled hai.`
          : `Hi ${name}, I'm calling from White Collar Realty regarding your interview scheduled for tomorrow.`;
    } else if (scenario === 'missed_followup') {
      greeting =
        currentLang === 'Hindi'
          ? `Namaste ${name} ji, main White Collar Realty HR se Arjun bol raha hoon. Kal interview attend nahi kar paaye.`
          : `Hi ${name}, I'm calling regarding your interview scheduled yesterday.`;
    } else {
      greeting = `Hi ${name}, I'm calling back as requested earlier.`;
    }

    const liveState: HttpLiveSession = {
      sessionId: sid,
      candidate,
      scenario: scenario || 'screening',
      availableSlots: availableSlots || [],
      languagePreference: currentLang,
      mode: 'conversational_engine',
      session: null,
      conversationHistory: [{ sender: 'agent', text: greeting }],
      sseClients: [],
    };

    httpLiveSessions.set(sid, liveState);
    res.json({ status: 'ok', sessionId: sid, greeting });
  });

  app.get('/api/live-session/stream', (req, res) => {
    const sessionId = req.query.sessionId as string;
    const state = httpLiveSessions.get(sessionId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (!state) {
      res.write(`data: ${JSON.stringify({ type: 'ready', sessionId })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
      return;
    }

    state.sseClients.push(res);

    // Send initial connected & greeting events
    res.write(`data: ${JSON.stringify({ type: 'ready', sessionId })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'connected', mode: state.mode, message: 'Connected' })}\n\n`);
    if (state.conversationHistory.length > 0) {
      const firstMsg = state.conversationHistory[0];
      res.write(`data: ${JSON.stringify({ type: 'transcript', sender: firstMsg.sender, text: firstMsg.text })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'agent_transcript', text: firstMsg.text })}\n\n`);
    }

    req.on('close', () => {
      state.sseClients = state.sseClients.filter((c) => c !== res);
    });
  });

  app.post('/api/live-session/audio', (req, res) => {
    const { sessionId, audio } = req.body;
    const state = httpLiveSessions.get(sessionId);
    if (state && state.session && state.mode === 'gemini_live' && audio) {
      try {
        state.session.sendRealtimeInput({
          audio: {
            data: audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } catch {}
    }
    res.json({ status: 'ok' });
  });

  app.post('/api/live-session/text', (req, res) => {
    const { sessionId, text } = req.body;
    const state = httpLiveSessions.get(sessionId);
    if (!state) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const userText = text?.trim();
    if (userText) {
      state.conversationHistory.push({ sender: 'candidate', text: userText });
      for (const client of state.sseClients) {
        client.write(`data: ${JSON.stringify({ type: 'transcript', sender: 'candidate', text: userText })}\n\n`);
        client.write(`data: ${JSON.stringify({ type: 'user_transcript', text: userText, isFinal: true })}\n\n`);
      }

      try {
        const fallback = generateFallbackResponse(
          state.scenario,
          userText,
          state.candidate,
          state.conversationHistory,
          state.availableSlots
        );

        const replyText =
          fallback.agentReply ||
          fallback.response ||
          'Thank you. Could you share more details on your real estate experience in Gurgaon?';
        state.conversationHistory.push({ sender: 'agent', text: replyText });

        for (const client of state.sseClients) {
          client.write(`data: ${JSON.stringify({ type: 'transcript', sender: 'agent', text: replyText })}\n\n`);
          client.write(`data: ${JSON.stringify({ type: 'agent_transcript', text: replyText })}\n\n`);
          client.write(
            `data: ${JSON.stringify({
              type: 'screening_update',
              data: {
                ...fallback.extractedFields,
                bookedSlotId: fallback.bookedSlotId,
                callbackTime: fallback.callbackTime,
                declineReason: fallback.declineReason,
                conversationMemory: fallback.conversationMemory,
                detectedIntent: fallback.detectedIntent,
                hrDecisionOutcome: fallback.hrDecisionOutcome,
                latestRemark: fallback.latestRemark,
                afterCallAction: fallback.afterCallAction,
              },
            })}\n\n`
          );
          client.write(`data: ${JSON.stringify({ type: 'turn_complete' })}\n\n`);
        }
      } catch (e) {
        console.error('Error generating fallback in HTTP session:', e);
      }
    }

    res.json({ status: 'ok' });
  });

  app.post('/api/live-session/end', (req, res) => {
    const { sessionId } = req.body;
    const state = httpLiveSessions.get(sessionId);
    if (state) {
      for (const client of state.sseClients) {
        try {
          client.write(`data: ${JSON.stringify({ type: 'session_closed' })}\n\n`);
          client.end();
        } catch {}
      }
      httpLiveSessions.delete(sessionId);
    }
    res.json({ status: 'ok' });
  });

  // 2. Setup WebSocket Server for Live Voice Calling
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
    if (pathname === '/api/live-call' || pathname === '/api/live-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (clientWs: WebSocket) => {
    let session: any = null;
    let isClosed = false;
    let mode: 'gemini_live' | 'conversational_engine' = 'conversational_engine';
    let currentCandidate: any = null;
    let currentScenario: string = 'screening';
    let currentSlots: any[] = [];
    let currentLang: string = 'Auto';
    const conversationHistory: Array<{ sender: 'agent' | 'candidate'; text: string }> = [];

    const cleanup = async () => {
      if (isClosed) return;
      isClosed = true;
      if (session) {
        try {
          await session.close();
        } catch (e) {
          console.warn('Error closing session:', e);
        }
        session = null;
      }
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.close();
        } catch {}
      }
    };

    clientWs.on('message', async (rawMsg: any) => {
      try {
        const data = JSON.parse(rawMsg.toString());

        if (data.type === 'init') {
          currentCandidate = data.candidate;
          currentScenario = data.scenario || 'screening';
          currentSlots = data.availableSlots || [];
          currentLang = data.languagePreference || 'Auto';

          // Build context-aware initial HR greeting
          let greeting = '';
          const name = currentCandidate?.name || 'Candidate';
          if (currentScenario === 'screening') {
            greeting =
              currentLang === 'Hindi'
                ? `Namaste, kya meri baat ${name} ji se ho rahi hai?`
                : `Hi, am I speaking with ${name}?`;
          } else if (currentScenario === 'reminder') {
            greeting =
              currentLang === 'Hindi'
                ? `Namaste ${name} ji, main White Collar Realty se Arjun bol raha hoon. Kal interview scheduled hai.`
                : `Hi ${name}, I'm calling from White Collar Realty regarding your interview scheduled for tomorrow.`;
          } else if (currentScenario === 'missed_followup') {
            greeting =
              currentLang === 'Hindi'
                ? `Namaste ${name} ji, main White Collar Realty HR se Arjun bol raha hoon. Kal interview attend nahi kar paaye.`
                : `Hi ${name}, I'm calling regarding your interview scheduled yesterday.`;
          } else {
            greeting = `Hi ${name}, I'm calling back as requested earlier.`;
          }

          const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;

          if (apiKey) {
            try {
              const availableSlotsText = currentSlots
                .filter((s: any) => s.status === 'open' || s.isAvailable)
                .map(
                  (s: any) =>
                    `- Slot [${s.id}]: ${s.date} (${s.dayOfWeek || ''}) at ${s.timeSlot || s.time} with ${
                      s.interviewer || 'HR Director'
                    }`
                )
                .join('\n');

              const stateInventory = buildConversationStateInventory(currentCandidate, [], '');
              const systemInstruction = createSystemInstruction(
                currentCandidate,
                currentScenario,
                availableSlotsText,
                stateInventory
              );

              const ai = new GoogleGenAI({
                apiKey,
                httpOptions: {
                  headers: {
                    'User-Agent': 'aistudio-build',
                  },
                },
              });

              console.log('[GeminiLive] Session created');

              session = await ai.live.connect({
                model: 'gemini-2.0-flash-exp',
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: {
                        voiceName: 'Puck',
                      },
                    },
                  },
                  systemInstruction: {
                    parts: [{ text: systemInstruction }],
                  },
                  outputAudioTranscription: {},
                  inputAudioTranscription: {},
                },
                callbacks: {
                  onmessage: (msg: LiveServerMessage) => {
                    if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

                    // 1. Audio stream from model
                    const parts = msg.serverContent?.modelTurn?.parts;
                    if (parts && parts.length > 0) {
                      for (const part of parts) {
                        if (part.inlineData?.data) {
                          clientWs.send(
                            JSON.stringify({
                              type: 'audio',
                              audio: part.inlineData.data,
                              mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                            })
                          );
                        }
                      }
                    }

                    // 2. Interruption / Barge-in
                    if (msg.serverContent?.interrupted) {
                      console.log('[GeminiLive] Interrupted');
                      clientWs.send(JSON.stringify({ type: 'interrupted' }));
                    }

                    // 3. Turn complete
                    if (msg.serverContent?.turnComplete) {
                      console.log('[GeminiLive] GEMINI RESPONSE COMPLETE');
                      clientWs.send(JSON.stringify({ type: 'turn_complete' }));
                    }

                    // 4. Agent output transcription
                    if (msg.serverContent?.outputTranscription?.text) {
                      const text = msg.serverContent.outputTranscription.text;
                      conversationHistory.push({ sender: 'agent', text });
                      clientWs.send(
                        JSON.stringify({
                          type: 'transcript',
                          sender: 'agent',
                          text,
                        })
                      );
                      clientWs.send(
                        JSON.stringify({
                          type: 'agent_transcript',
                          text,
                        })
                      );
                    }

                    // 5. Candidate input transcription & Incremental Extraction
                    if (msg.serverContent?.inputTranscription?.text) {
                      console.log('[GeminiLive] USER SPEECH DETECTED');
                      const userText = msg.serverContent.inputTranscription.text;
                      conversationHistory.push({ sender: 'candidate', text: userText });
                      clientWs.send(
                        JSON.stringify({
                          type: 'transcript',
                          sender: 'candidate',
                          text: userText,
                        })
                      );
                      clientWs.send(
                        JSON.stringify({
                          type: 'user_transcript',
                          text: userText,
                          isFinal: true,
                        })
                      );

                      try {
                        const fallbackData = generateFallbackResponse(
                          currentScenario,
                          userText,
                          currentCandidate,
                          conversationHistory,
                          currentSlots
                        );

                        clientWs.send(
                          JSON.stringify({
                            type: 'screening_update',
                            data: {
                              ...fallbackData.extractedFields,
                              bookedSlotId: fallbackData.bookedSlotId,
                              callbackTime: fallbackData.callbackTime,
                              declineReason: fallbackData.declineReason,
                              conversationMemory: fallbackData.conversationMemory,
                              detectedIntent: fallbackData.detectedIntent,
                              hrDecisionOutcome: fallbackData.hrDecisionOutcome,
                              latestRemark: fallbackData.latestRemark,
                              afterCallAction: fallbackData.afterCallAction,
                            },
                          })
                        );
                      } catch (extErr) {
                        console.warn('Incremental extraction error:', extErr);
                      }
                    }
                  },
                  onclose: () => {
                    console.log('[GeminiLive] Session closed');
                    if (clientWs.readyState === WebSocket.OPEN) {
                      clientWs.send(JSON.stringify({ type: 'session_ended' }));
                    }
                    cleanup();
                  },
                  onerror: (err) => {
                    console.error('[GeminiLive] Session error:', err?.message || err);
                    mode = 'conversational_engine';
                  },
                },
              });

              console.log('[GeminiLive] Setup sent');
              console.log('[GeminiLive] Setup complete');
              mode = 'gemini_live';
              clientWs.send(
                JSON.stringify({
                  type: 'connected',
                  mode: 'gemini_live',
                  message: 'Connected to Gemini Live API',
                })
              );
              clientWs.send(
                JSON.stringify({
                  type: 'ready',
                  mode: 'gemini_live',
                  message: 'Connected to Gemini Live API',
                })
              );

              session.sendClientContent({
                turns: [
                  {
                    role: 'user',
                    parts: [{ text: `[Call Connected] Start the call now. Greet candidate briefly in 1 sentence: "${greeting}"` }],
                  },
                ],
                endOfTurn: true,
              });
            } catch (connErr) {
              console.warn('Failed to connect to Gemini Live. Switching to Conversational Voice Engine:', connErr);
              mode = 'conversational_engine';
            }
          } else {
            console.log('No GEMINI_API_KEY detected. Running White Collar Realty Conversational Voice Engine.');
            mode = 'conversational_engine';
          }

          if (mode === 'conversational_engine') {
            console.log('[GEMINI] session connected');
            conversationHistory.push({ sender: 'agent', text: greeting });
            clientWs.send(
              JSON.stringify({
                type: 'connected',
                mode: 'conversational_engine',
                message: 'Connected to White Collar Realty AI Voice Recruiter',
              })
            );
            clientWs.send(
              JSON.stringify({
                type: 'ready',
                mode: 'conversational_engine',
                message: 'Connected to White Collar Realty AI Voice Recruiter',
              })
            );
            clientWs.send(
              JSON.stringify({
                type: 'transcript',
                sender: 'agent',
                text: greeting,
              })
            );
            clientWs.send(
              JSON.stringify({
                type: 'agent_transcript',
                text: greeting,
              })
            );
          }
        } else if (data.type === 'realtime_input' || data.type === 'audio') {
          if (mode === 'gemini_live' && session && data.audio) {
            session.sendRealtimeInput({
              audio: {
                data: data.audio,
                mimeType: data.mimeType || 'audio/pcm;rate=16000',
              },
            });
          }
        } else if (data.type === 'text') {
          const userText = data.text?.trim();
          if (!userText) return;

          if (mode === 'gemini_live' && session) {
            session.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [{ text: userText }],
                },
              ],
              endOfTurn: true,
            });
          } else {
            // Conversational Voice Engine turn
            conversationHistory.push({ sender: 'candidate', text: userText });
            clientWs.send(
              JSON.stringify({
                type: 'transcript',
                sender: 'candidate',
                text: userText,
              })
            );

            try {
              const fallback = generateFallbackResponse(
                currentScenario,
                userText,
                currentCandidate,
                conversationHistory,
                currentSlots
              );

              const replyText =
                fallback.agentReply ||
                fallback.response ||
                'Thank you for sharing that. Could you tell me about your relevant real estate sales experience in Gurgaon?';
              conversationHistory.push({ sender: 'agent', text: replyText });

              clientWs.send(
                JSON.stringify({
                  type: 'transcript',
                  sender: 'agent',
                  text: replyText,
                })
              );
              clientWs.send(
                JSON.stringify({
                  type: 'agent_transcript',
                  text: replyText,
                })
              );

              clientWs.send(
                JSON.stringify({
                  type: 'screening_update',
                  data: {
                    ...fallback.extractedFields,
                    bookedSlotId: fallback.bookedSlotId,
                    callbackTime: fallback.callbackTime,
                    declineReason: fallback.declineReason,
                    conversationMemory: fallback.conversationMemory,
                    detectedIntent: fallback.detectedIntent,
                    hrDecisionOutcome: fallback.hrDecisionOutcome,
                    latestRemark: fallback.latestRemark,
                    afterCallAction: fallback.afterCallAction,
                  },
                })
              );
            } catch (fbErr) {
              console.error('Error generating conversational turn:', fbErr);
            }
          }
        } else if (data.type === 'interrupt') {
          // Handled on client & server
        } else if (data.type === 'end') {
          cleanup();
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    clientWs.on('close', () => {
      cleanup();
    });

    clientWs.on('error', (err) => {
      console.warn('Client WebSocket error:', err);
      cleanup();
    });
  });
}
