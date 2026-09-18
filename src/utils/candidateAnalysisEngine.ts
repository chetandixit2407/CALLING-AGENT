import { Candidate, CandidateCalculatedPriority, CandidateAnalysisSummary, CandidatePriorityLevel, CareerJobOpening } from '../types';

/**
 * Calculates a quantitative Priority Score (0 - 100) and Priority Level
 * based on interview status, pipeline velocity, Gurgaon/Dubai experience, notice period, and responsiveness.
 */
export function calculateCandidatePriority(candidate: Candidate): CandidateCalculatedPriority {
  let score = 30; // base score
  const reasons: string[] = [];

  const screening = candidate.screening || {};
  const status = candidate.status;
  const isScheduled = !!(candidate.interviewDate || candidate.interviewSlotId || status === 'Interview Scheduled' || status === 'Attendance Confirmed');
  const alertDue = candidate.alertDueDate;

  // 1. Interview Schedule Proximity (+30 to +40 points)
  if (status === 'Attendance Confirmed') {
    score += 40;
    reasons.push('Confirmed interview attendance (+40)');
  } else if (status === 'Interview Scheduled') {
    score += 35;
    reasons.push('Interview booked and scheduled (+35)');
  } else if (status === 'Screened - Ready for Interview') {
    score += 25;
    reasons.push('Screened & ready for slot selection (+25)');
  }

  // Proximity to interview or overdue action
  if (alertDue === 'Today') {
    score += 15;
    reasons.push('Action/Interview due TODAY (+15)');
  } else if (alertDue === 'Overdue') {
    score += 20;
    reasons.push('Overdue HR follow-up required (+20)');
  } else if (alertDue === 'Tomorrow') {
    score += 10;
    reasons.push('Interview due tomorrow (+10)');
  }

  // 2. Real Estate & Market Exposure (+10 to +25 points)
  const reExp = screening.realEstateExperienceYears || 0;
  if (reExp >= 3) {
    score += 20;
    reasons.push(`Strong Real Estate experience: ${reExp} yrs (+20)`);
  } else if (reExp >= 1.5) {
    score += 12;
    reasons.push(`Relevant Real Estate exp: ${reExp} yrs (+12)`);
  }

  if (screening.gurgaonDubaiExperience?.gurgaon) {
    score += 10;
    reasons.push('Active Gurugram luxury corridor exposure (+10)');
  }
  if (screening.gurgaonDubaiExperience?.dubai) {
    score += 8;
    reasons.push('Dubai international market exposure (+8)');
  }

  // 3. Notice Period & Immediate Availability (+5 to +15 points)
  const notice = screening.noticePeriodDays ?? 30;
  if (notice <= 7 || screening.earliestJoiningDate?.toLowerCase().includes('immediate')) {
    score += 15;
    reasons.push('Immediate joiner (<= 7 days) (+15)');
  } else if (notice <= 15) {
    score += 8;
    reasons.push('Short notice period (<= 15 days) (+8)');
  } else if (notice > 45) {
    score -= 10;
    reasons.push('Long notice period (> 45 days) (-10)');
  }

  // 4. Penalty for non-responsive / declining
  if (candidate.unansweredAttempts >= 3) {
    score -= 25;
    reasons.push(`3+ unanswered call attempts (-25)`);
  } else if (candidate.unansweredAttempts === 2) {
    score -= 10;
    reasons.push(`2 unanswered call attempts (-10)`);
  }

  if (status === 'Declined - Do Not Call') {
    score = 5;
    reasons.length = 0;
    reasons.push('Candidate declined or opted out');
  }

  // Clamp score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, score));

  let level: CandidatePriorityLevel = 'LOW';
  if (normalizedScore >= 75) {
    level = 'CRITICAL';
  } else if (normalizedScore >= 55) {
    level = 'HIGH';
  } else if (normalizedScore >= 35) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  return {
    level,
    score: normalizedScore,
    reasons,
  };
}

/**
 * Generates an executive, actionable HR Conversation Summary based on candidate
 * call records, screening answers, and qualification metrics.
 */
export function generateCandidateHRAnalysisSummary(candidate: Candidate): CandidateAnalysisSummary {
  const screening = candidate.screening || {};
  const strengths: string[] = [];
  const redFlags: string[] = [];

  // Evaluate Strengths
  const reExp = screening.realEstateExperienceYears || 0;
  if (reExp >= 2) {
    strengths.push(`${reExp}+ years of direct Real Estate sales and client negotiation experience.`);
  }

  if (screening.gurgaonDubaiExperience?.gurgaon) {
    strengths.push('Proven track record in Gurugram luxury micro-markets (Golf Course Ext., SPR, Dwarka Exp).');
  }

  if (screening.gurgaonDubaiExperience?.dubai) {
    strengths.push('Cross-border Dubai off-plan & freehold luxury closing experience.');
  }

  if (screening.noticePeriodDays && screening.noticePeriodDays <= 15) {
    strengths.push(`Available on rapid turnaround: ${screening.noticePeriodDays} days notice period.`);
  }

  if (screening.currentCompany) {
    strengths.push(`Relevant pedigree from ${screening.currentCompany}.`);
  }

  if (strengths.length === 0) {
    strengths.push('Enthusiastic property advisory profile with good verbal communication.');
  }

  // Evaluate Red Flags / Cautionary Points
  if (screening.noticePeriodDays && screening.noticePeriodDays > 45) {
    redFlags.push(`Long notice period of ${screening.noticePeriodDays} days may risk offer drop-off.`);
  }

  if (reExp < 1 && candidate.appliedRole.includes('Manager')) {
    redFlags.push('Limited managerial real estate tenure for a Senior/Lead position.');
  }

  if (candidate.unansweredAttempts >= 2) {
    redFlags.push(`${candidate.unansweredAttempts} call attempts were unanswered before contact.`);
  }

  if (!screening.gurgaonDubaiExperience?.gurgaon && !screening.gurgaonDubaiExperience?.dubai) {
    redFlags.push('No direct prior Gurugram/Dubai inventory knowledge; will require product orientation.');
  }

  if (redFlags.length === 0) {
    redFlags.push('No critical red flags observed during AI telephonic screening.');
  }

  // Market Fit summary
  const gurgaonMarketFit = screening.gurgaonDubaiExperience?.gurgaon
    ? 'High: Strong familiarity with Tier-1 Gurugram developers (DLF, M3M, Godrej, SmartWorld).'
    : screening.gurgaonDubaiExperience?.dubai
    ? 'High (International): Strong Dubai developer connections (Emaar, Sobha, Damac).'
    : 'Moderate: Requires product orientation for M3M Urbana & Gurugram corridors.';

  // CTC Fit summary
  const curr = screening.currentSalaryLPA || 'Undisclosed';
  const exp = screening.expectedSalaryLPA || 'Negotiable';
  const ctcFit = `Current: ${curr} | Expected: ${exp}. Standard compensation bracket fit.`;

  // Notice Period Fit
  const noticePeriodFit = screening.noticePeriodDays
    ? `${screening.noticePeriodDays} Days (${screening.noticePeriodDays <= 15 ? 'Excellent' : screening.noticePeriodDays <= 30 ? 'Acceptable' : 'Caution'})`
    : 'Immediate / In Discussion';

  // Action Recommendation
  let hrActionRecommendation = 'Schedule face-to-face round with Sales Director at M3M Urbana office.';
  if (candidate.status === 'Attendance Confirmed' || candidate.status === 'Interview Scheduled') {
    hrActionRecommendation = `Prepare candidate folder & panel dossier for ${candidate.interviewDate || 'scheduled slot'} at M3M Urbana HQ.`;
  } else if (candidate.status === 'Callback Needed') {
    hrActionRecommendation = `Automated retry scheduled for ${candidate.callbackTime || 'callback window'}.`;
  } else if (candidate.unansweredAttempts >= 3) {
    hrActionRecommendation = 'Trigger WhatsApp follow-up link and flag for second-tier queue.';
  }

  return {
    strengths,
    redFlags,
    gurgaonMarketFit,
    ctcFit,
    noticePeriodFit,
    hrActionRecommendation,
    generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };
}

/**
 * Generates automated alert copy for HR & Candidate
 */
export function generateAutomatedAlerts(candidate: Candidate) {
  const isScheduled = !!(candidate.interviewDate && candidate.interviewTime);
  const venue = '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101';
  
  const candidateWhatsAppAlert = isScheduled
    ? `Dear ${candidate.name}, your interview for ${candidate.appliedRole} at White Collar Realty is confirmed on ${candidate.interviewDate} at ${candidate.interviewTime}.\nVenue: ${venue}.\nGoogle Maps: https://maps.google.com/?q=M3M+Urbana+Business+Park\nContact HR Desk: +91 98765 43210.`
    : `Hi ${candidate.name}, this is from White Collar Realty HR. We screened your application for ${candidate.appliedRole}. Please choose an interview slot at: https://whitecollarrealty.com/career or reply to this message.`;

  const hrCalendarSummary = `Interview: ${candidate.name} (${candidate.appliedRole})\nPhone: ${candidate.phone}\nExp: ${candidate.screening?.totalExperienceYears || 0} yrs (Real Estate: ${candidate.screening?.realEstateExperienceYears || 0} yrs)\nCurrent: ${candidate.screening?.currentCompany || 'N/A'}\nStatus: Confirmed at M3M Urbana HQ`;

  return {
    candidateWhatsAppAlert,
    hrCalendarSummary,
  };
}
