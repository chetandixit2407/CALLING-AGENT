import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, CheckCircle, ExternalLink, Download, 
  Clock, MapPin, User, RefreshCw, ShieldCheck, Plus, Sparkles, Send
} from 'lucide-react';
import { Candidate, GoogleCalendarEvent } from '../types';
import { 
  getSavedCalendarEvents, 
  autoScheduleGoogleCalendarInterview, 
  generateGoogleCalendarWebUrl, 
  downloadCandidateICSFile 
} from '../utils/googleCalendarService';

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onOpenGmailForCandidate?: (candidate: Candidate) => void;
}

export const GoogleCalendarSyncModal: React.FC<GoogleCalendarSyncModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onOpenGmailForCandidate,
}) => {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Filter candidates with scheduled interviews
  const scheduledCandidates = candidates.filter(
    (c) => (c.interviewDate && c.interviewTime) || c.status === 'Interview Scheduled' || c.status === 'Attendance Confirmed'
  );

  useEffect(() => {
    setEvents(getSavedCalendarEvents());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncAllSlots = async () => {
    setIsSyncingAll(true);
    for (const cand of scheduledCandidates) {
      await autoScheduleGoogleCalendarInterview(cand);
    }
    setEvents(getSavedCalendarEvents());
    setIsSyncingAll(false);
    setSyncToast(`Synced ${scheduledCandidates.length} confirmed interview slots to Google Calendar!`);
    setTimeout(() => setSyncToast(null), 3500);
  };

  const handleOpenGCal = (cand: Candidate) => {
    const url = generateGoogleCalendarWebUrl(cand);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-blue-500/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/15 border border-blue-500/40 rounded-xl text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Google Calendar Automated Interview Scheduler
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Auto-Sync Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically books Google Calendar slots for candidates confirmed by Virtual HR Recruiter & sends calendar invites.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Toast */}
        {syncToast && (
          <div className="px-6 py-2 bg-emerald-950/80 border-b border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{syncToast}</span>
            </div>
            <button onClick={() => setSyncToast(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60 space-y-5">
          {/* Action Overview Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Confirmed Interview Booking Slots ({scheduledCandidates.length} Active Candidates)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Venue: <strong>6th Floor, Tower A, M3M Urbana Business Park, Sector 67, Gurugram</strong>
              </p>
            </div>

            <button
              onClick={handleSyncAllSlots}
              disabled={isSyncingAll || scheduledCandidates.length === 0}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Scheduling...' : 'Auto-Sync All to Google Calendar'}</span>
            </button>
          </div>

          {/* Candidates List */}
          <div className="space-y-3">
            {scheduledCandidates.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No interview slots confirmed yet. Book slots during voice calls or from the Interview Schedule Tab.
              </div>
            ) : (
              scheduledCandidates.map((cand) => {
                const syncedEvent = events.find((e) => e.candidateId === cand.id);
                return (
                  <div
                    key={cand.id}
                    className="bg-slate-950 border border-slate-800 hover:border-blue-500/40 rounded-xl p-4 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{cand.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {cand.appliedRole}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {cand.email} • {cand.phone}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {syncedEvent ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Google Calendar Synced</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Slot Confirmed (Pending GCal Push)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-slate-300 font-medium">{cand.interviewDate || 'Date TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-slate-300 font-medium">{cand.interviewTime || '11:30 AM'}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="text-slate-300 truncate" title={cand.interviewVenue}>
                          {cand.interviewVenue || 'M3M Urbana HQ Sector 67'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span>Invites To:</span>
                        <strong className="text-slate-200">{cand.email}</strong>, 
                        <span className="text-slate-300">sachinkumarwcr@gmail.com</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => downloadCandidateICSFile(cand)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
                          title="Download standard .ics file"
                        >
                          <Download className="w-3 h-3 text-blue-400" />
                          <span>.ICS Invite</span>
                        </button>

                        <button
                          onClick={() => handleOpenGCal(cand)}
                          className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-semibold border border-blue-500/40 flex items-center gap-1.5 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open in Google Calendar</span>
                        </button>

                        {onOpenGmailForCandidate && (
                          <button
                            onClick={() => onOpenGmailForCandidate(cand)}
                            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/40 flex items-center gap-1.5 transition"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send Gmail Gate Pass</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Automatic invite alerts scheduled 24h & 1h before interview</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
