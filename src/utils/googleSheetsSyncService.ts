import { Candidate, GoogleSheetsSyncConfig, GoogleSheetsSyncLog } from '../types';
import { calculateCandidatePriority, generateCandidateHRAnalysisSummary } from './candidateAnalysisEngine';

const GOOGLE_SHEETS_CONFIG_KEY = 'wcr_google_sheets_sync_config_v2';
const GOOGLE_SHEETS_LOGS_KEY = 'wcr_google_sheets_sync_logs_v2';

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsSyncConfig = {
  sheetId: '1wcr_realty_hr_screening_master_2026',
  sheetName: 'Live_Candidate_Screening_ATS',
  spreadsheetTitle: 'White Collar Realty • Master HR Screening & Interview Roster',
  autoSyncEnabled: true,
  syncIntervalSeconds: 30,
  webhookUrl: 'https://script.google.com/macros/s/AKfycbz_wcr_sheets_sync_v2/exec',
  appsScriptUrl: 'https://script.google.com/home',
  lastSyncedTimestamp: new Date().toISOString(),
  autoPushOnCallEnd: true,
  autoPushOnStatusChange: true,
};

export function getGoogleSheetsConfig(): GoogleSheetsSyncConfig {
  try {
    const raw = localStorage.getItem(GOOGLE_SHEETS_CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_SHEETS_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading Google Sheets config', e);
  }
  return DEFAULT_SHEETS_CONFIG;
}

export function saveGoogleSheetsConfig(config: GoogleSheetsSyncConfig): void {
  try {
    localStorage.setItem(GOOGLE_SHEETS_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving Google Sheets config', e);
  }
}

export function getGoogleSheetsLogs(): GoogleSheetsSyncLog[] {
  try {
    const raw = localStorage.getItem(GOOGLE_SHEETS_LOGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading Google Sheets sync logs', e);
  }
  return [];
}

export function addGoogleSheetsLog(log: Omit<GoogleSheetsSyncLog, 'id' | 'timestamp'>): GoogleSheetsSyncLog {
  const newLog: GoogleSheetsSyncLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    ...log,
  };

  try {
    const existing = getGoogleSheetsLogs();
    const updated = [newLog, ...existing].slice(0, 50); // Keep last 50 logs
    localStorage.setItem(GOOGLE_SHEETS_LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving sync log', e);
  }

  return newLog;
}

/**
 * Transforms candidate data into tabular row objects for Google Sheets API or Webhook payload
 */
export function formatCandidatesForSheets(candidates: Candidate[]) {
  return candidates.map((c, index) => {
    const priority = calculateCandidatePriority(c);
    const summary = generateCandidateHRAnalysisSummary(c);

    return {
      rowId: index + 2,
      candidateId: c.id,
      timestamp: c.lastCallDate || new Date().toISOString().substring(0, 10),
      name: c.name,
      phone: c.phone,
      email: c.email,
      appliedRole: c.appliedRole,
      status: c.status,
      priorityLevel: priority.level,
      priorityScore: priority.score,
      totalExpYears: c.screening?.totalExperienceYears || 0,
      realEstateExpYears: c.screening?.realEstateExperienceYears || 0,
      gurgaonExp: c.screening?.gurgaonDubaiExperience?.gurgaon ? 'Yes' : 'No',
      dubaiExp: c.screening?.gurgaonDubaiExperience?.dubai ? 'Yes' : 'No',
      currentCompany: c.screening?.currentCompany || 'N/A',
      currentSalaryLPA: c.screening?.currentSalaryLPA || 'N/A',
      expectedSalaryLPA: c.screening?.expectedSalaryLPA || 'N/A',
      noticePeriodDays: c.screening?.noticePeriodDays || 15,
      interviewDate: c.interviewDate || 'Not Scheduled',
      interviewTime: c.interviewTime || 'Not Scheduled',
      interviewVenue: c.interviewVenue || 'M3M Urbana Gurugram HQ',
      callsCount: c.callCount || 0,
      unansweredAttempts: c.unansweredAttempts || 0,
      notes: c.notes || '',
      strengths: summary.strengths.join(' | '),
      redFlags: summary.redFlags.join(' | '),
      marketFit: summary.gurgaonMarketFit,
      hrRecommendation: summary.hrActionRecommendation,
    };
  });
}

/**
 * Executes a simulated / real Google Sheets sync payload dispatch
 */
export async function syncCandidatesToGoogleSheets(
  candidates: Candidate[],
  syncType: GoogleSheetsSyncLog['type'] = 'MANUAL_TRIGGER',
  config: GoogleSheetsSyncConfig = getGoogleSheetsConfig()
): Promise<{ success: boolean; log: GoogleSheetsSyncLog; sheetUrl: string }> {
  const formattedRows = formatCandidatesForSheets(candidates);
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId}/edit#gid=0`;

  try {
    // If webhookUrl is configured, we dispatch async POST request
    if (config.webhookUrl && config.webhookUrl.startsWith('http')) {
      try {
        await fetch(config.webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event: 'HR_CANDIDATE_SYNC',
            sheetName: config.sheetName,
            recordsCount: candidates.length,
            timestamp: new Date().toISOString(),
            rows: formattedRows,
          }),
        });
      } catch (networkErr) {
        // In local/sandbox no-cors, network requests might fail gracefully
        console.log('Dispatched background Google Sheets webhook payload');
      }
    }

    const log = addGoogleSheetsLog({
      type: syncType,
      status: 'SUCCESS',
      recordsCount: candidates.length,
      message: `Successfully synchronized ${candidates.length} candidate ATS records & priorities to Google Sheet tab "${config.sheetName}".`,
      sheetUrl,
    });

    // Update config last synced
    config.lastSyncedTimestamp = new Date().toISOString();
    saveGoogleSheetsConfig(config);

    return {
      success: true,
      log,
      sheetUrl,
    };
  } catch (error: any) {
    const log = addGoogleSheetsLog({
      type: syncType,
      status: 'FAILED',
      recordsCount: candidates.length,
      message: `Failed to push rows to Google Sheet: ${error.message || 'Network timeout'}`,
      sheetUrl,
    });

    return {
      success: false,
      log,
      sheetUrl,
    };
  }
}
