import React, { useState, useMemo } from 'react';
import { 
  Activity, Mic, MessageSquare, Flame, CheckCircle, 
  AlertTriangle, ArrowUpRight, TrendingUp, Users, Clock, 
  Sparkles, Calendar, Mail, Check, ShieldCheck, HeartPulse,
  Award, Volume2, UserCheck, BarChart3, HelpCircle
} from 'lucide-react';
import { Candidate, VoiceAnalyticsMetrics } from '../types';
import { analyzeVoiceTranscripts } from '../utils/voiceAnalyticsEngine';

interface VoiceSentimentAnalyticsDashboardProps {
  candidates: Candidate[];
  onOpenGmailForCandidate?: (candidate: Candidate) => void;
  onOpenGCalForCandidate?: (candidate: Candidate) => void;
  onSelectCandidate?: (candidate: Candidate) => void;
}

export const VoiceSentimentAnalyticsDashboard: React.FC<VoiceSentimentAnalyticsDashboardProps> = ({
  candidates,
  onOpenGmailForCandidate,
  onOpenGCalForCandidate,
  onSelectCandidate,
}) => {
  // Filter candidates that have call records or completed screening
  const eligibleCandidates = useMemo(() => {
    return candidates.filter((c) => (c.callCount || 0) > 0 || c.callHistory?.length || c.status !== 'Screening Pending');
  }, [candidates]);

  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    eligibleCandidates[0]?.id || candidates[0]?.id || ''
  );

  const selectedCandidate = useMemo(() => {
    return candidates.find((c) => c.id === selectedCandidateId) || candidates[0];
  }, [candidates, selectedCandidateId]);

  const analytics: VoiceAnalyticsMetrics = useMemo(() => {
    if (!selectedCandidate) {
      return analyzeVoiceTranscripts(candidates[0] || {
        id: 'EMPTY',
        name: 'No Candidate',
        phone: '',
        email: '',
        appliedRole: 'Senior Property Consultant',
        status: 'Screening Pending',
        interviewStatus: 'Not Scheduled',
        notes: '',
        screening: {} as any,
      });
    }
    return analyzeVoiceTranscripts(selectedCandidate);
  }, [selectedCandidate, candidates]);

  // Aggregate stats across cohort
  const cohortStats = useMemo(() => {
    if (eligibleCandidates.length === 0) return { avgCandTalk: 55, avgEngagement: 78, positivePct: 80 };

    let totalCandTalk = 0;
    let totalEngagement = 0;
    let positiveCount = 0;

    eligibleCandidates.forEach((c) => {
      const a = analyzeVoiceTranscripts(c);
      totalCandTalk += a.candidateTalkTimePercentage;
      totalEngagement += a.engagementIndex;
      if (a.overallSentiment === 'Positive' || a.overallSentiment === 'Interested') {
        positiveCount++;
      }
    });

    return {
      avgCandTalk: Math.round(totalCandTalk / eligibleCandidates.length),
      avgEngagement: Math.round(totalEngagement / eligibleCandidates.length),
      positivePct: Math.round((positiveCount / eligibleCandidates.length) * 100),
    };
  }, [eligibleCandidates]);

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}m ${rem}s`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive':
        return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40';
      case 'Interested':
        return 'text-blue-400 bg-blue-500/15 border-blue-500/40';
      case 'Neutral':
        return 'text-slate-300 bg-slate-500/15 border-slate-500/40';
      case 'Hesitant':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/40';
      case 'Resistant':
        return 'text-rose-400 bg-rose-500/15 border-rose-500/40';
      default:
        return 'text-purple-400 bg-purple-500/15 border-purple-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Cohort Aggregate Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Voice Screening Sentiment & Talk-Time Intelligence
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI acoustic & conversational intelligence evaluating candidate interest, talk dominance, and luxury sales aptitude.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-medium">Cohort Positive Sentiment</span>
              <strong className="text-emerald-300 font-mono text-base">{cohortStats.positivePct}%</strong>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-medium">Avg Candidate Talk-Time</span>
              <strong className="text-indigo-300 font-mono text-base">{cohortStats.avgCandTalk}%</strong>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-medium">Avg Engagement Index</span>
              <strong className="text-purple-300 font-mono text-base">{cohortStats.avgEngagement}/100</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Candidate Selector, Right Deep Dive Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Candidate List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Voice Screened Candidates ({candidates.length})</span>
            </h3>
          </div>

          <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
            {candidates.map((cand) => {
              const a = analyzeVoiceTranscripts(cand);
              const isSelected = cand.id === selectedCandidate?.id;

              return (
                <button
                  key={cand.id}
                  onClick={() => {
                    setSelectedCandidateId(cand.id);
                    if (onSelectCandidate) onSelectCandidate(cand);
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left transition flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-950/70 to-indigo-950/70 border-purple-500/70 shadow-lg shadow-purple-950/30 ring-1 ring-purple-500/50'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs truncate">{cand.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSentimentColor(a.overallSentiment)}`}>
                      {a.overallSentiment}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate">{cand.appliedRole}</p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                    <span>Talk-Time: <strong className="text-indigo-300">{a.candidateTalkTimePercentage}%</strong></span>
                    <span>Engagement: <strong className="text-purple-300">{a.engagementIndex}/100</strong></span>
                    <span>Calls: <strong className="text-slate-300">{cand.callCount || 0}</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Dive Candidate Voice Analytics (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedCandidate ? (
            <div className="space-y-5">
              {/* Profile Card Header with Direct Action Buttons */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                        {selectedCandidate.name}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getSentimentColor(analytics.overallSentiment)}`}>
                        {analytics.overallSentiment} ({analytics.sentimentScore}%)
                      </span>
                    </div>
                    <p className="text-xs text-amber-400 font-medium mt-0.5">{selectedCandidate.appliedRole}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{selectedCandidate.phone} • {selectedCandidate.email}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {onOpenGmailForCandidate && (
                      <button
                        onClick={() => onOpenGmailForCandidate(selectedCandidate)}
                        className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Gmail Sequence</span>
                      </button>
                    )}

                    {onOpenGCalForCandidate && (
                      <button
                        onClick={() => onOpenGCalForCandidate(selectedCandidate)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Google Calendar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Score Meters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-400 block">Sentiment Score</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-bold text-emerald-300 font-mono">{analytics.sentimentScore}</span>
                      <span className="text-[10px] text-slate-500">/100</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-400 block">Engagement Index</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-bold text-purple-300 font-mono">{analytics.engagementIndex}</span>
                      <span className="text-[10px] text-slate-500">/100</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-400 block">Luxury Sales Aptitude</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-bold text-amber-300 font-mono">{analytics.luxurySalesAptitudeScore}</span>
                      <span className="text-[10px] text-slate-500">/100</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-400 block">Clarity & Pace</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-sm font-bold text-blue-300">{analytics.communicationClarity}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({analytics.speakingRateWPM} WPM)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Talk-Time Dominance Visualizer */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Mic className="w-4 h-4 text-indigo-400" />
                    <span>Talk-Time Dominance Breakdown (Total Duration: {formatSecs(analytics.totalDurationSeconds)})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Ideal Candidate Talk-Time: <strong className="text-indigo-300">50% - 65%</strong>
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="w-full h-5 rounded-full overflow-hidden bg-slate-950 border border-slate-800 flex shadow-inner">
                    <div
                      style={{ width: `${analytics.candidateTalkTimePercentage}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 relative group cursor-pointer transition-all duration-500"
                      title={`Candidate: ${analytics.candidateTalkTimePercentage}%`}
                    />
                    <div
                      style={{ width: `${analytics.agentTalkTimePercentage}%` }}
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 relative group cursor-pointer transition-all duration-500"
                      title={`AI Recruiter (Arjun): ${analytics.agentTalkTimePercentage}%`}
                    />
                    <div
                      style={{ width: `${analytics.silencePercentage}%` }}
                      className="h-full bg-slate-700 relative group cursor-pointer transition-all duration-500"
                      title={`Silence/Pauses: ${analytics.silencePercentage}%`}
                    />
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                    <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[10px]">Candidate Speaking</span>
                        <strong className="text-white text-xs font-mono">
                          {analytics.candidateTalkTimePercentage}% ({formatSecs(analytics.candidateTalkTimeSeconds)})
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <div className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[10px]">AI Recruiter (Arjun)</span>
                        <strong className="text-white text-xs font-mono">
                          {analytics.agentTalkTimePercentage}% ({formatSecs(analytics.agentTalkTimeSeconds)})
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <div className="w-3 h-3 rounded-full bg-slate-600 shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[10px]">Pauses & Silence</span>
                        <strong className="text-slate-300 text-xs font-mono">
                          {analytics.silencePercentage}% ({formatSecs(analytics.silenceSeconds)})
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signals vs Hesitations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Interest Signals */}
                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>Positive Buying / Interest Signals ({analytics.keyInterestSignals.length})</span>
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {analytics.keyInterestSignals.map((sig, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-200 bg-slate-950/70 p-2.5 rounded-xl border border-emerald-500/20 flex items-start gap-2"
                      >
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{sig}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Hesitations & Objections */}
                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Detected Hesitations & Objections ({analytics.detectedHesitations.length})</span>
                    </h4>
                  </div>
                  {analytics.detectedHesitations.length === 0 ? (
                    <div className="bg-slate-950/70 p-4 rounded-xl text-center text-xs text-slate-400 border border-slate-800">
                      Zero friction points or hesitations detected during screening call.
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {analytics.detectedHesitations.map((hes, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-200 bg-slate-950/70 p-2.5 rounded-xl border border-amber-500/20 flex items-start gap-2"
                        >
                          <span className="text-amber-400 font-bold">⚠️</span>
                          <span>{hes}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Keywords & Transcript Log */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <span>Screening Call Transcript & Keyword Density</span>
                  </h4>
                  <div className="flex items-center gap-1.5">
                    {analytics.topDiscussedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      >
                        {kw.word} ({kw.count})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 max-h-64 overflow-y-auto space-y-2.5 leading-relaxed">
                  {selectedCandidate.callHistory && selectedCandidate.callHistory.length > 0 && selectedCandidate.callHistory[selectedCandidate.callHistory.length - 1].transcript ? (
                    (() => {
                      const lastCall = selectedCandidate.callHistory[selectedCandidate.callHistory.length - 1];
                      const raw = lastCall.transcript as any;
                      const turns: { id: string; sender: 'agent' | 'candidate'; text: string; label: string }[] = 
                        Array.isArray(raw)
                          ? raw.map((m: any, idx: number) => ({
                              id: m.id || `analytic-${lastCall.id}-${idx}`,
                              sender: m.sender === 'agent' ? ('agent' as const) : ('candidate' as const),
                              text: m.text || '',
                              label: m.sender === 'agent' ? 'Arjun (Virtual HR)' : (selectedCandidate.name || 'Candidate'),
                            }))
                          : typeof raw === 'string'
                          ? raw
                              .split('\n')
                              .filter(Boolean)
                              .map((line: string, idx: number) => {
                                const isCand = line.toLowerCase().startsWith('candidate:') || line.toLowerCase().startsWith('applicant:');
                                return {
                                  id: `analytic-str-${idx}`,
                                  sender: isCand ? ('candidate' as const) : ('agent' as const),
                                  text: line,
                                  label: isCand ? (selectedCandidate.name || 'Candidate') : 'Arjun (Virtual HR)',
                                };
                              })
                          : [];

                      if (turns.length === 0) {
                        return (
                          <div className="text-slate-400 italic">
                            {selectedCandidate.notes || 'Virtual HR Screening completed.'}
                          </div>
                        );
                      }

                      return turns.map((turn, tIdx) => (
                        <div
                          key={turn.id || tIdx}
                          className={`p-2.5 rounded-lg border ${
                            turn.sender === 'candidate'
                              ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-200'
                              : 'bg-purple-950/30 border-purple-500/30 text-purple-200'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold opacity-80 mb-1">
                            <span>{turn.label}</span>
                          </div>
                          <div className="font-sans text-xs leading-relaxed">{turn.text}</div>
                        </div>
                      ));
                    })()
                  ) : (
                    <div className="text-slate-400 italic">
                      {selectedCandidate.notes || 'Virtual HR Screening completed. Candidate confirmed attendance for face-to-face evaluation.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
              Select a candidate from the roster to view in-depth acoustic & sentiment analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
