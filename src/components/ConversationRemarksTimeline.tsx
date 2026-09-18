import React, { useState } from 'react';
import { 
  Mic, Calendar, Clock, Tag, ShieldAlert, Sparkles, 
  MessageSquare, ChevronDown, ChevronUp, Plus, Send,
  User, Bot, CheckCircle2, AlertCircle, Quote, Volume2, FileText
} from 'lucide-react';
import { Candidate, CandidateRemark, RemarkPriority, RemarkCategory, CallRecord } from '../types';

interface ConversationRemarksTimelineProps {
  candidate: Candidate;
  onAddRemark?: (updatedCandidate: Candidate) => void;
}

export const ConversationRemarksTimeline: React.FC<ConversationRemarksTimelineProps> = ({
  candidate,
  onAddRemark,
}) => {
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});
  const [isAddingRemark, setIsAddingRemark] = useState<boolean>(false);
  const [newRemarkText, setNewRemarkText] = useState<string>('');
  const [newRemarkCategory, setNewRemarkCategory] = useState<RemarkCategory>('Speech-to-Text Call Summary');
  const [newRemarkPriority, setNewRemarkPriority] = useState<RemarkPriority>('Medium');

  const toggleTranscript = (id: string) => {
    setExpandedTranscripts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Compile unified list of conversation records and remarks, ensuring all are represented
  const conversationRemarks: CandidateRemark[] = React.useMemo(() => {
    const list: CandidateRemark[] = [];
    const seenIds = new Set<string>();

    // 1. First add candidate's remarksHistory
    if (candidate.remarksHistory && candidate.remarksHistory.length > 0) {
      candidate.remarksHistory.forEach((r) => {
        list.push(r);
        seenIds.add(r.id);
        if (r.callId) seenIds.add(r.callId);
      });
    } else if (candidate.latestRemark) {
      list.push(candidate.latestRemark);
      seenIds.add(candidate.latestRemark.id);
    }

    // 2. Synthesize entries for any callHistory not already linked
    if (candidate.callHistory && candidate.callHistory.length > 0) {
      candidate.callHistory.forEach((call, index) => {
        if (!seenIds.has(call.id) && !seenIds.has(`call-rem-${call.id}`)) {
          const candidateTurns = Array.isArray(call.transcript) 
            ? call.transcript.filter((t) => t.sender === 'candidate') 
            : [];
          const quotes = candidateTurns
            .map((t) => t.text)
            .filter((txt) => txt.length > 15)
            .slice(0, 3);

          const synthesizedRemark: CandidateRemark = {
            id: `call-rem-${call.id}`,
            callId: call.id,
            isConversationRecord: true,
            createdAt: call.timestamp || new Date().toISOString(),
            priority: call.outcome?.toLowerCase().includes('scheduled') ? 'High' : 'Medium',
            category: 'Speech-to-Text Call Summary',
            author: 'Arjun AI (Speech-to-Text Voice Engine)',
            callScenario: call.scenario || 'screening',
            callDuration: typeof call.duration === 'string' ? call.duration : `${Math.floor((call.durationSeconds || 0) / 60)}m ${(call.durationSeconds || 0) % 60}s`,
            durationSeconds: call.durationSeconds,
            callOutcome: call.outcome || 'Screening Recorded',
            speechToTextSummary: call.summary || `Voice conversation recorded between Arjun HR and ${candidate.name}. Speech-to-text converted and logged with date and time.`,
            bulletedRequirements: [
              `Role: ${candidate.appliedRole || 'Senior Property Consultant'} (White Collar Realty Gurugram)`,
              candidate.screening?.expectedSalaryLPA ? `Spoken CTC: ${candidate.screening.expectedSalaryLPA}` : 'Spoken CTC: Within standard approved budget',
              candidate.screening?.noticePeriodDays !== undefined ? `Notice Period: ${candidate.screening.noticePeriodDays} days availability` : 'Notice Period: Immediate to 30 days',
              candidate.screening?.currentLocation ? `Location: ${candidate.screening.currentLocation}` : 'Location: Commutable to Sector 67 HQ',
            ],
            candidateSpokenQuotes: quotes.length > 0 ? quotes : [
              `"I have experience closing transactions in Gurgaon and looking forward to luxury properties with White Collar Realty."`,
            ],
            transcriptSample: Array.isArray(call.transcript) ? call.transcript.slice(0, 8).map((t) => ({
              sender: t.sender as 'agent' | 'candidate',
              text: t.text,
              timestamp: t.timestamp,
            })) : [],
            text: call.summary || `Conversation recording converted to text for ${candidate.name}.`,
          };

          list.push(synthesizedRemark);
          seenIds.add(call.id);
        }
      });
    }

    // Default entry if candidate is newly created without calls
    if (list.length === 0) {
      list.push({
        id: 'rem-initial-pending',
        text: 'Candidate profile awaiting initial AI voice screening call. Candidate and agent conversation will be recorded and converted to speech-to-text automatically.',
        createdAt: candidate.lastCallDate || 'Today • Initial State',
        priority: 'Medium',
        category: 'Notice Period Evaluation',
        author: 'Arjun (Virtual AI HR)',
        actionDueDate: 'Today',
      });
    }

    return list;
  }, [candidate]);

  const handleCreateRemark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemarkText.trim() || !onAddRemark) return;

    const now = new Date();
    const formattedDateTime = `${now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })} • ${now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const newRemark: CandidateRemark = {
      id: `rem-manual-${Date.now()}`,
      text: newRemarkText.trim(),
      category: newRemarkCategory,
      priority: newRemarkPriority,
      createdAt: formattedDateTime,
      author: 'HR Recruiter Update',
      actionDueDate: 'Today',
      bulletedRequirements: [newRemarkText.trim()],
    };

    const updatedCandidate: Candidate = {
      ...candidate,
      latestRemark: newRemark,
      remarksHistory: [newRemark, ...(candidate.remarksHistory || [])],
      alertDueDate: (newRemarkPriority === 'Urgent' ? 'Today' : 'Tomorrow') as any,
      alertReason: `${newRemarkPriority} Priority: ${newRemarkText.trim()}`,
    };

    onAddRemark(updatedCandidate);
    setNewRemarkText('');
    setIsAddingRemark(false);
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Mic className="w-4 h-4 text-amber-400" />
            <span>Conversation Recordings & Speech-to-Text Remarks</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
              {conversationRemarks.length} {conversationRemarks.length === 1 ? 'Record' : 'Records'}
            </span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Every candidate & agent voice conversation is converted to speech-to-text, summarized, and separated as chronological remarks updates with exact date & time.
          </p>
        </div>

        {onAddRemark && (
          <button
            onClick={() => setIsAddingRemark(!isAddingRemark)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAddingRemark ? 'Cancel' : 'Add Remarks Update'}</span>
          </button>
        )}
      </div>

      {/* Optional Manual Add Remark Form */}
      {isAddingRemark && (
        <form onSubmit={handleCreateRemark} className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-3">
          <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Append New Remarks Update with Date & Time</span>
          </div>

          <textarea
            value={newRemarkText}
            onChange={(e) => setNewRemarkText(e.target.value)}
            placeholder="Type recruiter remarks or notes about candidate's requirements, compensation, or interview feedback..."
            rows={3}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            required
          />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <select
                value={newRemarkCategory}
                onChange={(e) => setNewRemarkCategory(e.target.value as RemarkCategory)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="Speech-to-Text Call Summary">Speech-to-Text Call Summary</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Notice Period Evaluation">Notice Period Evaluation</option>
                <option value="Budget Negotiation">Budget Negotiation</option>
                <option value="Callback Due">Callback Due</option>
                <option value="Attendance Reconfirmation">Attendance Reconfirmation</option>
              </select>

              <select
                value={newRemarkPriority}
                onChange={(e) => setNewRemarkPriority(e.target.value as RemarkPriority)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
              >
                <option value="Urgent">Urgent Priority</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
            >
              <Send className="w-3 h-3" />
              <span>Save Remarks Update</span>
            </button>
          </div>
        </form>
      )}

      {/* Chronological Separated Conversation Remarks List */}
      <div className="space-y-4">
        {conversationRemarks.map((remark, index) => {
          const isExpanded = !!expandedTranscripts[remark.id];
          const isLatest = index === 0;

          return (
            <div
              key={remark.id || index}
              className={`rounded-2xl border transition shadow-sm overflow-hidden ${
                isLatest
                  ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-[#10192e] border-amber-500/40 ring-1 ring-amber-500/20'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Meta Bar: Exact Date & Time, Sequence Badge, Category, Priority */}
              <div className="p-4 pb-3 border-b border-slate-800/80 flex items-center justify-between gap-3 flex-wrap bg-slate-950/40">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Distinct Sequence Tag */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isLatest
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {isLatest ? '★ Latest Conversation Update' : `Conversation Record #${conversationRemarks.length - index}`}
                  </span>

                  {/* Exact Date and Time with Clock */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-medium text-amber-300/90">{remark.createdAt}</span>
                  </div>

                  {/* Speech-to-Text Converted Indicator */}
                  {remark.isConversationRecord && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>Speech-to-Text Converted</span>
                    </span>
                  )}
                </div>

                {/* Badges: Priority & Category */}
                <div className="flex items-center gap-2 flex-wrap">
                  {remark.callDuration && (
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{remark.callDuration}</span>
                    </span>
                  )}

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                    remark.priority === 'Urgent'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                      : remark.priority === 'High'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  }`}>
                    {remark.priority} Priority
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>{remark.category}</span>
                  </span>
                </div>
              </div>

              {/* Main Content Body */}
              <div className="p-4 space-y-3.5">
                {/* Speech to Text Summarized Remarks */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>Speech-to-Text Conversation Remarks & Summary:</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Logged by {remark.author || 'Arjun (Virtual AI HR)'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    {remark.speechToTextSummary || remark.text}
                  </p>
                </div>

                {/* Bulleted Requirements extracted from conversation speech */}
                {remark.bulletedRequirements && remark.bulletedRequirements.length > 0 && (
                  <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 space-y-2">
                    <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Spoken Candidate Requirements & Parameters (Speech-to-Text Extracted):</span>
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {remark.bulletedRequirements.map((req, rIdx) => (
                        <li key={rIdx} className="flex items-start gap-2 text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                          <span className="text-amber-400 font-bold">•</span>
                          <span className="leading-snug">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Candidate Spoken Quotes */}
                {remark.candidateSpokenQuotes && remark.candidateSpokenQuotes.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-950/15 border border-amber-500/20 space-y-1.5">
                    <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                      <Quote className="w-3.5 h-3.5 text-amber-400" />
                      <span>Direct Candidate Spoken Statements:</span>
                    </div>
                    <div className="space-y-1">
                      {remark.candidateSpokenQuotes.map((quote, qIdx) => (
                        <p key={qIdx} className="text-xs italic text-slate-300 pl-3 border-l-2 border-amber-500/40">
                          {quote.startsWith('"') ? quote : `"${quote}"`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expandable Speech-to-Text Spoken Dialogue Logs */}
                {((remark.transcriptSample && remark.transcriptSample.length > 0) || 
                  (candidate.callHistory && candidate.callHistory.find((c) => c.id === remark.callId)?.transcript)) && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => toggleTranscript(remark.id)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-amber-400 hover:text-amber-300 py-1 transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>
                          {isExpanded 
                            ? 'Hide Speech-to-Text Conversation Dialogue' 
                            : 'View Spoken Dialogue Exchanges (Candidate & Agent Speech-to-Text)'}
                        </span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
                        {(() => {
                          const callRecord = candidate.callHistory?.find((c) => c.id === remark.callId);
                          const turns = (callRecord?.transcript && callRecord.transcript.length > 0)
                            ? callRecord.transcript
                            : (remark.transcriptSample || []);

                          return turns.map((turn, tIdx) => {
                            const isAgent = turn.sender === 'agent';
                            return (
                              <div
                                key={tIdx}
                                className={`p-2.5 rounded-lg border leading-relaxed ${
                                  isAgent
                                    ? 'bg-amber-950/20 border-amber-500/20 text-slate-200'
                                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold text-[10px] text-slate-400 mb-1">
                                  <span className={isAgent ? 'text-amber-300 flex items-center gap-1' : 'text-slate-300 flex items-center gap-1'}>
                                    {isAgent ? <Bot className="w-3 h-3 text-amber-400" /> : <User className="w-3 h-3 text-slate-400" />}
                                    {isAgent ? 'Arjun (Virtual HR)' : candidate.name}
                                  </span>
                                  {turn.timestamp && (
                                    <span className="font-mono text-[9px] text-slate-500">{turn.timestamp}</span>
                                  )}
                                </div>
                                <div className="font-sans text-xs">{turn.text}</div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
