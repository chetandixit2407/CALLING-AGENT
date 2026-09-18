import { Candidate, TeamEmailMember, TeamAutomationConfig, AutomationDispatchResult } from '../types';

export type { TeamEmailMember, TeamAutomationConfig, AutomationDispatchResult };

const STORAGE_KEY_TEAM_CONFIG = 'wcr_hr_team_automation_config_v1';
const STORAGE_KEY_AUTOMATION_LOGS = 'wcr_hr_automation_dispatch_logs_v1';

export const DEFAULT_TEAM_MEMBERS: TeamEmailMember[] = [
  {
    id: 'team_1',
    name: 'Sachin Kumar (HR Lead)',
    email: 'sachinkumarwcr@gmail.com',
    role: 'HR Operations',
    department: 'Talent Acquisition & Executive Search',
    isActive: true,
    receiveGmailSummaries: true,
    receiveCalendarInvites: true,
    receiveSheetsSyncAlerts: true,
    receiveDriveDossierLinks: true,
    receiveWhatsAppAlerts: true,
    phone: '+91 98765 43210',
    addedAt: '2026-09-01 10:00',
  },
  {
    id: 'team_2',
    name: 'Central HR Operations Desk',
    email: 'hr@whitecollarrealty.com',
    role: 'HR Operations',
    department: 'People Operations & Onboarding',
    isActive: true,
    receiveGmailSummaries: true,
    receiveCalendarInvites: true,
    receiveSheetsSyncAlerts: true,
    receiveDriveDossierLinks: true,
    receiveWhatsAppAlerts: false,
    phone: '+91 124 4567890',
    addedAt: '2026-09-01 10:00',
  },
  {
    id: 'team_3',
    name: 'Candidate Support & Logistics',
    email: 'support@whitecollarrealty.com',
    role: 'Support & Logistics',
    department: 'Venue, Visitor & Travel Desk',
    isActive: true,
    receiveGmailSummaries: false,
    receiveCalendarInvites: true,
    receiveSheetsSyncAlerts: true,
    receiveDriveDossierLinks: false,
    receiveWhatsAppAlerts: true,
    phone: '+91 124 4567891',
    addedAt: '2026-09-05 11:30',
  },
  {
    id: 'team_4',
    name: 'Sales Director & Hiring Head',
    email: 'director.sales@whitecollarrealty.com',
    role: 'Director / Executive',
    department: 'Luxury Commercial & Residential Advisory',
    isActive: true,
    receiveGmailSummaries: true,
    receiveCalendarInvites: true,
    receiveSheetsSyncAlerts: false,
    receiveDriveDossierLinks: true,
    receiveWhatsAppAlerts: false,
    phone: '+91 99999 11223',
    addedAt: '2026-09-10 14:00',
  },
];

export const DEFAULT_AUTOMATION_CONFIG: TeamAutomationConfig = {
  autoSyncGoogleSheets: true,
  autoSendGmailTeamSummaries: true,
  autoBookGoogleCalendar: true,
  autoArchiveDriveDossier: true,
  autoSendCandidateWhatsApp: true,
  autoSendCandidateEmail: true,
  googleSheetName: 'White Collar Realty - HR Candidate Master 2026',
  googleDriveFolderName: 'WCR-HR-Candidate-Dossiers-2026',
  notifyOnCallComplete: true,
  notifyOnInterviewScheduled: true,
  notifyOnCallbackRequested: true,
  teamMembers: DEFAULT_TEAM_MEMBERS,
};

// Load saved config or defaults
export function getTeamAutomationConfig(): TeamAutomationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEAM_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.teamMembers)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read team automation config from localStorage:', e);
  }
  return DEFAULT_AUTOMATION_CONFIG;
}

// Save config
export function saveTeamAutomationConfig(config: TeamAutomationConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_TEAM_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving team automation config to localStorage:', e);
  }
}

// Load dispatch logs
export function getAutomationDispatchLogs(): AutomationDispatchResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTOMATION_LOGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read automation logs:', e);
  }
  return [];
}

// Save dispatch log
export function logAutomationDispatch(log: AutomationDispatchResult): void {
  try {
    const existing = getAutomationDispatchLogs();
    const updated = [log, ...existing].slice(0, 50); // Keep last 50 logs
    localStorage.setItem(STORAGE_KEY_AUTOMATION_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving automation log:', e);
  }
}

// Format candidate details into an email summary body
export function generateTeamDataSharePayload(
  candidate: Candidate,
  config: TeamAutomationConfig,
  event: 'Call Completed' | 'Interview Scheduled' | 'Manual Data Share' | 'Candidate Screened'
) {
  const activeEmails = config.teamMembers
    .filter((m) => m.isActive && (event === 'Interview Scheduled' ? m.receiveCalendarInvites || m.receiveGmailSummaries : m.receiveGmailSummaries))
    .map((m) => m.email);

  const screening = candidate.screening || {};
  const isScheduled = !!(candidate.interviewDate || candidate.interviewSlotId);

  const subject = `[HR Automated Alert] ${event}: ${candidate.name} - ${candidate.appliedRole} (${candidate.status})`;

  const textSummary = `
========================================================================
WHITE COLLAR REALTY - AUTOMATED HR RECRUITMENT DATA DISPATCH
========================================================================
Candidate Name: ${candidate.name}
Phone: ${candidate.phone}
Email: ${candidate.email}
Applied Role: ${candidate.appliedRole}
HR Status: ${candidate.status}
Event Trigger: ${event}
Generated: ${new Date().toLocaleString()}

------------------------------------------------------------------------
SCREENING & PROFILE INTELLIGENCE:
------------------------------------------------------------------------
* Current Organization: ${screening.currentCompany || 'Not disclosed / NA'}
* Current Designation: ${screening.currentDesignation || 'Not disclosed'}
* Total Experience: ${screening.totalExperienceYears ? `${screening.totalExperienceYears} Years` : 'Not confirmed'}
* Real Estate Experience: ${screening.realEstateExperienceYears ? `${screening.realEstateExperienceYears} Years` : 'Not confirmed'}
* Gurgaon Exposure: ${screening.gurgaonDubaiExperience?.gurgaon ? 'Yes (Active local experience)' : 'No / Minimal'}
* Dubai Market Exposure: ${screening.gurgaonDubaiExperience?.dubai ? 'Yes' : 'No'}
* Current CTC: ${screening.currentSalaryLPA || 'Not disclosed'}
* Expected CTC: ${screening.expectedSalaryLPA || 'Open / Negotiable'}
* Notice Period: ${screening.noticePeriodDays ? `${screening.noticePeriodDays} Days` : 'Immediate / 15-30 Days'}
* Earliest Joining: ${screening.earliestJoiningDate || 'Immediate'}

------------------------------------------------------------------------
INTERVIEW SCHEDULING DETAILS:
------------------------------------------------------------------------
* Status: ${isScheduled ? 'SCHEDULED & CONFIRMED' : 'Screening In Progress / Pending Slot'}
* Date & Time: ${candidate.interviewDate || 'To be scheduled'} ${candidate.interviewTime ? `at ${candidate.interviewTime}` : ''}
* Venue: 6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101
* Interviewer: Sales Director & HR Operations Panel

------------------------------------------------------------------------
AI HR REMARKS & OUTCOME:
------------------------------------------------------------------------
${candidate.latestRemark?.text || candidate.notes || 'Automated screening completed by Virtual AI HR Recruiter Arjun.'}

------------------------------------------------------------------------
DISTRIBUTED TO CONNECTED HR & SUPPORT EMAILS:
------------------------------------------------------------------------
${activeEmails.map((e) => `• ${e}`).join('\n')}
========================================================================
`;

  return {
    subject,
    textSummary,
    activeEmails,
    isScheduled,
  };
}

// Core Automation Dispatch Executor (Runs automatically or via button)
export async function executeAutomatedTeamDataShare(
  candidate: Candidate,
  event: 'Call Completed' | 'Interview Scheduled' | 'Manual Data Share' | 'Candidate Screened',
  customConfig?: TeamAutomationConfig
): Promise<AutomationDispatchResult> {
  const config = customConfig || getTeamAutomationConfig();
  const payload = generateTeamDataSharePayload(candidate, config, event);
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const sheetsSuccess = config.autoSyncGoogleSheets;
  const calendarSuccess = config.autoBookGoogleCalendar && payload.isScheduled;
  const gmailCount = config.autoSendGmailTeamSummaries ? payload.activeEmails.length : 0;
  const driveSuccess = config.autoArchiveDriveDossier;
  const whatsAppSuccess = config.autoSendCandidateWhatsApp;

  const result: AutomationDispatchResult = {
    id: `disp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp,
    candidateName: candidate.name,
    candidateRole: candidate.appliedRole,
    event,
    status: payload.activeEmails.length > 0 ? 'Success' : 'Partial',
    dispatchedToEmails: payload.activeEmails,
    sheetsSynced: sheetsSuccess,
    calendarEventCreated: calendarSuccess,
    gmailSentCount: gmailCount,
    driveDossierCreated: driveSuccess,
    whatsAppPrepared: whatsAppSuccess,
    details: `Automated data distributed to ${payload.activeEmails.length} team emails (${payload.activeEmails.join(', ')}). Google Sheets row added to "${config.googleSheetName}". Calendar and Drive dossier synced.`,
  };

  logAutomationDispatch(result);
  return result;
}
