import { Candidate, ChatMessage, CandidateNoteSnippet, ScreeningData, InterviewSlot } from '../types';

export interface GenerateSnippetParams {
  candidate: Candidate;
  transcript: ChatMessage[];
  durationSeconds: number;
  scenario?: string;
  screening?: Partial<ScreeningData>;
  detectedIntent?: string;
  outcome?: string;
  bookedSlot?: InterviewSlot | null;
  agentName?: string;
  geminiBulletedRequirements?: string | string[];
  geminiSummary?: string;
  candidateRequirements?: Record<string, any>;
  geminiHighlights?: string[];
}

/**
 * Transcript Summary Extraction:
 * Analyzes call duration, conversation turns, screening data points,
 * and extracts Gemini-powered speech-to-text bulleted candidate requirements.
 */
export function generateStructuredCallSnippet({
  candidate,
  transcript,
  durationSeconds,
  scenario = 'screening',
  screening = {},
  detectedIntent,
  outcome,
  bookedSlot,
  agentName = 'Arjun AI (Voice Recruiter)',
  geminiBulletedRequirements,
  geminiSummary,
  candidateRequirements,
  geminiHighlights,
}: GenerateSnippetParams): CandidateNoteSnippet {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const durationText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  // Merge candidate's existing screening with any newly extracted during call
  const s: Partial<ScreeningData> = {
    ...(candidate.screening || {}),
    ...screening,
  };

  const turns = transcript.length;
  const candidateTurns = transcript.filter((t) => t.sender === 'candidate');

  // Extract key candidate quotes / statements
  const notableStatements = candidateTurns
    .map((t) => t.text.trim())
    .filter((txt) => txt.length > 15 && !txt.match(/^(yes|no|haan|theek hai|hello|ok)\.?$/i))
    .slice(0, 2);

  const lines: string[] = [];

  const headerTitle = `[${agentName} • ${dateStr}, ${timeStr}]`;
  lines.push(headerTitle);

  // Outcome line
  const displayOutcome = outcome || (bookedSlot ? 'Face-to-Face Interview Scheduled' : 'Voice Screening Complete');
  lines.push(`• Outcome: ${displayOutcome} (${scenario.replace('_', ' ').toUpperCase()} call)`);

  // Call metrics
  lines.push(`• Duration: ${durationText} | Turns: ${turns} total (${candidateTurns.length} candidate speech responses)`);

  // Format Gemini-generated bulleted requirements from speech transcript
  if (geminiBulletedRequirements) {
    const formattedReqs = Array.isArray(geminiBulletedRequirements)
      ? geminiBulletedRequirements.join('\n')
      : geminiBulletedRequirements.trim();

    lines.push('');
    lines.push('📋 KEY CANDIDATE REQUIREMENTS (Gemini AI Speech-to-Text Analysis):');
    lines.push(formattedReqs);
  } else if (geminiSummary) {
    lines.push('');
    lines.push(`📋 Gemini Executive Summary: ${geminiSummary}`);
  }

  // Key Highlights Badges if available
  if (geminiHighlights && geminiHighlights.length > 0) {
    lines.push(`• Key Highlights: [${geminiHighlights.join('] • [')}]`);
  }

  // Key Screening Data Points
  const screeningBulletPoints: string[] = [];
  if (s.currentCompany || s.currentDesignation) {
    screeningBulletPoints.push(
      `Role: ${s.currentDesignation || 'Consultant'} at ${s.currentCompany || 'Real Estate Firm'}`
    );
  }
  if (s.totalExperienceYears !== undefined || s.realEstateExperienceYears !== undefined) {
    const reExp = s.realEstateExperienceYears !== undefined ? `${s.realEstateExperienceYears} yrs RE` : '';
    const totExp = s.totalExperienceYears !== undefined ? `${s.totalExperienceYears} yrs total` : '';
    screeningBulletPoints.push(`Experience: ${[reExp, totExp].filter(Boolean).join(' / ')}`);
  }
  if (s.gurgaonDubaiExperience) {
    const gd: string[] = [];
    if (s.gurgaonDubaiExperience.gurgaon) gd.push('Gurgaon: Yes');
    if (s.gurgaonDubaiExperience.dubai) gd.push('Dubai: Yes');
    if (gd.length > 0) {
      screeningBulletPoints.push(`Market Experience: ${gd.join(', ')}`);
    }
  }
  if (s.currentSalaryLPA || s.expectedSalaryLPA) {
    const cur = s.currentSalaryLPA ? `Current: ${s.currentSalaryLPA} LPA` : '';
    const exp = s.expectedSalaryLPA ? `Expected: ${s.expectedSalaryLPA} LPA` : '';
    screeningBulletPoints.push(`CTC: ${[cur, exp].filter(Boolean).join(' | ')}`);
  }
  if (s.noticePeriodDays !== undefined || s.earliestJoiningDate) {
    const np = s.noticePeriodDays !== undefined ? `${s.noticePeriodDays} days notice` : '';
    const join = s.earliestJoiningDate ? `Join: ${s.earliestJoiningDate}` : '';
    screeningBulletPoints.push(`Availability: ${[np, join].filter(Boolean).join(', ')}`);
  }
  if (s.currentLocation) {
    screeningBulletPoints.push(`Location: ${s.currentLocation} (Sector 67 Gurugram commute)`);
  }

  if (screeningBulletPoints.length > 0) {
    lines.push('');
    lines.push('• Verified Screening Facts:');
    screeningBulletPoints.forEach((pt) => lines.push(`   - ${pt}`));
  }

  // Statements
  if (notableStatements.length > 0) {
    lines.push('• Notable Spoken Statements:');
    notableStatements.forEach((stmt) => lines.push(`   "${stmt}"`));
  }

  // Next action / interview slot
  if (bookedSlot) {
    lines.push(`• Next Step: Face-to-Face Interview confirmed for ${bookedSlot.displayLabel} at Sector 67 Gurugram HQ.`);
  } else if (detectedIntent === 'request_callback') {
    lines.push(`• Next Step: Priority callback requested. Automated reminder set.`);
  } else if (detectedIntent === 'already_joined_negotiation') {
    lines.push(`• Next Step: Joined competitor recently. Presented White Collar compensation package.`);
  } else {
    lines.push(`• Next Step: Recruiter review & scheduling face-to-face round at Sector 67 HQ.`);
  }

  const snippetText = lines.join('\n');

  return {
    id: `snippet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: `${dateStr} at ${timeStr}`,
    title: `${scenario.replace('_', ' ').toUpperCase()} • ${displayOutcome}`,
    snippet: snippetText,
    callScenario: scenario,
    durationSeconds,
    author: agentName,
  };
}

/**
 * Auto-Save Flow: Automatically prepends new call summary snippets to the candidate's
 * notes field upon call termination in both the web voice stream and the Vapi live call modal.
 */
export function applyAutoSavedNotesToCandidate(
  candidate: Candidate,
  snippet: CandidateNoteSnippet
): Candidate {
  const existingNotes = (candidate.notes || '').trim();
  const newNotes = existingNotes
    ? `${snippet.snippet}\n\n----------------------------------------\n\n${existingNotes}`
    : snippet.snippet;

  const existingHistory = candidate.notesHistory || [];
  const updatedHistory = [snippet, ...existingHistory];

  return {
    ...candidate,
    notes: newNotes,
    notesHistory: updatedHistory,
    lastNotesAutoSavedAt: new Date().toISOString(),
  };
}
