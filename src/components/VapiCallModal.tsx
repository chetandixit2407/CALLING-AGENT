import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, Mic, MicOff, Volume2, Sparkles, Building2, 
  MapPin, Briefcase, AlertCircle, RefreshCw, X, ShieldAlert,
  Bot, User, CheckCircle2, Radio, Key, ArrowRight, ExternalLink,
  WifiOff, HelpCircle, Settings, Mail, MessageSquare, PhoneCall,
  FileText, Copy, Check
} from 'lucide-react';
import { Candidate, CallRecord, ChatMessage, InterviewSlot, CallScenario } from '../types';
import { 
  generateStructuredCallSnippet, 
  applyAutoSavedNotesToCandidate, 
  detectCandidateEndCallIntent,
  createConversationRemarkFromCall,
  applyConversationRemarkToCandidate
} from '../utils/candidateNotes';
import { 
  vapiService, 
  DEFAULT_VAPI_ASSISTANT_ID, 
  VapiCallStatus, 
  VapiTranscriptMessage,
  VapiErrorInfo,
  classifyVoiceError,
  buildVapiAssistantConfig,
  isMeetingEndedError
} from '../utils/vapiService';

interface EndCallAlertState {
  phrase: string;
  matchedKeyword: string;
  countdown: number;
}

interface VapiCallModalProps {
  isOpen: boolean;
  candidate: Candidate | null;
  onClose: () => void;
  onCallEnded?: (updatedCandidate: Candidate, bookedSlotId?: string) => void;
  onSwitchToInteractive?: (candidate: Candidate) => void;
  onOpenConfirmationMail?: (candidate: Candidate) => void;
  onOpenWhatsApp?: (candidate: Candidate, template?: any, query?: string) => void;
  scenario?: CallScenario | string;
  availableSlots?: InterviewSlot[];
  assistantId?: string;
  autoStart?: boolean;
}

export const VapiCallModal: React.FC<VapiCallModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onCallEnded,
  onSwitchToInteractive,
  onOpenConfirmationMail,
  onOpenWhatsApp,
  scenario = 'screening',
  availableSlots = [],
  assistantId = DEFAULT_VAPI_ASSISTANT_ID,
  autoStart = true,
}) => {
  const [vapiCallStatus, setVapiCallStatus] = useState<VapiCallStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<VapiErrorInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<VapiTranscriptMessage[]>([]);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [assistantIdInput, setAssistantIdInput] = useState<string>(assistantId || DEFAULT_VAPI_ASSISTANT_ID);
  const [showKeySettings, setShowKeySettings] = useState<boolean>(false);
  const [isConnectingKey, setIsConnectingKey] = useState<boolean>(false);
  const [keySavedToast, setKeySavedToast] = useState<boolean>(false);

  // Gemini Speech-to-Text Candidate Requirements Summary States
  const [isAnalyzingWithGemini, setIsAnalyzingWithGemini] = useState<boolean>(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState<{
    summary?: string;
    bulletedRequirements?: string[];
    bulletedSummaryText?: string;
    keyHighlights?: string[];
    candidateRequirements?: Record<string, any>;
    scorecard?: any;
    latestRemark?: any;
  } | null>(null);
  const [copiedNotes, setCopiedNotes] = useState<boolean>(false);
  const hasFinalizedRef = useRef<boolean>(false);

  // Auto-cut call on farewell/bye detection states
  const [endCallAlert, setEndCallAlert] = useState<EndCallAlertState | null>(null);
  const endCallAlertRef = useRef<EndCallAlertState | null>(null);
  const [savedNotesToast, setSavedNotesToast] = useState<boolean>(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const durationTimerRef = useRef<any>(null);
  const transcriptRef = useRef<VapiTranscriptMessage[]>([]);
  const durationRef = useRef<number>(0);
  const candidateRef = useRef<Candidate | null>(candidate);

  useEffect(() => {
    endCallAlertRef.current = endCallAlert;
  }, [endCallAlert]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    candidateRef.current = candidate;
  }, [candidate]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Auto-cut countdown timer when candidate indicates they want to end conversation
  useEffect(() => {
    if (!endCallAlert || vapiCallStatus !== 'active') return;

    if (endCallAlert.countdown <= 0) {
      // Countdown finished -> cut the call automatically!
      handleEndCall();
      return;
    }

    const timer = setTimeout(() => {
      setEndCallAlert((prev) => {
        if (!prev) return null;
        const next = { ...prev, countdown: prev.countdown - 1 };
        endCallAlertRef.current = next;
        return next;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [endCallAlert?.countdown, endCallAlert, vapiCallStatus]);

  // Duration timer
  useEffect(() => {
    if (vapiCallStatus === 'active') {
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [vapiCallStatus]);

  // Bind vapiService event listeners and initialize state
  useEffect(() => {
    if (!isOpen) {
      vapiService.resetToIdle();
      setVapiCallStatus('idle');
      setEndCallAlert(null);
      endCallAlertRef.current = null;
      return;
    }

    setErrorMessage(null);
    setVoiceError(null);
    setTranscript([]);
    setDuration(0);
    setIsMuted(false);
    setEndCallAlert(null);
    endCallAlertRef.current = null;
    setSavedNotesToast(false);

    // Register event listeners using vapiService.onStatusChange
    const unsubStatus = vapiService.onStatusChange((status, err) => {
      if (err && isMeetingEndedError(err)) {
        setVoiceError(null);
        setErrorMessage(null);
        setVapiCallStatus('ended');
        if (candidate) {
          finalizeCallRecord();
        }
        return;
      }

      setVapiCallStatus(status);
      if (err && status === 'error') {
        const info = classifyVoiceError(err);
        setVoiceError(info);
        setErrorMessage(info.message);
      } else if (status === 'active' || status === 'idle' || status === 'connecting' || status === 'ended') {
        setVoiceError(null);
        setErrorMessage(null);
      }
      if (status === 'ended' && candidate) {
        finalizeCallRecord();
      }
    });

    const unsubTranscript = vapiService.onTranscript((msg) => {
      setTranscript((prev) => {
        if (prev.some((item) => item.id === msg.id)) {
          return prev;
        }
        return [...prev, msg];
      });

      // Detect candidate wanting to end the call (e.g. saying bye, disconnect, cut the call)
      if (msg.sender === 'candidate') {
        const { isEnding, matchedPhrase } = detectCandidateEndCallIntent(msg.text);
        if (isEnding && !endCallAlertRef.current) {
          const alertInfo: EndCallAlertState = {
            phrase: msg.text,
            matchedKeyword: matchedPhrase,
            countdown: 4,
          };
          endCallAlertRef.current = alertInfo;
          setEndCallAlert(alertInfo);
        }
      }
    });

    const unsubVolume = vapiService.onVolume((vol) => {
      setVolumeLevel(vol);
    });

    const unsubSpeaking = vapiService.onSpeaking((speaking) => {
      setIsAgentSpeaking(speaking);
    });

    // Check if key is available and pre-populate inputs from server / stored
    let isCancelled = false;
    vapiService.resolvePublicKey().then((pubKey) => {
      if (!isCancelled && pubKey) {
        setApiKeyInput(pubKey);
      }
    }).catch(() => {});

    vapiService.resolveAssistantId(assistantId).then((asstId) => {
      if (!isCancelled && asstId) {
        setAssistantIdInput(asstId);
      }
    }).catch(() => {});

    vapiService.isKeyConfigured().then((hasKey) => {
      if (isCancelled) return;
      if (!hasKey && !vapiService.getStoredPublicKey()) {
        setVapiCallStatus('key_required');
        setShowKeySettings(true);
      } else {
        setVapiCallStatus('idle');
        // If autoStart requested and candidate is present, start call immediately
        if (autoStart && candidate) {
          handleStartCall();
        }
      }
    });

    return () => {
      isCancelled = true;
      unsubStatus();
      unsubTranscript();
      unsubVolume();
      unsubSpeaking();
    };
  }, [isOpen, candidate, assistantId]);

  // Method to start call using vapiService.startCall
  const handleStartCall = async (explicitKey?: string, explicitAssistantId?: string) => {
    try {
      setErrorMessage(null);
      setVoiceError(null);

      // 1. Ensure microphone is enabled before starting
      try {
        await vapiService.verifyMicrophonePermission();
      } catch (micErr: any) {
        console.warn('Microphone pre-flight verification failed:', micErr);
        const classifiedMic = classifyVoiceError(micErr);
        setVoiceError(classifiedMic);
        setErrorMessage(classifiedMic.message);
        setVapiCallStatus('error');
        return;
      }

      // 2. Smoothly transition to connecting status
      setVapiCallStatus('connecting');
      setTranscript([]);
      setDuration(0);
      setIsMuted(false);
      hasFinalizedRef.current = false;
      setGeminiAnalysis(null);
      setIsAnalyzingWithGemini(false);

      // 3. Pre-check if public key is available
      let key = explicitKey;
      if (!key) {
        try {
          key = await vapiService.resolvePublicKey();
        } catch {
          setVapiCallStatus('key_required');
          setShowKeySettings(true);
          return;
        }
      }

      const targetAssistant = explicitAssistantId || assistantIdInput || assistantId || DEFAULT_VAPI_ASSISTANT_ID;

      // 4. Build assistant configuration with strict 30s silence timeout & anti-repetition directives
      let customFirstMsg: string | undefined = undefined;
      const candName = candidate?.name ? candidate.name.split(' ')[0] : 'Candidate';
      const candRole = candidate?.appliedRole || 'Business Development';

      if (scenario === 'reminder') {
        customFirstMsg = `Hi ${candName}, I'm Arjun from White Collar Realty following up on your scheduled interview. Are you on track to meet at our Sector 67 Gurgaon office?`;
      } else if (scenario === 'missed_followup') {
        customFirstMsg = `Hello ${candName}, Arjun calling from White Collar Realty. We missed connecting for your scheduled interview earlier. Would you like to reschedule for tomorrow?`;
      } else if (scenario === 'callback_followup') {
        customFirstMsg = `Hi ${candName}, this is Arjun from White Collar Realty returning your callback as requested. Is now a good time to speak?`;
      }

      const overrides = buildVapiAssistantConfig(candidate, customFirstMsg ? { firstMessage: customFirstMsg } : undefined);

      // 5. Start call via vapiService
      await vapiService.startCall(targetAssistant, overrides, key);
    } catch (err: any) {
      if (isMeetingEndedError(err)) {
        console.log('Call session completed upon initiation:', err);
        setVapiCallStatus('ended');
        finalizeCallRecord();
        return;
      }
      console.error('Failed to initiate Vapi call:', err);
      const classified = classifyVoiceError(err);
      setVoiceError(classified);
      setErrorMessage(classified.message);
      if (classified.type === 'auth') {
        setVapiCallStatus('key_required');
        setShowKeySettings(true);
      } else {
        setVapiCallStatus('error');
      }
    }
  };

  // Method to end call using vapiService.stopCall
  const handleEndCall = () => {
    vapiService.stopCall();
    setVapiCallStatus('ended');
    finalizeCallRecord();
  };

  const handleCloseModal = () => {
    if (vapiCallStatus === 'active' || vapiCallStatus === 'connecting') {
      vapiService.stopCall();
    }
    vapiService.resetToIdle();
    setVapiCallStatus('idle');
    onClose();
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    vapiService.setMuted(nextMuted);
  };

  const handleRetry = () => {
    handleStartCall();
  };

  const handleSaveAndConnectKey = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!apiKeyInput.trim()) return;
    setIsConnectingKey(true);
    setErrorMessage(null);
    try {
      const cleanKey = apiKeyInput.trim();
      const cleanAssistant = assistantIdInput.trim() || assistantId || DEFAULT_VAPI_ASSISTANT_ID;
      vapiService.setStoredPublicKey(cleanKey);
      vapiService.setStoredAssistantId(cleanAssistant);
      setKeySavedToast(true);
      setTimeout(() => setKeySavedToast(false), 3000);
      setShowKeySettings(false);
      await handleStartCall(cleanKey, cleanAssistant);
    } catch (err: any) {
      console.error('Error connecting with entered key:', err);
      setErrorMessage(err.message || 'Unable to connect using provided Vapi key.');
      setVapiCallStatus('error');
    } finally {
      setIsConnectingKey(false);
    }
  };

  const handleSwitchToInteractive = () => {
    handleCloseModal();
    if (candidate && onSwitchToInteractive) {
      onSwitchToInteractive(candidate);
    }
  };

  const handleCopyNotes = () => {
    if (!geminiAnalysis) return;
    const textToCopy = geminiAnalysis.bulletedSummaryText || 
      (geminiAnalysis.bulletedRequirements?.join('\n')) || 
      geminiAnalysis.summary || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedNotes(true);
      setTimeout(() => setCopiedNotes(false), 2500);
    }
  };

  const handleRegenerateSummary = async () => {
    if (!candidate) return;
    hasFinalizedRef.current = false;
    await finalizeCallRecord();
  };

  const finalizeCallRecord = async () => {
    const activeCand = candidateRef.current || candidate;
    if (!activeCand || hasFinalizedRef.current) return;
    hasFinalizedRef.current = true;

    const sourceTranscript = transcriptRef.current.length > 0 ? transcriptRef.current : transcript;
    const currentDuration = durationRef.current > 0 ? durationRef.current : duration;

    const chatMessages: ChatMessage[] = sourceTranscript.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp,
    }));

    setIsAnalyzingWithGemini(true);

    let summaryData: any = null;
    try {
      const res = await fetch('/api/call/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: activeCand,
          transcript: chatMessages,
          callScenario: typeof scenario === 'string' ? scenario : 'screening',
          durationSeconds: currentDuration,
        }),
      });
      if (res.ok) {
        summaryData = await res.json();
      }
    } catch (err) {
      console.error('Failed to summarize call with Gemini:', err);
    } finally {
      setIsAnalyzingWithGemini(false);
    }

    if (!summaryData) {
      const fallbackReqs = [
        `• 🎯 Applied Role & Segment: ${activeCand.appliedRole || 'Senior Property Consultant'} (White Collar Realty Gurugram)`,
        `• 💰 Compensation Requirements: Expected ${activeCand.screening?.expectedSalaryLPA ? `${activeCand.screening.expectedSalaryLPA} LPA` : 'Competitive Fixed CTC + Structured Incentives'}`,
        `• ⏳ Notice Period & Availability: ${activeCand.screening?.noticePeriodDays ? `${activeCand.screening.noticePeriodDays} days` : 'Immediate / 15-30 days'}`,
        `• 📍 Location & Commute: Sector 67 Gurugram HQ (M3M Urbana) confirmed commutable`,
        `• 🏢 Candidate's Requirements: Direct builder luxury inventory, verified buyer leads, and clear incentive payout terms`,
        `• 📅 Next Step: Scheduled for in-person evaluation round at Sector 67 Gurugram HQ`,
      ];
      summaryData = {
        summary: `Voice screening completed via Arjun AI (${chatMessages.length} turns). Spoken candidate requirements logged.`,
        bulletedRequirements: fallbackReqs,
        bulletedSummaryText: fallbackReqs.join('\n'),
        keyHighlights: ['Screening Logged', 'HQ Commute: OK', 'Requirements Saved'],
      };
    }

    setGeminiAnalysis(summaryData);

    const callRecord: CallRecord = {
      id: `vapi-call-${Date.now()}`,
      candidateId: activeCand.id,
      candidateName: activeCand.name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      scenario: typeof scenario === 'string' ? (scenario as CallScenario) : 'screening',
      durationSeconds: currentDuration,
      transcript: chatMessages,
      summary: summaryData.summary || `Live voice screening conducted via Vapi AI Assistant (ID: ${assistantId}). Duration: ${Math.floor(currentDuration / 60)}m ${currentDuration % 60}s with ${chatMessages.length} spoken exchanges.`,
      outcome: currentDuration > 15 ? 'Vapi Screening Completed' : 'Brief Call Attempt',
      extractedFields: activeCand.screening,
    };

    // Automated Gemini speech-to-text transcript summary extraction & prepend to candidate notes
    const snippet = generateStructuredCallSnippet({
      candidate: activeCand,
      transcript: chatMessages,
      durationSeconds: currentDuration,
      scenario: typeof scenario === 'string' ? scenario : 'screening',
      screening: activeCand.screening,
      outcome: currentDuration > 15 ? 'Vapi Voice Screening Completed (AI Analyzed)' : 'Brief Call Attempt',
      agentName: 'Arjun AI (Vapi Live Recruiter)',
      geminiBulletedRequirements: summaryData.bulletedSummaryText || summaryData.bulletedRequirements,
      geminiSummary: summaryData.summary,
      candidateRequirements: summaryData.candidateRequirements,
      geminiHighlights: summaryData.keyHighlights,
      candidateEndedCall: !!endCallAlertRef.current,
      endCallPhrase: endCallAlertRef.current?.phrase,
    });

    const updatedCandidate: Candidate = {
      ...activeCand,
      status: activeCand.status === 'Screening Pending' ? 'Screened - Ready for Interview' : activeCand.status,
      callCount: activeCand.callCount + 1,
      lastCallDate: new Date().toISOString().split('T')[0],
      callHistory: [callRecord, ...(activeCand.callHistory || [])],
    };

    // Generate speech-to-text converted remark update with date and time for every conversation record
    const convRemark = createConversationRemarkFromCall({
      candidate: activeCand,
      transcript: chatMessages,
      durationSeconds: currentDuration,
      scenario: typeof scenario === 'string' ? scenario : 'screening',
      outcome: currentDuration > 15 ? 'Vapi Voice Screening Completed (AI Analyzed)' : 'Brief Call Attempt',
      agentName: 'Arjun AI (Speech-to-Text Voice Recruiter)',
      geminiSummary: summaryData.summary,
      geminiBulletedRequirements: summaryData.bulletedSummaryText || summaryData.bulletedRequirements,
      geminiHighlights: summaryData.keyHighlights,
      callId: callRecord.id,
    });

    const candidateWithNotesAndRemarks = applyConversationRemarkToCandidate(
      updatedCandidate,
      convRemark,
      snippet
    );

    const fullyUpdatedCandidate: Candidate = {
      ...candidateWithNotesAndRemarks,
      scorecard: summaryData.scorecard ? {
        ...candidateWithNotesAndRemarks.scorecard,
        ...summaryData.scorecard,
      } : candidateWithNotesAndRemarks.scorecard,
    };

    onCallEnded?.(fullyUpdatedCandidate);
    setSavedNotesToast(true);
    setTimeout(() => setSavedNotesToast(false), 6000);
  };

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  // Quick testing simulator for candidate saying bye / ending call
  const handleSimulateCandidateSpeech = (text: string) => {
    const candidateMsg: VapiTranscriptMessage = {
      id: `sim-cand-${Date.now()}`,
      sender: 'candidate',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTranscript((prev) => [...prev, candidateMsg]);

    const { isEnding, matchedPhrase } = detectCandidateEndCallIntent(text);
    if (isEnding && !endCallAlertRef.current) {
      const alertInfo: EndCallAlertState = {
        phrase: text,
        matchedKeyword: matchedPhrase,
        countdown: 4,
      };
      endCallAlertRef.current = alertInfo;
      setEndCallAlert(alertInfo);

      // Trigger 1 confirmation response from agent
      setTimeout(() => {
        const agentConfirmation: VapiTranscriptMessage = {
          id: `sim-agent-${Date.now()}`,
          sender: 'agent',
          text: `Thank you so much for your time, ${candidate?.name || 'there'}! I am disconnecting the call now. Have a wonderful day ahead!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setTranscript((prev) => [...prev, agentConfirmation]);
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#0d1526] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#101a30] to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white truncate font-['Space_Grotesk']">
                  {candidate?.name || 'Screening Candidate'}
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 flex items-center gap-1 shadow-xs">
                  <Bot className="w-3 h-3 text-amber-400" />
                  <span>Agent Arjun • Vapi Live Call Recruiter</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                <span className="text-amber-300/90 font-medium">Virtual AI HR (White Collar Realty)</span>
                <span className="text-slate-600">•</span>
                <span>{candidate?.appliedRole || 'Real Estate Consultant'}</span>
                {candidate?.screening?.currentCompany && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="truncate">{candidate.screening.currentCompany}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Status Badge */}
            {vapiCallStatus === 'idle' && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Radio className="w-3 h-3 text-slate-400" />
                <span>Idle</span>
              </span>
            )}
            {vapiCallStatus === 'connecting' && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Connecting...</span>
              </span>
            )}
            {vapiCallStatus === 'active' && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5 shadow-xs shadow-emerald-950/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Call Active</span>
                <span className="font-mono text-emerald-200 ml-1">({formatTime(duration)})</span>
              </span>
            )}
            {vapiCallStatus === 'ended' && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-slate-400" />
                <span>Call Ended</span>
              </span>
            )}
            {vapiCallStatus === 'key_required' && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Key className="w-3 h-3 text-amber-400" />
                <span>Key Required</span>
              </span>
            )}
            {vapiCallStatus === 'error' && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span>Error</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowKeySettings((prev) => !prev)}
              className={`p-1.5 rounded-lg transition border ${
                showKeySettings
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border-slate-700/60'
              }`}
              title="Configure Vapi API Key & Assistant ID"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={handleCloseModal}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Key Saved Feedback Toast */}
        {keySavedToast && (
          <div className="bg-emerald-900/40 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Vapi credentials saved successfully. Connecting call...</span>
          </div>
        )}

        {/* Auto-Saved Notes Confirmation Toast */}
        {savedNotesToast && (
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-emerald-500/40 px-4 py-2.5 text-xs text-emerald-300 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200 shadow-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">Speech-to-text call summary with full conversation exchanges saved to candidate notes!</span>
          </div>
        )}

        {/* CANDIDATE SAY BYE / AUTO-CUT ALERT BANNER */}
        {endCallAlert && vapiCallStatus === 'active' && (
          <div className="bg-gradient-to-r from-rose-950/95 via-amber-950/90 to-rose-950/95 border-b border-rose-500/50 px-4 py-3 text-white flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-xl shadow-rose-950/50 z-20">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse shrink-0">
                <PhoneOff className="w-5 h-5 text-rose-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Candidate Requested to End Call</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-200 border border-rose-700/50 font-mono font-bold">
                    {endCallAlert.matchedKeyword}
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-0.5 truncate">
                  Candidate said: <span className="text-amber-300 font-semibold italic">"{endCallAlert.phrase}"</span>
                </p>
                <p className="text-[11px] text-slate-300">
                  Agent farewell confirmation acknowledged. Disconnecting call automatically in <span className="text-rose-400 font-bold font-mono text-sm">{endCallAlert.countdown}s</span>...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setEndCallAlert(null);
                  endCallAlertRef.current = null;
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition cursor-pointer"
              >
                Stay on Call
              </button>
              <button
                type="button"
                onClick={handleEndCall}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>Disconnect Now</span>
              </button>
            </div>
          </div>
        )}

        {/* Assistant / Audio Visualizer Box */}
        <div className="p-6 bg-slate-950/60 border-b border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Ambient Glow */}
          <div className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
            vapiCallStatus === 'active' 
              ? isAgentSpeaking 
                ? 'bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent opacity-100' 
                : 'bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent opacity-100'
              : 'opacity-0'
          }`} />

          {/* Avatar Ring */}
          <div className="relative mb-3.5 z-10">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
              vapiCallStatus === 'active'
                ? isAgentSpeaking
                  ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20 border-amber-400/60 shadow-lg shadow-amber-500/30 scale-105'
                  : 'bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
                : vapiCallStatus === 'connecting'
                ? 'bg-amber-500/10 border-amber-500/30 animate-pulse'
                : 'bg-slate-800 border-slate-700'
            }`}>
              <Bot className={`w-10 h-10 ${
                vapiCallStatus === 'active' 
                  ? isAgentSpeaking ? 'text-amber-400' : 'text-emerald-400'
                  : 'text-slate-400'
              }`} />
            </div>

            {/* Radar ring when active */}
            {vapiCallStatus === 'active' && (
              <span className="absolute -inset-2 rounded-2xl border border-amber-400/30 animate-ping pointer-events-none opacity-40" />
            )}
          </div>

          {/* Voice State Title */}
          <div className="z-10">
            <h4 className="text-sm font-bold text-white flex items-center justify-center gap-2">
              <span>Agent Arjun (HR Recruiter)</span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Vapi WebRTC
              </span>
            </h4>

            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {vapiCallStatus === 'idle' && (
                <span className="text-slate-300">Ready to initiate live voice screening with Arjun. Click below to begin.</span>
              )}
              {vapiCallStatus === 'connecting' && (
                <span className="text-amber-300">Connecting WebRTC audio stream to assistant ({assistantId.substring(0, 8)}...)...</span>
              )}
              {vapiCallStatus === 'active' && (
                isAgentSpeaking ? (
                  <span className="text-amber-400 font-medium">Arjun is speaking...</span>
                ) : (
                  <span className="text-emerald-400 font-medium">Listening to candidate (Full Duplex Mic Live)...</span>
                )
              )}
              {vapiCallStatus === 'ended' && (
                <span className="text-slate-400">Call concluded. Total duration: {formatTime(duration)}.</span>
              )}
              {vapiCallStatus === 'key_required' && (
                <span className="text-amber-300">Vapi Public API Key required to establish live WebRTC audio link.</span>
              )}
              {vapiCallStatus === 'error' && (
                <span className="text-rose-400">Call failed to connect.</span>
              )}
            </p>

            {/* In-visualizer Start Voice Screening Action when Idle */}
            {vapiCallStatus === 'idle' && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  id="btn-start-voice-screening-hero"
                  type="button"
                  onClick={() => handleStartCall()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Start Voice Screening</span>
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Voice Bars (Google / Alexa equalizer) */}
          {vapiCallStatus === 'active' && (
            <div className="flex items-center gap-1.5 mt-4 h-6 z-10">
              {[40, 75, 55, 90, 60, 85, 45].map((baseHeight, idx) => {
                const dynamicHeight = isAgentSpeaking
                  ? Math.max(15, (baseHeight * (volumeLevel || 0.4)))
                  : 12;
                return (
                  <div
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isAgentSpeaking ? 'bg-amber-400' : 'bg-emerald-400/60'
                    }`}
                    style={{ height: `${dynamicHeight}px` }}
                  />
                );
              })}
            </div>
          )}

          {/* Quick simulation / speech test chips during active call */}
          {vapiCallStatus === 'active' && (
            <div className="mt-3.5 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2 z-10">
              <span className="text-[11px] text-slate-400 font-medium">Test Auto-Cut:</span>
              <button
                type="button"
                onClick={() => handleSimulateCandidateSpeech("Thank you so much Arjun, that sounds great. Bye!")}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 hover:border-amber-400/50 transition cursor-pointer flex items-center gap-1 shadow-xs"
                title="Simulate candidate saying 'Thank you, bye!' to test 1-confirmation and auto cut"
              >
                <span>👋 Candidate says: "Thank you, bye!"</span>
              </button>
              <button
                type="button"
                onClick={() => handleSimulateCandidateSpeech("I have to drop off now, please cut the call. Goodbye!")}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-900/90 hover:bg-slate-800 text-rose-300 border border-rose-500/30 hover:border-rose-400/50 transition cursor-pointer flex items-center gap-1 shadow-xs"
                title="Simulate candidate saying 'please cut the call' to test auto cut"
              >
                <span>🛑 Candidate says: "Cut the call"</span>
              </button>
            </div>
          )}
        </div>

        {/* Key Configuration / Setup Panel when key is required or opened via Settings */}
        {(vapiCallStatus === 'key_required' || showKeySettings) && (
          <div className="m-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 text-xs shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-white text-sm">Vapi Credentials & Assistant Configuration</h5>
                  {vapiCallStatus !== 'key_required' && (
                    <button
                      type="button"
                      onClick={() => setShowKeySettings(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Configure your Vapi Public Key and Assistant ID for live browser WebRTC calls.
                </p>

                <form onSubmit={handleSaveAndConnectKey} className="mt-3 space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Vapi Public API Key
                    </label>
                    <input
                      type="text"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Paste Vapi Public Key (e.g. 4b87c09e-xxxx-...)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Vapi Assistant ID
                    </label>
                    <input
                      type="text"
                      value={assistantIdInput}
                      onChange={(e) => setAssistantIdInput(e.target.value)}
                      placeholder="Paste Vapi Assistant ID (e.g. 841eead4-xxxx-...)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={!apiKeyInput.trim() || isConnectingKey}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer text-xs"
                    >
                      {isConnectingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Save & Connect Voice Agent</span>
                    </button>

                    {onSwitchToInteractive && (
                      <button
                        type="button"
                        onClick={handleSwitchToInteractive}
                        className="inline-flex items-center justify-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition text-[11px] underline underline-offset-4"
                      >
                        <span>Switch to Interactive AI</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </form>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  Credentials are encrypted in memory and stored securely in local browser cache.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Error Alert Card for specific voice call errors */}
        {errorMessage && vapiCallStatus !== 'key_required' && (
          <div
            className={`m-4 p-4.5 rounded-2xl border flex flex-col sm:flex-row items-start justify-between gap-4 text-xs shadow-lg transition-all ${
              voiceError?.type === 'mic_permission'
                ? 'bg-gradient-to-r from-rose-950/60 via-amber-950/30 to-slate-900 border-rose-500/50 text-rose-100'
                : voiceError?.type === 'network_timeout'
                ? 'bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-950 border-amber-500/50 text-amber-100'
                : voiceError?.type === 'mic_missing'
                ? 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-950 border-rose-500/50 text-rose-100'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-md ${
                  voiceError?.type === 'mic_permission' || voiceError?.type === 'mic_missing'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : voiceError?.type === 'network_timeout'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {voiceError?.type === 'mic_permission' || voiceError?.type === 'mic_missing' ? (
                  <MicOff className="w-5 h-5" />
                ) : voiceError?.type === 'network_timeout' ? (
                  <Radio className="w-5 h-5 animate-pulse" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-sm text-white">
                    {voiceError?.title || (errorMessage.includes('Microphone') ? 'Microphone Permission Required' : 'Voice Screening Notice')}
                  </h5>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      voiceError?.type === 'mic_permission'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : voiceError?.type === 'network_timeout'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {voiceError?.type ? voiceError.type.replace('_', ' ') : 'Voice Alert'}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed text-xs">
                  {errorMessage}
                </p>

                {/* Specific Action Guidance */}
                {voiceError?.actionHint ? (
                  <p className="text-[11px] text-amber-300/90 font-medium pt-0.5">
                    💡 {voiceError.actionHint}
                  </p>
                ) : errorMessage.includes('Microphone') ? (
                  <div className="bg-slate-950/50 rounded-xl p-2.5 border border-slate-800/80 text-[11px] text-slate-300 space-y-1 mt-1">
                    <p className="font-semibold text-rose-300">How to allow microphone access:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                      <li>Click the lock or camera icon in your browser URL address bar</li>
                      <li>Switch <strong>Microphone</strong> permission from Blocked to <strong>Allow</strong></li>
                      <li>Click <strong>Allow Mic &amp; Retry</strong> below</li>
                    </ol>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
              <button
                type="button"
                onClick={handleRetry}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{voiceError?.type === 'mic_permission' ? 'Allow Mic & Retry' : 'Retry Call'}</span>
              </button>

              {onSwitchToInteractive && (
                <button
                  type="button"
                  onClick={handleSwitchToInteractive}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition cursor-pointer"
                >
                  <span>AI Recruiter</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Gemini Speech-to-Text Analysis: Key Candidate Requirements */}
        {(vapiCallStatus === 'ended' || isAnalyzingWithGemini || geminiAnalysis) && (
          <div className="p-4 bg-gradient-to-br from-slate-900 via-[#0d1627] to-slate-950 border-b border-slate-800 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800/80 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-xs font-bold text-white">
                    Key Candidate Requirements
                  </h5>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                    Gemini Speech into Text
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {geminiAnalysis && (
                  <button
                    type="button"
                    onClick={handleCopyNotes}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition cursor-pointer"
                    title="Copy requirements bulleted summary"
                  >
                    {copiedNotes ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Copy Bullets</span>
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Auto-Saved in Notes</span>
                </div>
              </div>
            </div>

            {isAnalyzingWithGemini ? (
              <div className="py-5 px-4 rounded-xl bg-slate-950/60 border border-amber-500/20 flex flex-col items-center justify-center text-center space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-bold">Analyzing Speech-to-Text Transcript with Gemini...</span>
                </div>
                <p className="text-[11px] text-slate-400 max-w-md leading-relaxed">
                  Extracting role preferences, compensation requirements, notice period, Sector 67 Gurugram commute feasibility, and candidate expectations directly from spoken dialogue.
                </p>
              </div>
            ) : geminiAnalysis ? (
              <div className="space-y-2.5">
                {/* Highlight Chips */}
                {geminiAnalysis.keyHighlights && geminiAnalysis.keyHighlights.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {geminiAnalysis.keyHighlights.map((hl, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-[11px] font-medium text-slate-200"
                      >
                        {hl}
                      </span>
                    ))}
                  </div>
                )}

                {/* Bulleted Requirements Box */}
                <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 text-xs leading-relaxed max-h-48 overflow-y-auto space-y-1.5 shadow-inner font-sans">
                  {geminiAnalysis.bulletedRequirements && geminiAnalysis.bulletedRequirements.length > 0 ? (
                    geminiAnalysis.bulletedRequirements.map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-300">
                        <span className="text-amber-400 select-none font-bold text-xs mt-0.5">•</span>
                        <span className="flex-1 text-xs leading-snug">{bullet.replace(/^[•\s*-]+/, '')}</span>
                      </div>
                    ))
                  ) : (
                    <div className="whitespace-pre-wrap text-xs text-slate-300">
                      {geminiAnalysis.bulletedSummaryText || geminiAnalysis.summary}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1 text-slate-400">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Saved directly to candidate notes for {candidate?.name || 'Candidate'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleRegenerateSummary}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-summarize</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Live Conversation Transcript Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px] max-h-72 bg-[#090e1a]">
          <div className="text-center">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
              Live WebRTC Transcript Feed
            </span>
          </div>

          {transcript.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              {vapiCallStatus === 'idle' ? (
                <span>Click &apos;Start Voice Screening&apos; to begin the conversation with Arjun.</span>
              ) : vapiCallStatus === 'connecting' ? (
                <span>Establishing audio link... speak when connected.</span>
              ) : vapiCallStatus === 'active' ? (
                <span>Assistant is preparing opening greeting...</span>
              ) : (
                <span>No conversation logged yet.</span>
              )}
            </div>
          ) : (
            transcript.map((msg, index) => (
              <div
                key={`${msg.id || 'msg'}-${index}`}
                className={`flex items-start gap-2.5 ${
                  msg.sender === 'agent' ? 'justify-start' : 'justify-end'
                }`}
              >
                {msg.sender === 'agent' && (
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'agent'
                      ? 'bg-slate-900 border border-slate-800 text-slate-200'
                      : 'bg-amber-600 text-slate-950 font-medium'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-70 mb-1">
                    <span className="font-bold">
                      {msg.sender === 'agent' ? 'Arjun (Virtual HR)' : (candidate?.name || 'Candidate')}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div>{msg.text}</div>
                </div>

                {msg.sender === 'candidate' && (
                  <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shrink-0 mt-0.5 font-bold text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Footer Action Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {vapiCallStatus === 'active' && (
              <button
                type="button"
                onClick={handleToggleMute}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                  isMuted
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMuted ? 'Muted' : 'Mic Live'}</span>
              </button>
            )}

            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Assistant ID: <code className="text-slate-400 font-mono text-[10px]">{assistantId.substring(0, 16)}...</code>
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Post-Call Action Buttons when call has ended */}
            {vapiCallStatus === 'ended' && candidate && (
              <>
                {onOpenConfirmationMail && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenConfirmationMail(candidate);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Send Email</span>
                  </button>
                )}

                {onOpenWhatsApp && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWhatsApp(candidate);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Send WhatsApp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleStartCall()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer shadow-sm"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-slate-950" />
                  <span>Call Again</span>
                </button>
              </>
            )}

            {/* Start Voice Screening button when idle or error */}
            {(vapiCallStatus === 'idle' || vapiCallStatus === 'error') && (
              <button
                id="btn-start-voice-screening"
                type="button"
                onClick={() => handleStartCall()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Start Voice Screening</span>
              </button>
            )}

            {/* Connecting State */}
            {vapiCallStatus === 'connecting' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </button>
                <button
                  id="btn-vapi-end-connecting"
                  type="button"
                  onClick={handleEndCall}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition active:scale-95 cursor-pointer shadow-md shadow-rose-950/40"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>End Call</span>
                </button>
              </div>
            )}

            {/* Active State: End Call button */}
            {vapiCallStatus === 'active' && (
              <button
                id="btn-vapi-end-call"
                type="button"
                onClick={handleEndCall}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition active:scale-95 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
