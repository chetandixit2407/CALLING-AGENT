import React, { useState } from 'react';
import { 
  X, Phone, Mail, Building, Briefcase, Award, DollarSign, 
  MapPin, Clock, Calendar, CheckCircle2, AlertTriangle, 
  ChevronRight, MessageSquare, Play, Sparkles, UserCheck,
  Bell, ShieldAlert, History, Tag
} from 'lucide-react';
import { Candidate, CallRecord } from '../types';

interface CandidateDrawerProps {
  candidate: Candidate | null;
  onClose: () => void;
  onStartCall: (candidate: Candidate, scenario?: string) => void;
  onOpenConfirmationMail?: (candidate: Candidate) => void;
  onOpenWhatsApp?: (candidate: Candidate, template?: 'unanswered' | 'interview_reminder' | 'missed_followup') => void;
}

export const CandidateDrawer: React.FC<CandidateDrawerProps> = ({
  candidate,
  onClose,
  onStartCall,
  onOpenConfirmationMail,
  onOpenWhatsApp,
}) => {
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  if (!candidate) return null;

  const s = candidate.screening;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Attendance Confirmed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Interview Scheduled':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Screened - Ready for Interview':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Missed Interview - Followup':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'Callback Needed':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Declined - Do Not Call':
        return 'bg-slate-700/40 text-slate-400 border-slate-600';
      default:
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#0d1526] border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800 bg-[#0f172a] sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
                  {candidate.name}
                </h2>
                {candidate.status === 'Missed Interview - Followup' && (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/50 flex items-center gap-1 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    High Priority
                  </span>
                )}
                {(candidate.status === 'Interview Scheduled' || candidate.status === 'Attendance Confirmed' || candidate.interviewSlotId) && (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Upcoming Slot
                  </span>
                )}
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(candidate.status)}`}>
                  {candidate.status}
                </span>
              </div>
              <p className="text-sm text-amber-400 font-medium mt-1">
                {candidate.appliedRole}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {candidate.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {candidate.email}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Call Action Bar */}
          <div className="mt-5 flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => onStartCall(candidate, 'screening')}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold transition shadow-md"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Screening Call</span>
            </button>

            {candidate.interviewSlotId && (
              <button
                onClick={() => onStartCall(candidate, 'reminder')}
                className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reconfirm Attendance</span>
              </button>
            )}

            {candidate.status === 'Missed Interview - Followup' && (
              <button
                onClick={() => onStartCall(candidate, 'missed_followup')}
                className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Follow-up Missed</span>
              </button>
            )}

            {candidate.status === 'Callback Needed' && (
              <button
                onClick={() => onStartCall(candidate, 'callback_followup')}
                className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Take Callback</span>
              </button>
            )}

            {onOpenConfirmationMail && (candidate.interviewSlotId || candidate.status === 'Interview Scheduled' || candidate.status === 'Attendance Confirmed') && (
              <button
                onClick={() => onOpenConfirmationMail(candidate)}
                className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-3 py-2 rounded-lg text-xs font-semibold transition shadow-xs"
                title="Send official interview confirmation letter with Sector 67 venue details"
              >
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>Send Confirmation Mail</span>
                {candidate.lastEmailSentAt && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Email dispatched" />
                )}
              </button>
            )}

            {onOpenWhatsApp && (
              <button
                onClick={() => onOpenWhatsApp(
                  candidate, 
                  candidate.status === 'Missed Interview - Followup' 
                    ? 'missed_followup' 
                    : candidate.interviewSlotId 
                    ? 'interview_reminder' 
                    : 'unanswered'
                )}
                className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-2 rounded-lg text-xs font-semibold transition shadow-xs"
                title="Send WhatsApp message to candidate who did not answer call or needs interview reminder"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>Send WhatsApp Reminder</span>
                {candidate.lastWhatsAppSentAt && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="WhatsApp dispatched" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Drawer Content */}
        <div className="p-6 space-y-6">
          {/* Priority Remarks & Day-by-Day Alert Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-[#0d1629] border border-slate-800 shadow-md">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl border ${
                  candidate.alertDueDate === 'Overdue'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : candidate.alertDueDate === 'Today'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : candidate.alertDueDate === 'Tomorrow'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <span>Priority Remark & Day-by-Day Alert</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {candidate.alertDueDate ? `Alert Action Due: ${candidate.alertDueDate}` : 'No active due alert'}
                  </span>
                </div>
              </div>

              {/* Priority & Category Badges */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {candidate.latestRemark?.priority && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                    candidate.latestRemark.priority === 'Urgent'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                      : candidate.latestRemark.priority === 'High'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : candidate.latestRemark.priority === 'Medium'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {candidate.latestRemark.priority} Priority
                  </span>
                )}
                {candidate.latestRemark?.category && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-400" />
                    <span>{candidate.latestRemark.category}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Active Remark Text */}
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 leading-relaxed">
              <div className="text-[11px] font-bold text-amber-400 mb-1 flex items-center justify-between">
                <span>Latest Autonomous HR Remark:</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {candidate.latestRemark?.createdAt || candidate.lastCallDate || 'Recent'}
                </span>
              </div>
              <p className="text-slate-300">
                {candidate.latestRemark?.text || candidate.notes || 'Screening pending. Profile awaiting initial AI voice outreach.'}
              </p>
            </div>

            {/* Alert Detail Line */}
            {candidate.alertReason && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 px-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{candidate.alertReason}</span>
              </div>
            )}

            {/* Past Remarks History Accordion */}
            {candidate.remarksHistory && candidate.remarksHistory.length > 1 && (
              <div className="mt-3 pt-3 border-t border-slate-800/80">
                <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mb-2">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Previous Remarks History ({candidate.remarksHistory.length})</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                  {candidate.remarksHistory.slice(1).map((rem) => (
                    <div key={rem.id} className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                        <span className="font-semibold text-slate-300">{rem.category} ({rem.priority})</span>
                        <span>{rem.createdAt}</span>
                      </div>
                      <p className="text-slate-300 line-clamp-2">{rem.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 7 Mandatory Screening Items Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>White Collar Realty Screening Checklist (7 Data Points)</span>
              <span className="text-[11px] text-amber-400 font-normal">Automated Voice Extraction</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Item 1: Current Company & Designation */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. Company & Designation</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {s.currentCompany || 'Pending collection'}
                </div>
                <div className="text-xs text-slate-400">
                  {s.currentDesignation || 'Designation not stated yet'}
                </div>
              </div>

              {/* Item 2: Total & Real Estate Experience */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. Total & RE Experience</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {s.realEstateExperienceYears 
                    ? `${s.realEstateExperienceYears} Yrs Real Estate` 
                    : 'RE Exp: Not specified'}
                </div>
                <div className="text-xs text-slate-400">
                  {s.totalExperienceYears ? `${s.totalExperienceYears} Yrs Total Career` : 'Total Exp pending'}
                </div>
              </div>

              {/* Item 3: Gurgaon & Dubai Property Experience */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 sm:col-span-2">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>3. Gurgaon & Dubai Property Experience</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      s.gurgaonDubaiExperience?.gurgaon ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                    }`}>
                      Gurgaon: {s.gurgaonDubaiExperience?.gurgaon ? 'Yes' : 'No'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      s.gurgaonDubaiExperience?.dubai ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                    }`}>
                      Dubai: {s.gurgaonDubaiExperience?.dubai ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  {s.gurgaonDubaiExperience?.details || 'Candidate has not shared specific territory or developer details yet.'}
                </p>
              </div>

              {/* Item 4: Current & Expected CTC */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span>4. Present & Expected CTC</span>
                </div>
                <div className="text-sm font-semibold text-emerald-400">
                  {s.expectedSalaryLPA ? `Exp: ${s.expectedSalaryLPA}` : 'Expected: Pending'}
                </div>
                <div className="text-xs text-slate-400">
                  {s.currentSalaryLPA ? `Current: ${s.currentSalaryLPA}` : 'Current: Pending'}
                </div>
              </div>

              {/* Item 5: Location */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>5. Current Location</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {s.currentLocation || 'Location not recorded'}
                </div>
                <div className="text-xs text-slate-400">
                  Commute to Sector 67, Gurugram
                </div>
              </div>

              {/* Item 6: Notice Period & Earliest Joining */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>6. Notice Period & Joining</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {s.noticePeriodDays !== undefined ? `${s.noticePeriodDays} Days Notice` : 'Notice: Pending'}
                </div>
                <div className="text-xs text-slate-400">
                  {s.earliestJoiningDate ? `Earliest: ${s.earliestJoiningDate}` : 'Immediate / negotiable'}
                </div>
              </div>

              {/* Item 7: Interview Availability */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>7. F2F Interview Availability</span>
                </div>
                <div className="text-sm font-semibold text-amber-400">
                  {candidate.interviewTime 
                    ? `${candidate.interviewDate} (${candidate.interviewTime})`
                    : s.preferredInterviewSlot || 'Slot not selected'}
                </div>
                <div className="text-xs text-slate-400">
                  {candidate.interviewVenue ? 'Venue: Sector 67 HQ Confirmed' : 'Venue: Pending candidate agreement'}
                </div>
              </div>
            </div>
          </div>

          {/* Interview Booking Confirmation Card */}
          {candidate.interviewSlotId && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Confirmed Face-to-Face Interview
                    </h4>
                    <p className="text-xs text-amber-300 font-medium">
                      {candidate.interviewDate} • {candidate.interviewTime}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                  candidate.interviewStatus === 'Confirmed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {candidate.interviewStatus}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
                <strong className="text-slate-200">Office Location:</strong> {candidate.interviewVenue}
              </div>
            </div>
          )}

          {/* AI Scorecard & Fit Assessment */}
          {candidate.scorecard && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Screening Scorecard</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-800/60">
                  <div className="text-slate-400 text-[10px]">Gurgaon/Dubai Exp</div>
                  <div className="font-bold text-amber-400 mt-1">{candidate.scorecard.gurgaonDubaiScore}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60">
                  <div className="text-slate-400 text-[10px]">Experience Level</div>
                  <div className="font-bold text-white mt-1">{candidate.scorecard.experienceFit}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60">
                  <div className="text-slate-400 text-[10px]">Budget Alignment</div>
                  <div className="font-bold text-emerald-400 mt-1">{candidate.scorecard.budgetAlignment}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800/60">
                  <div className="text-slate-400 text-[10px]">Recommendation</div>
                  <div className="font-bold text-amber-400 mt-1">{candidate.scorecard.recommendation}</div>
                </div>
              </div>
            </div>
          )}

          {/* Call Logs & Transcripts */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Call Records & Voice Transcripts ({candidate.callHistory.length})</span>
            </h3>

            {candidate.callHistory.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-500">
                No calls recorded yet for this candidate. Click "Screening Call" to initiate the HR voice agent.
              </div>
            ) : (
              <div className="space-y-3">
                {candidate.callHistory.map((call) => (
                  <div
                    key={call.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase text-[11px] bg-slate-800 px-2 py-0.5 rounded">
                          {call.scenario} Call
                        </span>
                        <span className="text-slate-400">{call.timestamp}</span>
                      </div>
                      <span className="text-emerald-400 font-semibold">{call.outcome}</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-3">
                      {call.summary}
                    </p>

                    <button
                      onClick={() => setSelectedCall(selectedCall?.id === call.id ? null : call)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{selectedCall?.id === call.id ? 'Hide Full Transcript' : `View Full Transcript (${call.transcript.length} turns)`}</span>
                    </button>

                    {/* Expandable transcript */}
                    {selectedCall?.id === call.id && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 max-h-64 overflow-y-auto pr-1">
                        {call.transcript.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-2.5 rounded-lg text-xs ${
                              msg.sender === 'agent'
                                ? 'bg-amber-950/20 border border-amber-500/20 text-slate-200'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-[10px] text-slate-400 mb-1">
                              <span>{msg.sender === 'agent' ? 'Pooja (White Collar HR)' : candidate.name}</span>
                              <span>{msg.timestamp}</span>
                            </div>
                            <div>{msg.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
