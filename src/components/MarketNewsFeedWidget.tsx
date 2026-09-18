import React, { useState } from 'react';
import { 
  Newspaper, Globe, TrendingUp, Sparkles, Building2, 
  MapPin, ShieldAlert, ChevronDown, ChevronUp, Copy, 
  Check, RefreshCw, HelpCircle, Flame, ExternalLink, BookmarkCheck
} from 'lucide-react';
import { REAL_ESTATE_MARKET_NEWS, MarketNewsItem } from '../data/marketNewsData';

interface MarketNewsFeedWidgetProps {
  onInsertNote?: (talkingPoint: string) => void;
  compact?: boolean;
}

export const MarketNewsFeedWidget: React.FC<MarketNewsFeedWidgetProps> = ({
  onInsertNote,
  compact = false,
}) => {
  const [news, setNews] = useState<MarketNewsItem[]>(REAL_ESTATE_MARKET_NEWS);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(REAL_ESTATE_MARKET_NEWS[0]?.id || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Just now');

  const filteredNews = news.filter((item) => {
    if (selectedRegion === 'All') return true;
    if (selectedRegion === 'Gurgaon' && item.region.includes('Gurgaon')) return true;
    if (selectedRegion === 'Dubai' && item.region.includes('Dubai')) return true;
    if (selectedRegion === 'Regulatory' && item.region.includes('Regulatory')) return true;
    if (selectedRegion === 'Salary' && item.region.includes('Salary')) return true;
    return true;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 600);
  };

  const handleCopyQuestions = (item: MarketNewsItem) => {
    const text = `[WCR Market Intelligence: ${item.title}]\nRecruiter Screening Questions:\n` +
      item.suggestedScreeningQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n') +
      `\nHiring Impact: ${item.impactOnHiring}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertTalkingPoint = (item: MarketNewsItem) => {
    const point = `[Market Knowledge Note - ${item.title}]: Assessed candidate on ${item.suggestedScreeningQuestions[0] || item.tags.join(', ')}.`;
    if (onInsertNote) {
      onInsertNote(point);
    }
    setInsertedId(item.id);
    setTimeout(() => setInsertedId(null), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-[#0b1322] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl shadow-amber-950/20 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white font-['Space_Grotesk'] tracking-tight flex items-center gap-1.5">
                <span>Gurgaon & Dubai Real Estate Market Pulse</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Recruiter Feed
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Real-time luxury market shifts, infra updates & recruiter screening conversation cheat-sheets
            </p>
          </div>
        </div>

        {/* Controls & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
            Updated: {lastRefreshed}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition active:scale-95 text-xs flex items-center gap-1"
            title="Refresh Live Market Feed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span className="text-[11px] font-medium hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Region Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'All', label: 'All Updates' },
          { id: 'Gurgaon', label: '🏙️ Gurgaon / NCR Luxury' },
          { id: 'Dubai', label: '🌴 Dubai & UAE Freehold' },
          { id: 'Regulatory', label: '⚖️ HRERA & Legal Norms' },
          { id: 'Salary', label: '💼 Salary & Brokerage Trends' },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setSelectedRegion(chip.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border ${
              selectedRegion === chip.id
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-xs'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* News Cards Grid */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {filteredNews.map((item) => {
          const isExpanded = expandedNewsId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-xl border transition-all duration-200 ${
                isExpanded
                  ? 'bg-slate-950 border-amber-500/50 shadow-md'
                  : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800/90'
              }`}
            >
              {/* Card Summary Header */}
              <div
                onClick={() => setExpandedNewsId(isExpanded ? null : item.id)}
                className="p-3 sm:p-3.5 flex items-start justify-between gap-3 cursor-pointer select-none"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      item.region.includes('Dubai')
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : item.region.includes('Regulatory')
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    }`}>
                      {item.region}
                    </span>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span className="text-[10px] text-slate-400 font-medium">{item.category}</span>
                    {item.isHot && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/30">
                        <Flame className="w-2.5 h-2.5 fill-rose-400" /> Hot Pulse
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono ml-auto">{item.publishedAt}</span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {item.title}
                  </h4>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>

                <button
                  type="button"
                  className="text-slate-400 hover:text-white p-1 rounded-md bg-slate-900 border border-slate-800 mt-1 shrink-0"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {/* Expanded Screening Deep Dive */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80 space-y-3 text-xs animate-in fade-in duration-150">
                  {/* Hiring Impact */}
                  <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Recruiter Hiring Strategy & Context:</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {item.impactOnHiring}
                    </p>
                  </div>

                  {/* Suggested Screening Questions */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-[11px] flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                        <span>Recommended Candidate Screening Questions:</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Ask during call</span>
                    </div>

                    <ul className="space-y-1.5">
                      {item.suggestedScreeningQuestions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/60">
                          <span className="text-amber-400 font-mono font-bold shrink-0">{idx + 1}.</span>
                          <span className="leading-relaxed">{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tags and Action Bar */}
                  <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyQuestions(item)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium border border-slate-700 flex items-center gap-1 transition"
                        title="Copy screening cheat-sheet"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy Questions</span>
                          </>
                        )}
                      </button>

                      {onInsertNote && (
                        <button
                          onClick={() => handleInsertTalkingPoint(item)}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-semibold border border-amber-500/40 flex items-center gap-1 transition"
                          title="Save as standard screening note"
                        >
                          {insertedId === item.id ? (
                            <>
                              <BookmarkCheck className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Noted</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>Insert into Notes</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
