import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Bot, User, ArrowDown, Sparkles, CheckCircle2 } from 'lucide-react';
import { ChatMessage } from '../types';

interface TranscriptChatViewProps {
  transcript: ChatMessage[];
  candidateName: string;
  agentLabel?: string;
  maxHeightClass?: string;
  className?: string;
  showJumpToLatest?: boolean;
}

export const TranscriptChatView: React.FC<TranscriptChatViewProps> = ({
  transcript,
  candidateName,
  agentLabel = 'Arjun (White Collar HR)',
  maxHeightClass = 'max-h-80',
  className = '',
  showJumpToLatest = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior, block: 'end' });
    } else if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  // Immediate synchronous scroll on mount/render so the latest message is visible immediately without delay
  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    // Also schedule on next tick in case layout fonts/images settle
    const timer = setTimeout(() => {
      scrollToBottom('auto');
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  // Smooth scroll when transcript length increases or updates
  useEffect(() => {
    scrollToBottom('smooth');
  }, [transcript.length]);

  // Monitor scroll position to show/hide "Jump to latest" button
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsAtBottom(distanceFromBottom < 40);
  };

  if (!transcript || transcript.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-center italic">
        No conversation messages logged in this transcript.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scrollable Container with auto-scroll */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`space-y-2.5 overflow-y-auto pr-1.5 scroll-smooth ${maxHeightClass} ${className}`}
      >
        {transcript.map((msg, index) => {
          const isAgent = msg.sender === 'agent';
          const isLatestMessage = index === transcript.length - 1;

          return (
            <div
              key={msg.id || index}
              className={`p-3 rounded-xl text-xs transition border ${
                isAgent
                  ? 'bg-amber-950/20 border-amber-500/25 text-slate-200 shadow-sm'
                  : 'bg-slate-800/90 border-slate-700/60 text-slate-200'
              } ${isLatestMessage ? 'ring-1 ring-amber-400/40' : ''}`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span className={isAgent ? 'text-amber-300 flex items-center gap-1.5' : 'text-slate-300 flex items-center gap-1.5'}>
                  {isAgent ? (
                    <Bot className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span>{isAgent ? agentLabel : candidateName}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  {isLatestMessage && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Latest
                    </span>
                  )}
                  {msg.timestamp && (
                    <span className="font-mono text-[9px] text-slate-500">{msg.timestamp}</span>
                  )}
                </div>
              </div>

              <div className="leading-relaxed whitespace-pre-wrap">{msg.text}</div>
            </div>
          );
        })}

        {/* Bottom anchor for scrolling */}
        <div ref={bottomRef} className="h-0.5" />
      </div>

      {/* Floating "Jump to Latest Message" button if user scrolls up */}
      {showJumpToLatest && !isAtBottom && transcript.length > 3 && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-2 right-4 px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-lg flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer z-10 border border-amber-400"
          title="Scroll down to latest message"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Latest Message</span>
        </button>
      )}
    </div>
  );
};
