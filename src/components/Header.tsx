import React from 'react';
import { 
  PhoneCall, PhoneOff, Building2, Globe, Plus, RefreshCw, 
  Users, Mail, FileSpreadsheet, Briefcase, Database, Upload, Download,
  Calendar, Newspaper, HeartPulse
} from 'lucide-react';
import { Candidate } from '../types';
import { VapiCallStatus } from '../utils/vapiService';

interface HeaderProps {
  onNewCandidate: () => void;
  onQuickStartCall: () => void;
  onStartInteractiveCall?: () => void;
  onEndCall?: () => void;
  onOpenTeamModal?: () => void;
  onOpenGoogleSheetsModal?: () => void;
  onOpenCareerRolesModal?: () => void;
  onOpenDataImportExportModal?: () => void;
  onOpenGoogleCalendarModal?: () => void;
  onOpenGmailModal?: () => void;
  onToggleMarketNews?: () => void;
  isMarketNewsOpen?: boolean;
  teamEmailCount?: number;
  careerRolesCount?: number;
  isSheetsSyncing?: boolean;
  vapiCallStatus?: VapiCallStatus;
  activeCandidateCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onNewCandidate,
  onQuickStartCall,
  onStartInteractiveCall,
  onEndCall,
  onOpenTeamModal,
  onOpenGoogleSheetsModal,
  onOpenCareerRolesModal,
  onOpenDataImportExportModal,
  onOpenGoogleCalendarModal,
  onOpenGmailModal,
  onToggleMarketNews,
  isMarketNewsOpen = false,
  teamEmailCount = 4,
  careerRolesCount = 6,
  isSheetsSyncing = false,
  vapiCallStatus = 'idle',
  activeCandidateCount,
}) => {
  return (
    <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Brand & Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30 shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white font-['Space_Grotesk']">
                  WHITE COLLAR <span className="text-amber-400 font-normal">REALTY</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Virtual HR AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Gurgaon & Dubai Luxury Real Estate</span>
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Arjun AI Active
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Market News Feed Button */}
            {onToggleMarketNews && (
              <button
                id="btn-market-news"
                onClick={onToggleMarketNews}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition active:scale-95 shadow-xs ${
                  isMarketNewsOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-850 hover:bg-slate-800 text-amber-300 border-amber-500/30'
                }`}
                title="Live real estate market updates for Gurgaon & Dubai"
              >
                <Newspaper className="w-3.5 h-3.5 text-amber-400" />
                <span>Market News</span>
              </button>
            )}

            {/* Google Calendar Automated Scheduler */}
            {onOpenGoogleCalendarModal && (
              <button
                id="btn-google-calendar-sync"
                onClick={onOpenGoogleCalendarModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-300 px-3 py-2 rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition active:scale-95 shadow-xs"
                title="Google Calendar background interview scheduler"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Google Calendar</span>
              </button>
            )}

            {/* Gmail Sequence & Call Letter Button */}
            {onOpenGmailModal && (
              <button
                id="btn-gmail-sequence"
                onClick={onOpenGmailModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 px-3 py-2 rounded-lg border border-indigo-500/30 hover:border-indigo-400/50 transition active:scale-95 shadow-xs"
                title="Automated Gmail interview call letters & sequences"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gmail Sequences</span>
              </button>
            )}

            {/* Google Sheets Sync Button */}
            {onOpenGoogleSheetsModal && (
              <button
                id="btn-google-sheets-sync"
                onClick={onOpenGoogleSheetsModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 px-3 py-2 rounded-lg border border-emerald-500/40 transition active:scale-95 shadow-xs"
                title="Continuous Google Sheets sync for HR reporting"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sheets Sync</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}

            {/* Career Roles Manager (whitecollarrealty.com/career) */}
            {onOpenCareerRolesModal && (
              <button
                id="btn-career-roles"
                onClick={onOpenCareerRolesModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-300 px-3 py-2 rounded-lg border border-blue-500/30 hover:border-blue-400/50 transition active:scale-95 shadow-xs"
                title="Manage career openings from whitecollarrealty.com/career"
              >
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>Career Roles</span>
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                  {careerRolesCount}
                </span>
              </button>
            )}

            {/* Import / Export / Deduplicate Candidate Data */}
            {onOpenDataImportExportModal && (
              <button
                id="btn-import-export-data"
                onClick={onOpenDataImportExportModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-purple-300 px-3 py-2 rounded-lg border border-purple-500/30 hover:border-purple-400/50 transition active:scale-95 shadow-xs"
                title="Import, deduplicate & clean candidate ATS records"
              >
                <Database className="w-3.5 h-3.5 text-purple-400" />
                <span>Data Clean / Merge</span>
              </button>
            )}

            <button
              id="btn-add-dummy-candidate"
              onClick={onNewCandidate}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>

            {/* Vapi Call State Button Group */}
            {vapiCallStatus === 'connecting' && (
              <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-medium text-amber-300">Connecting Vapi...</span>
              </div>
            )}

            {vapiCallStatus === 'active' && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-300">Live Voice Call</span>
                </div>
                {onEndCall && (
                  <button
                    onClick={onEndCall}
                    className="inline-flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md shadow-rose-900/30 transition cursor-pointer"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>End</span>
                  </button>
                )}
              </div>
            )}

            {vapiCallStatus === 'ended' && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl">
                <span className="text-xs font-medium text-slate-400">Call Ended</span>
              </div>
            )}

            {vapiCallStatus === 'idle' && (
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-interactive-screening-call"
                  onClick={onStartInteractiveCall}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Start Voice Screening</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
