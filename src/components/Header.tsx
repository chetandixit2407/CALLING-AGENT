import React from 'react';
import { PhoneCall, Building2, Globe, ShieldCheck, Sparkles, Plus } from 'lucide-react';
import { Candidate } from '../types';

interface HeaderProps {
  onNewCandidate: () => void;
  onQuickStartCall: () => void;
  activeCandidateCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onNewCandidate,
  onQuickStartCall,
  activeCandidateCount,
}) => {
  return (
    <header className="bg-[#0f172a] border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Brand & Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-['Space_Grotesk']">
                  WHITE COLLAR <span className="text-amber-400 font-normal">REALTY</span>
                </span>
                <span className="px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Virtual HR AI
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Gurgaon & Dubai Luxury Real Estate Advisory</span>
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Agent Pooja Online
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Meta */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="hidden md:flex items-center text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <Globe className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              <span>Languages: <strong className="text-slate-200">Hindi, English, Hinglish</strong></span>
            </div>

            <button
              id="btn-add-dummy-candidate"
              onClick={onNewCandidate}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Candidate</span>
            </button>

            <button
              id="btn-quick-call-start"
              onClick={onQuickStartCall}
              className="inline-flex items-center gap-2 text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-4 py-2 rounded-lg shadow-md shadow-amber-500/20 transition active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Start Voice Screening</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
