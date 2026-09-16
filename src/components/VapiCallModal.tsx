import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, Mic, MicOff, Volume2, Sparkles, Building2, 
  MapPin, Briefcase, AlertCircle, RefreshCw, X, ShieldAlert,
  Bot, User, CheckCircle2, Radio
} from 'lucide-react';
import { Candidate, CallRecord, ChatMessage } from '../types';
import { 
  vapiService, 
  DEFAULT_VAPI_ASSISTANT_ID, 
  VapiCallStatus, 
  VapiTranscriptMessage 
} from '../utils/vapiService';

interface VapiCallModalProps {
  isOpen: boolean;
  candidate: Candidate | null;
  onClose: () => void;
  onCallEnded?: (updatedCandidate: Candidate) => void;
  assistantId?: string;
}

export const VapiCallModal: React.FC<VapiCallModalProps> = ({
  isOpen,
  candidate,
  onClose,
  onCallEnded,
  assistantId = DEFAULT_VAPI_ASSISTANT_ID,
}) => {
  const [callStatus, setCallStatus] = useState<VapiCallStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<VapiTranscriptMessage[]>([]);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const durationTimerRef = useRef<any>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Duration timer
  useEffect(() => {
    if (callStatus === 'active') {
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
  }, [callStatus]);

  // Start call on open
  useEffect(() => {
    if (!isOpen) {
      vapiService.resetToIdle();
      return;
    }

    setCallStatus('connecting');
    setErrorMessage(null);
    setTranscript([]);
    setDuration(0);
    setIsMuted(false);

    // Register event listeners
    const unsubStatus = vapiService.onStatusChange((status, err) => {
      setCallStatus(status);
      if (err) {
        setErrorMessage(err);
      }
      if (status === 'ended' && candidate) {
        finalizeCallRecord();
      }
    });

    const unsubTranscript = vapiService.onTranscript((msg) => {
      setTranscript((prev) => {
        // Prevent duplicate keys/messages
        if (prev.some((item) => item.id === msg.id)) {
          return prev;
        }
        return [...prev, msg];
      });
    });

    const unsubVolume = vapiService.onVolume((vol) => {
      setVolumeLevel(vol);
    });

    const unsubSpeaking = vapiService.onSpeaking((speaking) => {
      setIsAgentSpeaking(speaking);
    });

    // Launch Vapi call with candidate context using assistant ed825f7a-e951-444b-81a7-1d6917e439c5
    const launchCall = async () => {
      try {
        setCallStatus('connecting');
        const overrides: any = {};
        if (candidate) {
          overrides.variableValues = {
            candidate_name: candidate.name,
            candidate_role: candidate.appliedRole,
            candidate_phone: candidate.phone,
            current_company: candidate.screening?.currentCompany || '',
            experience_years: candidate.screening?.realEstateExperienceYears || candidate.screening?.totalExperienceYears || 0,
            location: candidate.screening?.currentLocation || 'Delhi NCR',
          };
        }

        await vapiService.startCall(assistantId, overrides);
      } catch (err: any) {
        console.error('Failed to initiate Vapi call:', err);
        setCallStatus('error');
        setErrorMessage(err.message || 'Unable to connect to Vapi voice assistant.');
      }
    };

    launchCall();

    return () => {
      unsubStatus();
      unsubTranscript();
      unsubVolume();
      unsubSpeaking();
    };
  }, [isOpen, candidate, assistantId]);

  const handleEndCall = () => {
    vapiService.stopCall();
    setCallStatus('ended');
    finalizeCallRecord();
  };

  const handleCloseModal = () => {
    if (callStatus === 'active' || callStatus === 'connecting') {
      vapiService.stopCall();
    }
    vapiService.resetToIdle();
    setCallStatus('idle');
    onClose();
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    vapiService.setMuted(nextMuted);
  };

  const handleRetry = async () => {
    setCallStatus('connecting');
    setErrorMessage(null);
    try {
      await vapiService.startCall(assistantId);
    } catch (err: any) {
      setCallStatus('error');
      setErrorMessage(err.message || 'Retry failed');
    }
  };

  const finalizeCallRecord = () => {
    if (!candidate) return;

    const chatMessages: ChatMessage[] = transcript.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp,
    }));

    const callRecord: CallRecord = {
      id: `vapi-call-${Date.now()}`,
      candidateId: candidate.id,
      candidateName: candidate.name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      scenario: 'screening',
      durationSeconds: duration,
      transcript: chatMessages,
      summary: `Live voice screening conducted via Vapi AI Assistant (ID: ${assistantId}). Duration: ${Math.floor(duration / 60)}m ${duration % 60}s with ${chatMessages.length} spoken exchanges.`,
      outcome: duration > 15 ? 'Vapi Screening Completed' : 'Brief Call Attempt',
      extractedFields: candidate.screening,
    };

    const updatedCandidate: Candidate = {
      ...candidate,
      status: candidate.status === 'Screening Pending' ? 'Screened - Ready for Interview' : candidate.status,
      callCount: candidate.callCount + 1,
      lastCallDate: new Date().toISOString().split('T')[0],
      callHistory: [callRecord, ...(candidate.callHistory || [])],
    };

    onCallEnded?.(updatedCandidate);
  };

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
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
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                  Vapi Voice Assistant
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 truncate">
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
            {callStatus === 'idle' && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Radio className="w-3 h-3 text-slate-400" />
                <span>Ready</span>
              </span>
            )}
            {callStatus === 'connecting' && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Connecting...</span>
              </span>
            )}
            {callStatus === 'active' && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5 shadow-xs shadow-emerald-950/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Call Active</span>
                <span className="font-mono text-emerald-200 ml-1">({formatTime(duration)})</span>
              </span>
            )}
            {callStatus === 'ended' && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-slate-400" />
                <span>Call Ended</span>
              </span>
            )}
            {callStatus === 'error' && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span>Error</span>
              </span>
            )}

            <button
              onClick={handleCloseModal}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Assistant / Audio Visualizer Box */}
        <div className="p-6 bg-slate-950/60 border-b border-slate-800 flex flex-col items-center justify-center text-center relative overflow-hidden">
          {/* Ambient Glow */}
          <div className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
            callStatus === 'active' 
              ? isAgentSpeaking 
                ? 'bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent opacity-100' 
                : 'bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent opacity-100'
              : 'opacity-0'
          }`} />

          {/* Avatar Ring */}
          <div className="relative mb-3.5 z-10">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
              callStatus === 'active'
                ? isAgentSpeaking
                  ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20 border-amber-400/60 shadow-lg shadow-amber-500/30 scale-105'
                  : 'bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-400/50 shadow-lg shadow-emerald-500/20'
                : callStatus === 'connecting'
                ? 'bg-amber-500/10 border-amber-500/30 animate-pulse'
                : 'bg-slate-800 border-slate-700'
            }`}>
              <Bot className={`w-10 h-10 ${
                callStatus === 'active' 
                  ? isAgentSpeaking ? 'text-amber-400' : 'text-emerald-400'
                  : 'text-slate-400'
              }`} />
            </div>

            {/* Radar ring when active */}
            {callStatus === 'active' && (
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
              {callStatus === 'idle' && (
                <span className="text-slate-400">Ready to initiate live voice screening.</span>
              )}
              {callStatus === 'connecting' && (
                <span className="text-amber-300">Connecting WebRTC audio stream to assistant ({assistantId.substring(0, 8)}...)...</span>
              )}
              {callStatus === 'active' && (
                isAgentSpeaking ? (
                  <span className="text-amber-400 font-medium">Arjun is speaking...</span>
                ) : (
                  <span className="text-emerald-400 font-medium">Listening to candidate (Full Duplex Mic Live)...</span>
                )
              )}
              {callStatus === 'ended' && (
                <span className="text-slate-400">Call concluded. Total duration: {formatTime(duration)}.</span>
              )}
              {callStatus === 'error' && (
                <span className="text-rose-400">Call failed to connect.</span>
              )}
            </p>
          </div>

          {/* Dynamic Voice Bars (Google / Alexa equalizer) */}
          {callStatus === 'active' && (
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
        </div>

        {/* Error Alert Banner if connection or microphone error occurs */}
        {errorMessage && (
          <div className="m-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-xs text-rose-200">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-rose-300">Voice Assistant Notification</p>
              <p className="text-rose-200 leading-relaxed">{errorMessage}</p>
              {errorMessage.includes('Microphone') && (
                <p className="text-[11px] text-rose-300/80 pt-1">
                  Tip: Click the microphone lock icon in your browser URL address bar to grant permission and retry.
                </p>
              )}
              {errorMessage.includes('Public Key') && (
                <p className="text-[11px] text-rose-300/80 pt-1">
                  Tip: Please add <code className="bg-rose-900/50 px-1 py-0.5 rounded text-rose-200">VITE_VAPI_PUBLIC_KEY</code> to your environment settings.
                </p>
              )}
            </div>
            {callStatus === 'error' && (
              <button
                onClick={handleRetry}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shrink-0"
              >
                Retry
              </button>
            )}
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
              {callStatus === 'connecting' ? (
                <span>Establishing audio link... speak when connected.</span>
              ) : callStatus === 'active' ? (
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
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {callStatus === 'active' && (
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

          <div className="flex items-center gap-2">
            {callStatus === 'active' || callStatus === 'connecting' ? (
              <button
                id="btn-vapi-end-call"
                type="button"
                onClick={handleEndCall}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40 transition active:scale-95"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
