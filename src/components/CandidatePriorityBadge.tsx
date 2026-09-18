import React from 'react';
import { Sparkles, Flame, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Candidate, CandidatePriorityLevel } from '../types';
import { calculateCandidatePriority } from '../utils/candidateAnalysisEngine';

interface CandidatePriorityBadgeProps {
  candidate: Candidate;
  compact?: boolean;
  showScore?: boolean;
}

export const CandidatePriorityBadge: React.FC<CandidatePriorityBadgeProps> = ({
  candidate,
  compact = false,
  showScore = true,
}) => {
  const priority = calculateCandidatePriority(candidate);

  const getBadgeStyle = (level: CandidatePriorityLevel) => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25',
          dot: 'bg-rose-400 animate-pulse',
          icon: Flame,
          label: 'Critical Priority',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25',
          dot: 'bg-amber-400',
          icon: Sparkles,
          label: 'High Priority',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-blue-500/15 text-blue-300 border-blue-500/40 hover:bg-blue-500/25',
          dot: 'bg-blue-400',
          icon: Clock,
          label: 'Medium Priority',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-slate-700/40 text-slate-300 border-slate-600/40 hover:bg-slate-700/60',
          dot: 'bg-slate-400',
          icon: CheckCircle,
          label: 'Standard',
        };
    }
  };

  const style = getBadgeStyle(priority.level);
  const IconComponent = style.icon;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${style.bg} transition-colors`}
        title={`Priority Score: ${priority.score}/100\nReasons:\n• ${priority.reasons.join('\n• ')}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span>{priority.level}</span>
        {showScore && <span className="opacity-75 font-mono text-[9px]">({priority.score})</span>}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${style.bg} transition-all cursor-help`}
      title={`Calculated Priority Score: ${priority.score}/100\n\nEvaluation Factors:\n• ${priority.reasons.join('\n• ')}`}
    >
      <IconComponent className="w-3.5 h-3.5" />
      <span>{style.label}</span>
      {showScore && (
        <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-black/40 font-mono text-white/90">
          {priority.score} pts
        </span>
      )}
    </div>
  );
};
