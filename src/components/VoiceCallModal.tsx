import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, Send, 
  Calendar, CheckCircle, Clock, Building2, Globe, AlertCircle, 
  Bot, User, UserX, RefreshCw, Mail, MessageSquare, PhoneMissed
} from 'lucide-react';
import { 
  Candidate, ChatMessage, CallScenario, ScreeningData, InterviewSlot,
  CandidateRemark, RemarkPriority, RemarkCategory,
  ConversationMemory, HrDecisionOutcome, AfterCallAction
} from '../types';
import { WHITE_COLLAR_JOB_DESCRIPTIONS } from '../data/jobDescriptions';
import { voiceAudio } from '../utils/audioSpeech';

interface VoiceCallModalProps {
  candidate: Candidate;
  scenario: CallScenario;
  availableSlots: InterviewSlot[];
  onClose: () => void;
  onCallEnded: (updatedCandidate: Candidate, bookedSlotId?: string) => void;
  onOpenWhatsApp?: (candidate: Candidate, template?: 'unanswered' | 'interview_reminder' | 'missed_followup') => void;
  onOpenConfirmationMail?: (candidate: Candidate) => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  candidate,
  scenario,
  availableSlots,
  onClose,
  onCallEnded,
  onOpenWhatsApp,
  onOpenConfirmationMail,
}) => {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState<boolean>(true);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [languageMode, setLanguageMode] = useState<'Auto' | 'English' | 'Hindi'>('Auto');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [liveHandsFree, setLiveHandsFree] = useState<boolean>(true);
  const [latencyMode, setLatencyMode] = useState<'ultra' | 'fast' | 'normal'>('ultra');
  const [liveLatencyMs, setLiveLatencyMs] = useState<number | null>(null);
  const [activeVoiceInfo, setActiveVoiceInfo] = useState<{ name: string; isIndianAccent: boolean; lang: string }>(() => voiceAudio.getActiveVoiceInfo());
  const [isVoiceTesting, setIsVoiceTesting] = useState<boolean>(false);

  // Live extracted screening state during call
  const [extracted, setExtracted] = useState<Partial<ScreeningData>>(candidate.screening || {});
  const [detectedIntent, setDetectedIntent] = useState<string>('');
  const [bookedSlotId, setBookedSlotId] = useState<string | undefined>(candidate.interviewSlotId);
  const [callbackTime, setCallbackTime] = useState<string | undefined>(candidate.callbackTime);
  const [declineReason, setDeclineReason] = useState<string | undefined>(candidate.declineReason);
  const [statusRec, setStatusRec] = useState<string>(candidate.status);
  const [latestGeneratedRemark, setLatestGeneratedRemark] = useState<{
    text: string;
    priority: RemarkPriority;
    category: RemarkCategory;
    actionDueDate?: string;
  } | null>(candidate.latestRemark ? {
    text: candidate.latestRemark.text,
    priority: candidate.latestRemark.priority,
    category: candidate.latestRemark.category,
    actionDueDate: candidate.latestRemark.actionDueDate,
  } : null);

  const [conversationMemory, setConversationMemory] = useState<Partial<ConversationMemory>>(
    candidate.conversationMemory || {
      candidate_name: candidate.name,
      target_role: candidate.appliedRole,
      current_company: candidate.screening?.currentCompany || '',
      designation: candidate.screening?.currentDesignation || '',
      total_experience: candidate.screening?.totalExperienceYears ? `${candidate.screening.totalExperienceYears} years` : '',
      real_estate_experience: candidate.screening?.realEstateExperienceYears ? `${candidate.screening.realEstateExperienceYears} years` : '',
      gurgaon_experience: candidate.screening?.gurgaonDubaiExperience?.gurgaon ? 'Yes' : 'Unconfirmed',
      dubai_experience: candidate.screening?.gurgaonDubaiExperience?.dubai ? 'Yes' : 'No',
      current_salary: candidate.screening?.currentSalaryLPA || '',
      expected_salary: candidate.screening?.expectedSalaryLPA || '',
      salary_not_disclosed: false,
      current_location: candidate.screening?.currentLocation || '',
      notice_period: candidate.screening?.noticePeriodDays !== undefined ? `${candidate.screening.noticePeriodDays} days` : '',
      earliest_joining_date: candidate.screening?.earliestJoiningDate || '',
      interested: 'Yes',
      interview_date: candidate.interviewDate || '',
      interview_time: candidate.interviewTime || '',
      conversation_status: 'IN_PROGRESS',
      missing_information: [],
      next_action: 'Conduct initial screening',
    }
  );

  const [hrDecisionOutcome, setHrDecisionOutcome] = useState<HrDecisionOutcome | undefined>(candidate.hrDecisionOutcome);
  const [afterCallAction, setAfterCallAction] = useState<AfterCallAction | null>(candidate.afterCallAction || null);
  const [rightPanelTab, setRightPanelTab] = useState<'checklist' | 'memory' | 'action'>('checklist');

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const candidateSilenceTimerRef = useRef<any>(null);
  const liveHandsFreeRef = useRef<boolean>(true);
  const latencyModeRef = useRef<'ultra' | 'fast' | 'normal'>('ultra');
  const callStatusRef = useRef<'ringing' | 'connected' | 'ended'>('ringing');
  const isAgentSpeakingRef = useRef<boolean>(false);

  useEffect(() => {
    liveHandsFreeRef.current = liveHandsFree;
  }, [liveHandsFree]);

  useEffect(() => {
    latencyModeRef.current = latencyMode;
  }, [latencyMode]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    isAgentSpeakingRef.current = isAgentSpeaking;
  }, [isAgentSpeaking]);

  useEffect(() => {
    const updateVoice = () => {
      setActiveVoiceInfo(voiceAudio.getActiveVoiceInfo());
    };
    updateVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', updateVoice);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', updateVoice);
      };
    }
  }, []);

  // Sound & ringtone reference
  useEffect(() => {
    let stopRing: (() => void) | null = null;
    let connectTimeout: any = null;

    if (callStatus === 'ringing') {
      stopRing = voiceAudio.playRingTone();
      // Fast connect after 900ms for real-time experience
      connectTimeout = setTimeout(() => {
        if (stopRing) stopRing();
        voiceAudio.playConnectChime();
        setCallStatus('connected');
        callStatusRef.current = 'connected';
        startInitialAgentGreeting();
      }, 900);
    }

    return () => {
      if (stopRing) stopRing();
      if (connectTimeout) clearTimeout(connectTimeout);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      voiceAudio.stopSpeaking();
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    let interval: any = null;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, isAgentSpeaking]);

  // Quick preview of the authentic Indian voice
  const handleTestIndianVoice = () => {
    if (isVoiceTesting) return;
    setIsVoiceTesting(true);
    const sample = languageMode === 'Hindi'
      ? 'Namaste! Main White Collar Realty Gurugram se Pooja bol rahi hoon.'
      : 'Hello! I am Pooja, Virtual HR Assistant calling from White Collar Realty Gurugram.';
    voiceAudio.speak(sample, {
      language: languageMode,
      rate: 0.94,
      pitch: 1.08,
      onStart: () => setIsVoiceTesting(true),
      onEnd: () => setIsVoiceTesting(false),
    });
  };

  // Start listening to candidate speech in real-time
  const startListening = () => {
    if (callStatusRef.current !== 'connected' || isAgentSpeakingRef.current) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = languageMode === 'Hindi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcriptResult = '';
        let isFinal = false;
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcriptResult += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            isFinal = true;
          }
        }
        if (transcriptResult) {
          // Rule 6: STOP speaking immediately if candidate interrupts or speaks
          if (isAgentSpeakingRef.current || voiceAudio.isSpeaking()) {
            voiceAudio.stopSpeaking();
            setIsAgentSpeaking(false);
            isAgentSpeakingRef.current = false;
          }
          if (candidateSilenceTimerRef.current) clearTimeout(candidateSilenceTimerRef.current);

          setInputMessage(transcriptResult);

          // Sub-second real-time turn taking:
          // If browser SpeechRecognition already marked this phrase as final, send after 220ms.
          // If interim/in-progress speech, wait for a brief conversational pause.
          if (liveHandsFreeRef.current && transcriptResult.trim().length > 1) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            const currentMode = latencyModeRef.current;
            const pauseDuration = isFinal
              ? (currentMode === 'ultra' ? 220 : currentMode === 'fast' ? 320 : 500)
              : (currentMode === 'ultra' ? 380 : currentMode === 'fast' ? 520 : 750);

            silenceTimerRef.current = setTimeout(() => {
              if (liveHandsFreeRef.current && transcriptResult.trim()) {
                handleSendMessage(transcriptResult.trim());
              }
            }, pauseDuration);
          }
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition event:', e?.error);
        setIsListening(false);
        // If silence timeout and handsfree is active, wait and re-listen if still on call
        if (e?.error === 'no-speech' && liveHandsFreeRef.current && callStatusRef.current === 'connected' && !isAgentSpeakingRef.current) {
          setTimeout(() => {
            if (liveHandsFreeRef.current && callStatusRef.current === 'connected' && !isAgentSpeakingRef.current) {
              startListening();
            }
          }, 1500);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Initial Agent Greeting based on scenario
  const startInitialAgentGreeting = () => {
    let greeting = '';
    const name = candidate.name;
    const role = candidate.appliedRole;

    if (scenario === 'screening') {
      // Rule 12: ALWAYS confirm the candidate's identity first: 'Hi, am I speaking with [Candidate Name]?'
      greeting = languageMode === 'Hindi'
        ? `Namaste, kya meri baat ${name} ji se ho rahi hai?`
        : `Hi, am I speaking with ${name}?`;
    } else if (scenario === 'reminder') {
      // Rule 25: Interview reconfirmation greeting
      greeting = languageMode === 'Hindi'
        ? `Namaste ${name} ji, main White Collar Realty se Pooja bol rahi hoon. Kal ${candidate.interviewTime || '11:00 AM'} ko hamare Sector 67 Gurugram office mein aapka interview scheduled hai. Kya aap confirm kar sakte hain ki aap attend kar rahe hain?`
        : `Hi ${name}, I'm calling from White Collar Realty regarding your interview scheduled for tomorrow at ${candidate.interviewTime || '11:00 AM'}. I'm just calling to confirm whether you'll be able to attend.`;
    } else if (scenario === 'missed_followup') {
      // Rule 26: Missed interview follow-up greeting
      greeting = languageMode === 'Hindi'
        ? `Namaste ${name} ji, main White Collar Realty HR se Pooja bol rahi hoon. Kal aapka interview scheduled tha par aap nahi aa paaye. Main check karna chahti thi ki sab theek hai aur kya aap reschedule karwana chahte hain?`
        : `Hi ${name}, I'm calling regarding your interview scheduled yesterday. We noticed you weren't able to attend. I wanted to check if everything is okay and whether you'd like to reschedule.`;
    } else if (scenario === 'callback_followup') {
      // Rule 11/13: Scheduled callback greeting
      greeting = languageMode === 'Hindi'
        ? `Namaste ${name} ji! Pooja bol rahi hoon White Collar Realty se. Aapne call karne ko kaha tha. Kya abhi 2 minute baat karne ka sahi samay hai?`
        : `Hi ${name}, I'm Pooja calling back from White Collar Realty as requested earlier. Is this a good time to speak for about two minutes?`;
    }

    const initialMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      text: greeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setTranscript([initialMsg]);

    if (voiceSpeechEnabled) {
      setIsAgentSpeaking(true);
      isAgentSpeakingRef.current = true;
      voiceAudio.speak(greeting, {
        language: languageMode,
        onStart: () => {
          setIsAgentSpeaking(true);
          isAgentSpeakingRef.current = true;
        },
        onEnd: () => {
          setIsAgentSpeaking(false);
          isAgentSpeakingRef.current = false;
          // When Pooja finishes initial greeting, automatically open candidate mic for real-time talk!
          if (liveHandsFreeRef.current && callStatusRef.current === 'connected') {
            setTimeout(() => {
              startListening();
            }, 400);
          }
        },
      });
    }
  };

  // Web Speech API Voice Recognition Toggle
  const toggleListening = () => {
    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. You can type your response in the input box below or use the quick response chips.');
      return;
    }

    startListening();
  };

  // Rule 6: Candidate interrupt action
  const handleInterruptAgent = () => {
    voiceAudio.stopSpeaking();
    setIsAgentSpeaking(false);
    isAgentSpeakingRef.current = false;
    if (candidateSilenceTimerRef.current) clearTimeout(candidateSilenceTimerRef.current);
    startListening();
  };

  // Rule 5: Candidate silence simulation
  const handleSimulateSilence = () => {
    handleSendMessage('[Candidate is silent / pausing]');
  };

  // Send candidate utterance to AI backend via real-time streaming endpoint
  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend !== undefined ? textToSend : inputMessage).trim();
    if (!message || isProcessing) return;

    // Rule 6: Stop agent speech immediately if candidate speaks or sends input
    if (isAgentSpeakingRef.current || voiceAudio.isSpeaking()) {
      voiceAudio.stopSpeaking();
      setIsAgentSpeaking(false);
      isAgentSpeakingRef.current = false;
    }
    if (candidateSilenceTimerRef.current) clearTimeout(candidateSilenceTimerRef.current);

    setInputMessage('');
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);

    const candidateMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'candidate',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    const updatedTranscript = [...transcript, candidateMsg];
    const agentMsgId = `msg-${Date.now() + 1}`;
    const agentPlaceholder: ChatMessage = {
      id: agentMsgId,
      sender: 'agent',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setTranscript([...updatedTranscript, agentPlaceholder]);
    setIsProcessing(true);

    const sendStartTime = performance.now();
    let firstSpeechDispatched = false;

    const recordLatency = () => {
      if (!firstSpeechDispatched) {
        firstSpeechDispatched = true;
        const elapsed = Math.round(performance.now() - sendStartTime);
        setLiveLatencyMs(elapsed);
      }
    };

    try {
      const response = await fetch('/api/call/interact-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: {
            ...candidate,
            screening: extracted,
          },
          scenario,
          transcript: updatedTranscript,
          userMessage: message,
          languagePreference: languageMode,
          availableSlots,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming response not available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let sseBuffer = '';
      let spokenLength = 0;

      const speakProgressiveChunk = (currentText: string, isFinal = false) => {
        if (!voiceSpeechEnabled) return;
        const unparsed = currentText.slice(spokenLength);
        if (!unparsed.trim()) return;

        if (isFinal) {
          const finalTrimmed = unparsed.trim();
          if (finalTrimmed) {
            recordLatency();
            setIsAgentSpeaking(true);
            isAgentSpeakingRef.current = true;
            voiceAudio.speakQueue(finalTrimmed, {
              language: languageMode,
              onStart: () => {
                setIsAgentSpeaking(true);
                isAgentSpeakingRef.current = true;
              },
              onEnd: () => {
                if (!voiceAudio.isSpeaking()) {
                  setIsAgentSpeaking(false);
                  isAgentSpeakingRef.current = false;
                  if (liveHandsFreeRef.current && callStatusRef.current === 'connected') {
                    setTimeout(() => {
                      startListening();
                    }, 150);
                  }
                }
              },
            });
            spokenLength = currentText.length;
          }
          return;
        }

        // Sub-second audio playback: split on sentence boundaries or early clause boundaries
        let splitIndex = -1;
        const punctMatch = unparsed.match(/([.?!]\s+|\n+)/);
        if (punctMatch && punctMatch.index !== undefined) {
          splitIndex = punctMatch.index + punctMatch[0].length;
        } else if (unparsed.length >= 18) {
          // Early clause split on comma, semicolon, colon, or dash
          const clauseMatch = unparsed.match(/([,;:—]\s+)/);
          if (clauseMatch && clauseMatch.index !== undefined) {
            splitIndex = clauseMatch.index + clauseMatch[0].length;
          } else if (unparsed.length >= 38) {
            // Word boundary fallback if long clause
            const wordMatch = unparsed.slice(25).match(/\s+/);
            if (wordMatch && wordMatch.index !== undefined) {
              splitIndex = 25 + wordMatch.index + wordMatch[0].length;
            }
          }
        }

        if (splitIndex > 0) {
          const sentence = unparsed.slice(0, splitIndex).trim();
          if (sentence) {
            recordLatency();
            setIsAgentSpeaking(true);
            isAgentSpeakingRef.current = true;
            voiceAudio.speakQueue(sentence, {
              language: languageMode,
              onStart: () => {
                setIsAgentSpeaking(true);
                isAgentSpeakingRef.current = true;
              },
              onEnd: () => {
                if (!voiceAudio.isSpeaking()) {
                  setIsAgentSpeaking(false);
                  isAgentSpeakingRef.current = false;
                  if (liveHandsFreeRef.current && callStatusRef.current === 'connected') {
                    setTimeout(() => {
                      startListening();
                    }, 150);
                  }
                }
              },
            });
            spokenLength += splitIndex;
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const blocks = sseBuffer.split('\n\n');
        sseBuffer = blocks.pop() || '';

        for (const block of blocks) {
          const eventMatch = block.match(/event:\s*(\w+)/);
          const dataMatch = block.match(/data:\s*(.+)/s);

          const eventName = eventMatch ? eventMatch[1] : 'message';
          let payload: any = null;
          if (dataMatch) {
            try {
              payload = JSON.parse(dataMatch[1]);
            } catch {}
          }

          if (eventName === 'chunk' && payload?.text) {
            accumulatedText += payload.text;
            setTranscript((prev) =>
              prev.map((m) => (m.id === agentMsgId ? { ...m, text: accumulatedText } : m))
            );
            speakProgressiveChunk(accumulatedText, false);
          } else if (eventName === 'complete' && payload) {
            if (payload.agentReply && !accumulatedText) {
              accumulatedText = payload.agentReply;
              setTranscript((prev) =>
                prev.map((m) => (m.id === agentMsgId ? { ...m, text: accumulatedText } : m))
              );
            }

            if (payload.extractedFields && Object.keys(payload.extractedFields).length > 0) {
              setExtracted((prev) => ({
                ...prev,
                ...payload.extractedFields,
                gurgaonDubaiExperience: {
                  ...prev.gurgaonDubaiExperience,
                  ...(payload.extractedFields.gurgaonDubaiExperience || {}),
                },
              }));
            }

            if (payload.detectedIntent) setDetectedIntent(payload.detectedIntent);
            if (payload.hrDecisionOutcome) setHrDecisionOutcome(payload.hrDecisionOutcome);
            if (payload.conversationMemory) {
              setConversationMemory((prev) => ({ ...prev, ...payload.conversationMemory }));
            }
            if (payload.selectedSlotId) setBookedSlotId(payload.selectedSlotId);
            if (payload.callbackTime) setCallbackTime(payload.callbackTime);
            if (payload.declineReason) setDeclineReason(payload.declineReason);
            if (payload.statusRecommendation) setStatusRec(payload.statusRecommendation);
            if (payload.generatedRemark) setLatestGeneratedRemark(payload.generatedRemark);
          }
        }
      }

      speakProgressiveChunk(accumulatedText, true);

    } catch (err) {
      console.warn('Call interact streaming fallback:', err);
      try {
        const fallbackRes = await fetch('/api/call/interact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate: {
              ...candidate,
              screening: extracted,
            },
            scenario,
            transcript: updatedTranscript,
            userMessage: message,
            languagePreference: languageMode,
            availableSlots,
          }),
        });

        const data = await fallbackRes.json();
        const agentReplyText = data.agentReply || 'Understood. Thank you for confirming that.';

        setTranscript((prev) =>
          prev.map((m) => (m.id === agentMsgId ? { ...m, text: agentReplyText } : m))
        );

        if (data.extractedFields && Object.keys(data.extractedFields).length > 0) {
          setExtracted((prev) => ({
            ...prev,
            ...data.extractedFields,
            gurgaonDubaiExperience: {
              ...prev.gurgaonDubaiExperience,
              ...(data.extractedFields.gurgaonDubaiExperience || {}),
            },
          }));
        }

        if (data.detectedIntent) setDetectedIntent(data.detectedIntent);
        if (data.hrDecisionOutcome) setHrDecisionOutcome(data.hrDecisionOutcome);
        if (data.conversationMemory) {
          setConversationMemory((prev) => ({ ...prev, ...data.conversationMemory }));
        }
        if (data.selectedSlotId) setBookedSlotId(data.selectedSlotId);
        if (data.callbackTime) setCallbackTime(data.callbackTime);
        if (data.declineReason) setDeclineReason(data.declineReason);
        if (data.statusRecommendation) setStatusRec(data.statusRecommendation);
        if (data.generatedRemark) setLatestGeneratedRemark(data.generatedRemark);

        if (voiceSpeechEnabled) {
          setIsAgentSpeaking(true);
          isAgentSpeakingRef.current = true;
          voiceAudio.speak(agentReplyText, {
            language: languageMode,
            onStart: () => {
              setIsAgentSpeaking(true);
              isAgentSpeakingRef.current = true;
            },
            onEnd: () => {
              setIsAgentSpeaking(false);
              isAgentSpeakingRef.current = false;
              if (liveHandsFreeRef.current && callStatusRef.current === 'connected') {
                setTimeout(() => {
                  startListening();
                }, 400);
              }
            },
          });
        }
      } catch (fallbackErr) {
        console.error('Call interact fallback error:', fallbackErr);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // End Call & Commit Changes
  const handleEndCall = async () => {
    voiceAudio.stopSpeaking();
    voiceAudio.playDisconnectTone();
    setCallStatus('ended');

    // Generate call summary
    let summary = `Call ended after ${Math.floor(callDuration / 60)}m ${callDuration % 60}s.`;
    let scorecard = candidate.scorecard;

    try {
      const sumRes = await fetch('/api/call/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate,
          transcript,
          callScenario: scenario,
        }),
      });
      const sumData = await sumRes.json();
      if (sumData.summary) summary = sumData.summary;
      if (sumData.scorecard) scorecard = sumData.scorecard;
      if (sumData.latestRemark) {
        setLatestGeneratedRemark((prev) => prev || sumData.latestRemark);
      }
      if (sumData.afterCallAction) {
        setAfterCallAction(sumData.afterCallAction);
      }
    } catch (e) {
      console.warn('Summarize fallback:', e);
    }

    // Determine final status
    let finalStatus = statusRec as any;
    let finalInterviewStatus = candidate.interviewStatus;
    let chosenSlot = availableSlots.find((s) => s.id === bookedSlotId);

    if (detectedIntent === 'cancel_decline' || declineReason) {
      finalStatus = 'Declined - Do Not Call';
      finalInterviewStatus = 'Declined';
    } else if (detectedIntent === 'request_callback' || callbackTime) {
      finalStatus = 'Callback Needed';
    } else if (bookedSlotId && (scenario === 'screening' || scenario === 'missed_followup' || detectedIntent === 'confirm_interview')) {
      finalStatus = scenario === 'reminder' ? 'Attendance Confirmed' : 'Interview Scheduled';
      finalInterviewStatus = scenario === 'reminder' ? 'Confirmed' : 'Scheduled';
    } else if (scenario === 'reminder' && detectedIntent === 'confirm_interview') {
      finalStatus = 'Attendance Confirmed';
      finalInterviewStatus = 'Confirmed';
    }

    // Determine Priority Remark based on conversation outcome
    const remarkText =
      latestGeneratedRemark?.text ||
      (detectedIntent === 'already_joined_negotiation'
        ? `Candidate recently joined another company. Presented White Collar Realty role budget & luxury incentive potential. Counter-offer review pending.`
        : detectedIntent === 'pipeline_future'
        ? `Candidate committed to current role. Kept in high-potential 90-day talent pipeline.`
        : finalStatus === 'Interview Scheduled'
        ? `Face-to-face interview confirmed for ${chosenSlot?.displayLabel || 'upcoming slot'} at Sector 67 Gurugram HQ.`
        : finalStatus === 'Attendance Confirmed'
        ? `Attendance reconfirmed for face-to-face round at Sector 67 HQ.`
        : finalStatus === 'Callback Needed'
        ? `Callback requested (${callbackTime || 'Later Today'}). Priority follow-up task active.`
        : finalStatus === 'Declined - Do Not Call'
        ? `Candidate declined (${declineReason || 'Not exploring'}). Follow-up calls suspended.`
        : `Screening completed. Candidate profile recorded for White Collar Realty hiring.`);

    const remarkPriority: RemarkPriority =
      latestGeneratedRemark?.priority ||
      (finalStatus === 'Interview Scheduled' || finalStatus === 'Attendance Confirmed'
        ? 'High'
        : finalStatus === 'Callback Needed'
        ? 'High'
        : detectedIntent === 'already_joined_negotiation'
        ? 'High'
        : scenario === 'missed_followup'
        ? 'Urgent'
        : 'Medium');

    const remarkCategory: RemarkCategory =
      latestGeneratedRemark?.category ||
      (detectedIntent === 'already_joined_negotiation'
        ? 'Already Joined - Counter Offer Open'
        : detectedIntent === 'pipeline_future'
        ? 'Already Joined - Future Pipeline'
        : finalStatus === 'Interview Scheduled'
        ? 'Interview Scheduled'
        : finalStatus === 'Attendance Confirmed'
        ? 'Attendance Reconfirmation'
        : finalStatus === 'Callback Needed'
        ? 'Callback Due'
        : scenario === 'missed_followup'
        ? 'Missed Interview Reschedule'
        : finalStatus === 'Declined - Do Not Call'
        ? 'Declined - Do Not Call'
        : 'Notice Period Evaluation');

    const rawActionDue =
      latestGeneratedRemark?.actionDueDate ||
      (remarkCategory === 'Already Joined - Future Pipeline'
        ? 'In 90 Days'
        : finalStatus === 'Interview Scheduled'
        ? 'Tomorrow'
        : 'Today');

    const alertDueDate: 'Overdue' | 'Today' | 'Tomorrow' | 'Upcoming' =
      rawActionDue === 'Tomorrow'
        ? 'Tomorrow'
        : rawActionDue === 'Overdue'
        ? 'Overdue'
        : rawActionDue === 'Today'
        ? 'Today'
        : 'Upcoming';

    const newRemark: CandidateRemark = {
      id: `rem-${Date.now()}`,
      text: remarkText,
      priority: remarkPriority,
      category: remarkCategory,
      createdAt: new Date().toISOString(),
      actionDueDate: rawActionDue,
      author: 'Pooja (Virtual AI HR)',
    };

    const updatedCandidate: Candidate = {
      ...candidate,
      status: finalStatus,
      interviewStatus: finalInterviewStatus,
      screening: {
        ...candidate.screening,
        ...extracted,
      },
      interviewSlotId: bookedSlotId || candidate.interviewSlotId,
      interviewDate: chosenSlot ? chosenSlot.date : candidate.interviewDate,
      interviewTime: chosenSlot ? chosenSlot.time : candidate.interviewTime,
      interviewVenue: chosenSlot ? chosenSlot.venue : candidate.interviewVenue,
      lastCallDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      callCount: candidate.callCount + 1,
      callbackTime: callbackTime || candidate.callbackTime,
      declineReason: declineReason || candidate.declineReason,
      notes: summary,
      scorecard: scorecard || candidate.scorecard,
      conversationMemory: conversationMemory as ConversationMemory,
      hrDecisionOutcome: hrDecisionOutcome,
      afterCallAction: afterCallAction || undefined,
      latestRemark: newRemark,
      remarksHistory: [newRemark, ...(candidate.remarksHistory || [])],
      alertDueDate: alertDueDate,
      alertReason: `${remarkPriority} Priority: ${remarkCategory} - ${remarkText.substring(0, 75)}...`,
      callHistory: [
        {
          id: `call-${Date.now()}`,
          candidateId: candidate.id,
          candidateName: candidate.name,
          timestamp: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
          scenario,
          durationSeconds: callDuration,
          transcript,
          summary,
          outcome: finalStatus,
          extractedFields: extracted,
          detectedIntent,
          callbackTime,
          declineReason,
          conversationMemory: conversationMemory as ConversationMemory,
          hrDecisionOutcome: hrDecisionOutcome,
          afterCallAction: afterCallAction || undefined,
        },
        ...candidate.callHistory,
      ],
    };

    onCallEnded(updatedCandidate, bookedSlotId);
  };

  // Simulate unanswered call (Candidate does not pick up)
  const handleSimulateUnanswered = () => {
    voiceAudio.stopSpeaking();
    voiceAudio.playDisconnectTone();
    setCallStatus('ended');

    const unansweredRemark: CandidateRemark = {
      id: `rem-${Date.now()}`,
      text: `Call attempt ${candidate.unansweredAttempts + 1} went unanswered. Scheduled automated retry follow-up.`,
      priority: 'Medium',
      category: 'Unanswered Retry',
      createdAt: new Date().toISOString(),
      actionDueDate: 'Today',
      author: 'Pooja (Virtual AI HR)',
    };

    const updatedCandidate: Candidate = {
      ...candidate,
      unansweredAttempts: candidate.unansweredAttempts + 1,
      lastCallDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      callCount: candidate.callCount + 1,
      notes: `Call unanswered (Attempt ${candidate.unansweredAttempts + 1}). Next retry queued in follow-up system.`,
      latestRemark: unansweredRemark,
      remarksHistory: [unansweredRemark, ...(candidate.remarksHistory || [])],
      alertDueDate: 'Today',
      alertReason: `Medium Priority: Unanswered Retry (Attempt ${candidate.unansweredAttempts + 1})`,
      callHistory: [
        {
          id: `call-${Date.now()}`,
          candidateId: candidate.id,
          candidateName: candidate.name,
          timestamp: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
          scenario,
          durationSeconds: 15,
          transcript: [{ id: 'm0', sender: 'system', text: 'Call rang for 25 seconds. Unanswered by candidate.', timestamp: '12:00' }],
          summary: `Call attempt ${candidate.unansweredAttempts + 1} went unanswered. Automated retry timer scheduled.`,
          outcome: 'Unanswered Call',
          extractedFields: {},
        },
        ...candidate.callHistory,
      ],
    };

    onCallEnded(updatedCandidate);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Quick testing response chips depending on call stage
  const getQuickResponseChips = () => {
    if (scenario === 'reminder') {
      return [
        { label: 'Yes, Attendance Confirmed', text: 'Haanji, I will definitely attend tomorrow at 11:00 AM at your Sector 67 M3M Urbana office.' },
        { label: 'Need to Reschedule', text: 'Actually I have an urgent client visit tomorrow. Can we reschedule to day after tomorrow 3:30 PM?' },
        { label: 'Accepted Another Offer (Decline)', text: 'I have already accepted an offer with another real estate firm, so please cancel.' },
      ];
    }

    if (scenario === 'missed_followup') {
      return [
        { label: 'Apologies, Reschedule', text: 'Extremely sorry, I was held up in emergency travel. Can we reschedule for tomorrow at 2:30 PM?' },
        { label: 'Not Interested Any More', text: 'I am no longer exploring real estate job opportunities. Please close my file.' },
      ];
    }

    // Default Screening Chips
    const turns = transcript.filter((m) => m.sender === 'candidate').length;
    if (turns === 0) {
      return [
        { label: 'Yes, speaking (Rule 12)', text: 'Yes, speaking.' },
        { label: 'Hindi: Haanji, main bol raha hu', text: 'Haanji, main bol raha hoon.' },
        { label: 'Wrong number (Rule 12)', text: 'No, this is wrong number. Nobody by that name here.' },
      ];
    } else if (turns === 1) {
      return [
        { label: 'Yes, have 2 mins (Rule 13)', text: 'Yes, I can speak for two minutes.' },
        { label: 'Hindi: Haanji, boliye', text: 'Haanji bilkul, kahiye.' },
        { label: 'Salary Range First? (Rule 7)', text: 'Before proceeding, could you share the salary range for this role?' },
        { label: 'Driving / Callback (Rule 11)', text: 'I am driving right now on Golf Course Road. Please call me back today at 5:30 PM.' },
        { label: 'Already Joined Other Firm (Rule 30)', text: 'Actually I have already joined another real estate company last week.' },
        { label: 'Not Interested (Rule 10)', text: 'I am not looking to switch right now. Please close my application.' },
      ];
    } else if (turns === 2) {
      return [
        { label: 'Confirm Role (Rule 14)', text: `Yes, I applied for the ${candidate.appliedRole} position.` },
        { label: 'Square Yards, 4 Yrs Gurgaon (Rule 16-18)', text: 'I am working with Square Yards as Senior Consultant. Total 4 years experience in Gurgaon luxury residential sales.' },
        { label: 'DLF Consultant, Dubai + Gurgaon', text: 'Currently with DLF Homes as Consultant. 5 years real estate experience with both Gurgaon and Dubai sales.' },
        { label: 'Off-Topic: Financial Sales (Rule 8)', text: 'I worked in insurance and mutual fund sales in Delhi before moving here.' },
        { label: 'Uncertain: Don\'t Know Volume (Rule 9)', text: 'I do not know my exact quarterly sales volume off the top of my head.' },
      ];
    } else if (turns === 3) {
      return [
        { label: 'CTC: 10 LPA Present, 14 Expected (Rule 19)', text: 'My current fixed salary is 10 LPA and I am expecting around 14 LPA.' },
        { label: 'Prefer Not To Disclose (Rule 20)', text: 'I would prefer not to disclose my current salary right now, but I am expecting around 13 to 14 LPA.' },
        { label: 'CTC: 8 LPA Present, 11 Expected', text: 'Current is 8 LPA fixed, expecting 10 to 12 LPA based on incentives.' },
      ];
    } else if (turns === 4) {
      return [
        { label: 'Gurgaon, 15 Days Notice (Rule 21)', text: 'I stay in Sector 54 Gurgaon, and my notice period is 15 days.' },
        { label: '30 Days / Buyout Negotiable (Rule 21)', text: 'My notice period is 30 days, but I can negotiate an early buyout with my current employer.' },
        { label: 'Immediate Joiner, DLF Phase 2', text: 'I stay in DLF Phase 2 Gurugram, ready to join immediately as I have served my notice.' },
      ];
    } else {
      return [
        { label: 'Confirm Tomorrow 02:30 PM (Rule 22)', text: 'Tomorrow at 2:30 PM works great for me at your Sector 67 office.' },
        { label: 'Confirm Tomorrow 04:30 PM (Rule 22)', text: 'Tomorrow at 4:30 PM fits my schedule best.' },
        { label: 'Reschedule: Friday 12:00 PM (Rule 23)', text: 'Can we reschedule to Friday at 12:00 PM instead?' },
        { label: 'Cancel Interview (Rule 24)', text: 'I would like to cancel the interview completely.' },
      ];
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-[#0b1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[92vh] max-h-[850px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Call Header */}
        <div className="bg-[#0e172a] border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-amber-500/20 border border-amber-400/40">
                {candidate.name.substring(0, 2).toUpperCase()}
              </div>
              {callStatus === 'connected' && (
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0e172a]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  {candidate.name}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {scenario === 'screening' ? 'Screening Call' : scenario === 'reminder' ? 'Reconfirmation Call' : scenario === 'missed_followup' ? 'Missed Follow-up' : 'Callback Follow-up'}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{candidate.appliedRole}</span>
                <span>•</span>
                <span className="font-mono text-slate-300">{candidate.phone}</span>
              </p>
            </div>
          </div>

          {/* Call Status & Timer Badge */}
          <div className="flex items-center gap-3">
            {callStatus === 'ringing' ? (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3.5 py-1.5 rounded-lg text-xs font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Ringing Candidate...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-lg text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono">{formatTime(callDuration)}</span>
              </div>
            )}

            <button
              onClick={handleEndCall}
              className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-xl transition shadow-md shadow-rose-600/20"
              title="Hang up call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Call Simulator Bar: Rings & Audio Waves */}
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-5 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Virtual HR:</span>
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                Pooja (Gurgaon HR)
              </span>
            </div>

            {/* Indian Accent Indicator & Voice Test */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300">
              <span>🇮🇳</span>
              <span className="font-semibold text-amber-200">Indian Accent:</span>
              <span className="text-slate-300 font-mono text-[10px] truncate max-w-[130px]">
                {activeVoiceInfo?.name?.replace(/(Google|Microsoft)\s*/i, '') || 'en-IN / hi-IN'}
              </span>
              <button
                type="button"
                onClick={handleTestIndianVoice}
                disabled={isVoiceTesting || isAgentSpeaking}
                className="ml-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 text-[10px] font-semibold transition border border-amber-500/30 disabled:opacity-40 cursor-pointer"
                title="Hear sample speech in Pooja's Indian accent"
              >
                {isVoiceTesting ? '🔊 Playing...' : '🔊 Preview'}
              </button>
            </div>

            {/* Speaking Waveform / Mic Live Animation */}
            {isAgentSpeaking ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-amber-500/15 px-2.5 py-1 rounded-md border border-amber-500/30 text-[11px] text-amber-300">
                  <span className="w-1 h-3 bg-amber-400 animate-bounce" />
                  <span className="w-1 h-4 bg-amber-400 animate-bounce delay-75" />
                  <span className="w-1 h-2 bg-amber-400 animate-bounce delay-150" />
                  <span className="w-1 h-3.5 bg-amber-400 animate-bounce delay-100" />
                  <span className="font-semibold">Pooja Speaking...</span>
                </div>
                <button
                  type="button"
                  onClick={handleInterruptAgent}
                  className="px-2.5 py-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer animate-pulse"
                  title="Rule 6: Immediately stop Pooja speaking when candidate speaks or interrupts"
                >
                  <span>⚡ Interrupt Pooja (Rule 6)</span>
                </button>
              </div>
            ) : isListening ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-emerald-500/15 px-2.5 py-1 rounded-md border border-emerald-500/30 text-[11px] text-emerald-300 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-0.5" />
                  <span className="font-semibold">Candidate Mic Live (Speak naturally)...</span>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateSilence}
                  disabled={isProcessing}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-[10px] font-semibold border border-slate-700 transition cursor-pointer"
                  title="Rule 5: Test candidate silence handling ('Take your time.')"
                >
                  <span>⏳ Test Silence (Rule 5)</span>
                </button>
              </div>
            ) : isProcessing ? (
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700 text-slate-300 text-[11px]">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                <span>Pooja analyzing response...</span>
              </div>
            ) : (
              callStatus === 'connected' && (
                <button
                  type="button"
                  onClick={handleSimulateSilence}
                  disabled={isProcessing}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-amber-300 text-[10px] font-medium border border-slate-700/80 transition cursor-pointer"
                  title="Rule 5: Test candidate silence handling ('Take your time.')"
                >
                  <span>⏳ Test Silence (Rule 5)</span>
                </button>
              )
            )}
          </div>

          {/* Quick Simulation Trigger: Unanswered */}
          {callStatus === 'ringing' && (
            <button
              onClick={handleSimulateUnanswered}
              className="text-slate-400 hover:text-amber-300 underline text-[11px] transition"
            >
              Simulate: "Candidate Didn't Answer"
            </button>
          )}

          {/* Audio & Real-Time Conversation Controls */}
          <div className="flex items-center gap-2">
            {/* Real-Time Calling Latency Badge & Speed Profile */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-950/50 border border-cyan-500/30 text-[11px] text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span className="font-semibold text-cyan-200">Latency:</span>
              <span className="font-mono font-bold text-white">
                {liveLatencyMs !== null ? `${liveLatencyMs}ms` : '<300ms'}
              </span>
              <div className="h-3 w-px bg-cyan-500/30 mx-0.5" />
              <span className="text-[10px] text-cyan-300/80 font-medium">Speed:</span>
              {(['ultra', 'fast', 'normal'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLatencyMode(mode)}
                  className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold transition cursor-pointer ${
                    latencyMode === mode
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-cyan-200'
                  }`}
                  title={
                    mode === 'ultra'
                      ? 'Ultra-Fast (~220ms pause, instant speech start)'
                      : mode === 'fast'
                      ? 'Fast (~320ms pause, sub-second latency)'
                      : 'Balanced (~500ms pause)'
                  }
                >
                  {mode === 'ultra' ? '⚡Ultra' : mode}
                </button>
              ))}
            </div>

            {/* Live Conversation Mode Toggle (Hands-free phone call) */}
            <button
              type="button"
              onClick={() => {
                const next = !liveHandsFree;
                setLiveHandsFree(next);
                liveHandsFreeRef.current = next;
                if (!next && isListening && recognitionRef.current) {
                  try { recognitionRef.current.stop(); } catch {}
                  setIsListening(false);
                } else if (next && callStatus === 'connected' && !isAgentSpeaking) {
                  startListening();
                }
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                liveHandsFree
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
              title="Real-time conversational mode: mic automatically opens when Pooja finishes speaking"
            >
              <Mic className={`w-3.5 h-3.5 ${liveHandsFree ? 'text-emerald-400' : ''}`} />
              <span>Real-Time Talk: {liveHandsFree ? 'ON' : 'Manual'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !voiceSpeechEnabled;
                setVoiceSpeechEnabled(next);
                if (!next) voiceAudio.stopSpeaking();
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                voiceSpeechEnabled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-500'
              }`}
              title="Toggle AI voice out loud"
            >
              {voiceSpeechEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>Voice {voiceSpeechEnabled ? 'On' : 'Muted'}</span>
            </button>

            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/60 rounded-md p-0.5">
              {(['Auto', 'English', 'Hindi'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguageMode(lang)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    languageMode === lang ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Body: 2 Columns (Transcript Stream + Live Extracted Data Tracker) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3">
          {/* Left / Center (2 cols): Live Transcript */}
          <div className="lg:col-span-2 flex flex-col h-full border-r border-slate-800 bg-[#090f1d]">
            {/* Scrollable chat/call stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {transcript.map((msg) => {
                const isAgent = msg.sender === 'agent';
                const isSystem = msg.sender === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="text-center my-2">
                      <span className="px-3 py-1 rounded-full text-[11px] bg-slate-800/80 text-slate-400 border border-slate-700">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isAgent ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAgent && (
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-md ${
                        isAgent
                          ? 'bg-slate-900 border border-amber-500/20 text-slate-100 rounded-tl-xs'
                          : 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-medium rounded-tr-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1 opacity-75">
                        <span className="font-bold">
                          {isAgent ? 'Pooja (Virtual HR)' : candidate.name}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className="whitespace-pre-line">{msg.text}</div>
                    </div>
                    {!isAgent && (
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-amber-400 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={transcriptEndRef} />
            </div>

            {/* Live Microphone Active Banner */}
            {isListening && (
              <div className="bg-emerald-950/80 border-t border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2 truncate mr-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span className="font-semibold text-white shrink-0">Candidate Mic Live:</span>
                  <span className="text-emerald-200 truncate">
                    {inputMessage ? `Hearing: "${inputMessage}"` : 'Speak naturally in English/Hindi/Hinglish — Pooja is listening...'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {inputMessage && (
                    <button
                      type="button"
                      onClick={() => handleSendMessage(inputMessage)}
                      className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] transition cursor-pointer flex items-center gap-1 shadow-xs"
                      title="Send immediately without waiting for speech pause"
                    >
                      <span>⚡ Send Now</span>
                    </button>
                  )}
                  <span className="text-[10px] font-mono bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300">
                    Auto-sends on {latencyMode === 'ultra' ? '220ms' : latencyMode === 'fast' ? '320ms' : '500ms'} pause
                  </span>
                </div>
              </div>
            )}

            {/* Quick response test chips */}
            <div className="p-3 bg-slate-900/90 border-t border-slate-800/80">
              <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Quick Candidate Utterances (Test Scenarios):</span>
                <span className="text-amber-400 font-normal">Click to speak as candidate</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {getQuickResponseChips().map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip.text)}
                    disabled={isProcessing}
                    className="whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-amber-500/50 transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Spoken/Text Input Bar */}
            <div className="p-3 bg-[#0c1424] border-t border-slate-800 flex items-center gap-2">
              <button
                id="btn-voice-mic"
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-xl border transition flex items-center justify-center shrink-0 ${
                  isListening
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse ring-4 ring-rose-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={isListening ? 'Stop listening' : 'Speak using microphone'}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex-1 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={isListening ? 'Listening to your speech...' : 'Type or speak candidate response in English, Hindi, or Hinglish...'}
                  disabled={isProcessing}
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isProcessing}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column (1 col): Live Extracted Screening Data Tracker & Rule Inspector */}
          <div className="p-4 bg-[#0d1527] overflow-y-auto flex flex-col justify-between space-y-4">
            <div>
              {/* Tab Selector: 7 Points, Rule 28 Memory, Rule 37 Action Record */}
              <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 mb-3">
                <button
                  type="button"
                  onClick={() => setRightPanelTab('checklist')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    rightPanelTab === 'checklist'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>7 Points</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('memory')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    rightPanelTab === 'memory'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  <span>Rule 28 Memory</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('action')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    rightPanelTab === 'action'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Rule 37 Action</span>
                </button>
              </div>

              {/* TAB 1: 7 Mandated Points & Target Role */}
              {rightPanelTab === 'checklist' && (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Live Voice Extraction</span>
                    </h4>
                    <span className="text-[10px] text-slate-400">7 Mandated Points</span>
                  </div>

                  {/* Real-Time Priority Remark Live Card */}
                  {(() => {
                    const roleKey = (candidate.appliedRole || '').toLowerCase().includes('manager')
                      ? 'sales_manager'
                      : (candidate.appliedRole || '').toLowerCase().includes('business') || (candidate.appliedRole || '').toLowerCase().includes('bdm')
                      ? 'bdm'
                      : 'property_consultant';
                    const currentJd = WHITE_COLLAR_JOB_DESCRIPTIONS[roleKey];

                    return (
                      <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-slate-700/70 shadow-xs space-y-2.5">
                        {/* Role & Budget Band Header */}
                        <div className="pb-2 border-b border-slate-800 flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-amber-400/90 tracking-wider">Target Role & Budget (Rule 15)</div>
                            <div className="text-xs font-bold text-white leading-tight mt-0.5">{currentJd?.title || candidate.appliedRole}</div>
                            <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                              Fixed: {currentJd?.budgetBand || '₹8–15 LPA'} • <span className="text-slate-400 font-normal">{currentJd?.oteBand || 'Incentives'}</span>
                            </div>
                          </div>
                          {hrDecisionOutcome ? (
                            <span className={`shrink-0 px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                              hrDecisionOutcome === 'INTERVIEW_SCHEDULED' || hrDecisionOutcome === 'INTERVIEW_ELIGIBLE'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : hrDecisionOutcome === 'CALL_BACK_REQUESTED' || hrDecisionOutcome === 'FOLLOW_UP_REQUIRED'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : hrDecisionOutcome === 'NOT_INTERESTED' || hrDecisionOutcome === 'REJECTED'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}>
                              {hrDecisionOutcome.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-800 rounded-full border border-slate-700">
                              Screening
                            </span>
                          )}
                        </div>

                        {/* Missing Information Alert if any */}
                        {conversationMemory.missing_information && conversationMemory.missing_information.length > 0 && (
                          <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px]">
                            <span className="font-semibold text-amber-300">Pending screening points: </span>
                            <span className="text-amber-200">{conversationMemory.missing_information.join(', ')}</span>
                          </div>
                        )}

                        {/* Auto CRM Remark & Priority */}
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                              <span>Auto CRM Remark & Priority</span>
                            </div>
                            {latestGeneratedRemark?.priority ? (
                              <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide rounded-full border ${
                                latestGeneratedRemark.priority === 'Urgent'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : latestGeneratedRemark.priority === 'High'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : latestGeneratedRemark.priority === 'Medium'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : 'bg-slate-700/40 text-slate-300 border-slate-600'
                              }`}>
                                {latestGeneratedRemark.priority} Priority
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Auto-evaluating</span>
                            )}
                          </div>

                          <div className="text-[11px] text-amber-300 font-medium truncate mb-1">
                            {latestGeneratedRemark?.category || 'Analyzing conversation intent...'}
                          </div>

                          <p className="text-xs text-slate-300 line-clamp-3 bg-slate-950/70 p-2 rounded-lg border border-slate-800 leading-snug">
                            {latestGeneratedRemark?.text || 'AI is actively evaluating candidate responses to assign action priority and CRM remarks.'}
                          </p>

                          {latestGeneratedRemark?.actionDueDate && (
                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                              <span>Action Due:</span>
                              <span className="font-semibold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                {latestGeneratedRemark.actionDueDate}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 7 Data Points Real-time Checklist */}
                  <div className="mt-3 space-y-2.5 text-xs">
                    {/* 1. Company & Designation */}
                    <div className={`p-2.5 rounded-lg border transition ${
                      extracted.currentCompany || extracted.currentDesignation
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">1. Current Company & Role</span>
                        {extracted.currentCompany ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-slate-500">Listening...</span>
                        )}
                      </div>
                      <div className="font-semibold text-white text-xs mt-0.5">
                        {extracted.currentCompany || extracted.currentDesignation
                          ? `${extracted.currentCompany || ''} - ${extracted.currentDesignation || ''}`
                          : 'Not extracted yet'}
                      </div>
                    </div>

                    {/* 2. Total & Real Estate Exp */}
                    <div className={`p-2.5 rounded-lg border transition ${
                      extracted.totalExperienceYears || extracted.realEstateExperienceYears
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">2. Total & RE Experience</span>
                        {extracted.realEstateExperienceYears ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-slate-500">Listening...</span>
                        )}
                      </div>
                      <div className="font-semibold text-white text-xs mt-0.5">
                        {extracted.realEstateExperienceYears
                          ? `${extracted.realEstateExperienceYears} Yrs Real Estate (${extracted.totalExperienceYears || extracted.realEstateExperienceYears} Yrs Total)`
                          : 'Not extracted yet'}
                      </div>
                    </div>

                    {/* 3. Gurgaon & Dubai Property Sales */}
                    <div className={`p-2.5 rounded-lg border transition ${
                      extracted.gurgaonDubaiExperience?.gurgaon || extracted.gurgaonDubaiExperience?.dubai
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">3. Gurgaon / Dubai Exp</span>
                        {extracted.gurgaonDubaiExperience?.gurgaon || extracted.gurgaonDubaiExperience?.dubai ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-slate-500">Listening...</span>
                        )}
                      </div>
                      <div className="font-semibold text-white text-xs mt-0.5">
                        {extracted.gurgaonDubaiExperience?.details || 
                          (extracted.gurgaonDubaiExperience?.gurgaon ? 'Gurgaon Luxury Verified' : 'Not recorded yet')}
                      </div>
                    </div>

                    {/* 4. Present & Expected CTC */}
                    <div className={`p-2.5 rounded-lg border transition ${
                      extracted.currentSalaryLPA || extracted.expectedSalaryLPA || conversationMemory.salary_not_disclosed
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">4. Present & Expected CTC</span>
                        {extracted.expectedSalaryLPA || conversationMemory.salary_not_disclosed ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-slate-500">Listening...</span>
                        )}
                      </div>
                      <div className="font-semibold text-emerald-400 text-xs mt-0.5">
                        {conversationMemory.salary_not_disclosed
                          ? `Undisclosed (Expected: ${extracted.expectedSalaryLPA || 'Under negotiation'})`
                          : extracted.expectedSalaryLPA
                          ? `Expected: ${extracted.expectedSalaryLPA}`
                          : 'Not extracted yet'}
                      </div>
                    </div>

                    {/* 5. Location */}
                    <div className={`p-2.5 rounded-lg border transition ${
                      extracted.currentLocation ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-900/60 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">5. Current Location</span>
                        {extracted.currentLocation ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-slate-500">Listening...</span>
                        )}
                      </div>
                      <div className="font-semibold text-white text-xs mt-0.5">
                        {extracted.currentLocation || 'Not extracted yet'}
                      </div>
                    </div>

                    {/* 6. Notice Period */}
                    <div className={`p-2.5 rounded-lg border transition ${
                      extracted.noticePeriodDays !== undefined ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-900/60 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">6. Notice Period / Joining</span>
                        {extracted.noticePeriodDays !== undefined ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="text-[10px] text-slate-500">Listening...</span>
                        )}
                      </div>
                      <div className="font-semibold text-white text-xs mt-0.5">
                        {extracted.noticePeriodDays !== undefined
                          ? `${extracted.noticePeriodDays} Days Notice`
                          : 'Not extracted yet'}
                      </div>
                    </div>

                    {/* 7. F2F Interview Slot & Venue */}
                    <div className={`p-2.5 rounded-lg border transition ${
                      bookedSlotId || extracted.preferredInterviewSlot
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">7. F2F Interview Slot</span>
                        {bookedSlotId ? (
                          <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <span className="text-[10px] text-slate-500">Negotiating...</span>
                        )}
                      </div>
                      <div className="font-semibold text-amber-400 text-xs mt-0.5">
                        {bookedSlotId
                          ? availableSlots.find((s) => s.id === bookedSlotId)?.displayLabel || extracted.preferredInterviewSlot
                          : extracted.preferredInterviewSlot || 'Slot not finalized'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        White Collar HQ (TOWER-A, M3M Urbana, Sector 67, Gurugram)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Rule 28 Live Conversation Memory Inspector */}
              {rightPanelTab === 'memory' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5" />
                        <span>Rule 28 Memory State</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Live conversational variables tracked to prevent question repetition
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[10px] uppercase">
                      {conversationMemory.conversation_status || 'ongoing'}
                    </span>
                  </div>

                  <div className="space-y-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">candidate_name</span>
                        <span className="font-semibold text-white">{conversationMemory.candidate_name || candidate.name}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">target_role</span>
                        <span className="font-semibold text-amber-300">{conversationMemory.target_role || candidate.appliedRole}</span>
                      </div>

                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">current_company</span>
                        <span className="font-semibold text-white">{conversationMemory.current_company || '—'}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">designation</span>
                        <span className="font-semibold text-white">{conversationMemory.designation || '—'}</span>
                      </div>

                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">total_experience</span>
                        <span className="font-semibold text-white">{conversationMemory.total_experience || '—'}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">real_estate_exp</span>
                        <span className="font-semibold text-emerald-400">{conversationMemory.real_estate_experience || '—'}</span>
                      </div>

                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">gurgaon_experience</span>
                        <span className={`font-semibold ${conversationMemory.gurgaon_experience ? 'text-emerald-300' : 'text-slate-400'}`}>
                          {conversationMemory.gurgaon_experience ? '✓ Yes' : 'No'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">dubai_experience</span>
                        <span className={`font-semibold ${conversationMemory.dubai_experience ? 'text-emerald-300' : 'text-slate-400'}`}>
                          {conversationMemory.dubai_experience ? '✓ Yes' : 'No'}
                        </span>
                      </div>

                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">current_salary</span>
                        <span className="font-semibold text-white">{conversationMemory.current_salary || '—'}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">expected_salary</span>
                        <span className="font-semibold text-emerald-300">{conversationMemory.expected_salary || '—'}</span>
                      </div>

                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">salary_not_disclosed (R20)</span>
                        <span className={`font-semibold ${conversationMemory.salary_not_disclosed ? 'text-amber-400' : 'text-slate-400'}`}>
                          {conversationMemory.salary_not_disclosed ? '⚠️ True (Hesitant)' : 'False'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">current_location</span>
                        <span className="font-semibold text-white">{conversationMemory.current_location || '—'}</span>
                      </div>

                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">notice_period</span>
                        <span className="font-semibold text-white">{conversationMemory.notice_period || '—'}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">earliest_joining</span>
                        <span className="font-semibold text-white">{conversationMemory.earliest_joining_date || '—'}</span>
                      </div>

                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">interested</span>
                        <span className="font-semibold text-white">
                          {conversationMemory.interested === true ? '✓ Interested' : conversationMemory.interested === false ? '✗ Declined' : 'Evaluating'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 text-[10px] block">interview_slot</span>
                        <span className="font-semibold text-amber-300">
                          {conversationMemory.interview_date ? `${conversationMemory.interview_date} ${conversationMemory.interview_time || ''}` : (bookedSlotId ? 'Booked' : '—')}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 mt-2">
                      <span className="text-slate-400 text-[10px] block">next_action</span>
                      <span className="font-bold text-amber-400">{conversationMemory.next_action || 'Conduct screening'}</span>
                    </div>

                    {conversationMemory.missing_information && conversationMemory.missing_information.length > 0 && (
                      <div className="p-2 rounded bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-300">
                        <span className="font-semibold">Missing information array: </span>
                        {conversationMemory.missing_information.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Rule 37 After-Call Action Record Inspector */}
              {rightPanelTab === 'action' && (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Rule 37 Action Record</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Mandated structured record created for CRM updates
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                      {afterCallAction?.screening_status || hrDecisionOutcome || 'IN_PROGRESS'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2.5 text-[11px]">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Target Role:</span>
                      <span className="font-bold text-white">{afterCallAction?.target_role || candidate.appliedRole}</span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Interview Status:</span>
                      <span className="font-semibold text-amber-300">
                        {afterCallAction?.interview_status || (bookedSlotId ? 'SCHEDULED' : 'PENDING')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-slate-400">Date & Time:</span>
                      <span className="font-semibold text-emerald-400">
                        {afterCallAction?.interview_date_time || (bookedSlotId ? availableSlots.find(s => s.id === bookedSlotId)?.displayLabel : 'Not scheduled')}
                      </span>
                    </div>

                    <div className="pb-2 border-b border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Interview Location:</span>
                      <span className="text-white text-[10px] leading-tight block">
                        {afterCallAction?.interview_location || '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram'}
                      </span>
                    </div>

                    <div className="pb-2 border-b border-slate-800">
                      <span className="text-slate-400 block mb-0.5">HR Remarks:</span>
                      <p className="text-slate-200 text-[11px] bg-slate-950/80 p-2 rounded border border-slate-800 leading-relaxed">
                        {afterCallAction?.hr_remarks || latestGeneratedRemark?.text || 'Screening evaluated according to White Collar Realty 38 operational rules.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Next Action:</span>
                      <span className="font-bold text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/30 text-[11px]">
                        {afterCallAction?.next_action || 'Proceed with recruitment workflow'}
                      </span>
                    </div>

                    {/* Candidate Answers Dictionary */}
                    <div className="mt-2 pt-2 border-t border-slate-800">
                      <span className="text-slate-400 block mb-1 font-semibold text-[10px] uppercase">Candidate Answers:</span>
                      <div className="space-y-1 bg-slate-950/70 p-2 rounded border border-slate-800/80 text-[10px]">
                        <div><span className="text-slate-500">Company:</span> <span className="text-white">{afterCallAction?.candidate_answers?.current_company || extracted.currentCompany || '—'}</span></div>
                        <div><span className="text-slate-500">Experience:</span> <span className="text-white">{afterCallAction?.candidate_answers?.total_experience || extracted.realEstateExperienceYears ? `${extracted.realEstateExperienceYears} yrs RE` : '—'}</span></div>
                        <div><span className="text-slate-500">CTC:</span> <span className="text-emerald-400">{afterCallAction?.candidate_answers?.expected_salary || extracted.expectedSalaryLPA || '—'}</span></div>
                        <div><span className="text-slate-500">Location:</span> <span className="text-white">{afterCallAction?.candidate_answers?.location || extracted.currentLocation || '—'}</span></div>
                        <div><span className="text-slate-500">Notice:</span> <span className="text-white">{afterCallAction?.candidate_answers?.notice_period || (extracted.noticePeriodDays ? `${extracted.noticePeriodDays} days` : '—')}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions: Complete Call */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              {bookedSlotId && onOpenConfirmationMail && (
                <button
                  type="button"
                  onClick={() => onOpenConfirmationMail(candidate)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Confirmation Interview Mail</span>
                </button>
              )}

              {onOpenWhatsApp && (
                <button
                  type="button"
                  onClick={() => onOpenWhatsApp(candidate, candidate.status === 'Missed Interview - Followup' ? 'missed_followup' : bookedSlotId ? 'interview_reminder' : 'unanswered')}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send WhatsApp Reminder</span>
                </button>
              )}

              <button
                id="btn-end-call-update"
                onClick={handleEndCall}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save Call & Update Candidate</span>
              </button>

              <button
                onClick={handleEndCall}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition flex items-center justify-center gap-1.5"
              >
                <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Hang Up Immediately</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
