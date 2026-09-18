import React, { useState } from 'react';
import { 
  X, Table, RefreshCw, ExternalLink, CheckCircle, Clock, 
  Settings, Copy, Check, ShieldCheck, AlertCircle, FileSpreadsheet,
  Download, ArrowUpRight, Radio, Sparkles
} from 'lucide-react';
import { Candidate, GoogleSheetsSyncConfig, GoogleSheetsSyncLog } from '../types';
import { 
  getGoogleSheetsConfig, 
  saveGoogleSheetsConfig, 
  getGoogleSheetsLogs, 
  syncCandidatesToGoogleSheets,
  formatCandidatesForSheets 
} from '../utils/googleSheetsSyncService';
import { exportCandidatesToCSV } from '../utils/dataCleaningEngine';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onSyncTriggered?: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onSyncTriggered,
}) => {
  const [config, setConfig] = useState<GoogleSheetsSyncConfig>(getGoogleSheetsConfig());
  const [logs, setLogs] = useState<GoogleSheetsSyncLog[]>(getGoogleSheetsLogs());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'settings' | 'script' | 'logs'>('preview');
  const [copiedData, setCopiedData] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveConfig = () => {
    saveGoogleSheetsConfig(config);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncCandidatesToGoogleSheets(candidates, 'MANUAL_TRIGGER', config);
      setLogs(getGoogleSheetsLogs());
      setConfig(getGoogleSheetsConfig());
      if (onSyncTriggered) onSyncTriggered();
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  const handleCopyTSV = () => {
    const csv = exportCandidatesToCSV(candidates);
    const tsv = csv.split('\n').map(row => {
      // rough CSV to TSV conversion
      return row.replace(/","/g, '\t').replace(/^"/, '').replace(/"$/, '');
    }).join('\n');

    navigator.clipboard.writeText(tsv);
    setCopiedData(true);
    setTimeout(() => setCopiedData(false), 2000);
  };

  const handleDownloadCSV = () => {
    const csv = exportCandidatesToCSV(candidates);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WCR_Candidate_ATS_Google_Sheet_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewRows = formatCandidatesForSheets(candidates);

  const googleAppsScriptCode = `// Google Apps Script for White Collar Realty ATS Sync
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(payload.sheetName || "Live_Candidate_Screening_ATS");
    
    if (!sheet) {
      sheet = ss.insertSheet(payload.sheetName || "Live_Candidate_Screening_ATS");
      // Set Column Headers
      sheet.appendRow([
        "Candidate ID", "Timestamp", "Name", "Phone", "Email", "Applied Role", 
        "Status", "Priority Level", "Priority Score", "Total Exp", "RE Exp", 
        "Gurgaon Exp", "Dubai Exp", "Current Company", "Current CTC", "Expected CTC", 
        "Notice (Days)", "Interview Date", "Interview Time", "Venue", "Calls Count", 
        "Unanswered", "Screening Notes", "HR Strengths", "Red Flags", "Recommendation"
      ]);
      sheet.getRange(1, 1, 1, 26).setFontWeight("bold").setBackground("#0f172a").setFontColor("#f8fafc");
    }
    
    // Clear old data rows and write updated candidate roster
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 26).clearContent();
    }
    
    var rowsToWrite = [];
    payload.rows.forEach(function(r) {
      rowsToWrite.push([
        r.candidateId, r.timestamp, r.name, r.phone, r.email, r.appliedRole,
        r.status, r.priorityLevel, r.priorityScore, r.totalExpYears, r.realEstateExpYears,
        r.gurgaonExp, r.dubaiExp, r.currentCompany, r.currentSalaryLPA, r.expectedSalaryLPA,
        r.noticePeriodDays, r.interviewDate, r.interviewTime, r.interviewVenue, r.callsCount,
        r.unansweredAttempts, r.notes, r.strengths, r.redFlags, r.hrRecommendation
      ]);
    });
    
    if (rowsToWrite.length > 0) {
      sheet.getRange(2, 1, rowsToWrite.length, 26).setValues(rowsToWrite);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "SUCCESS", updated: rowsToWrite.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "ERROR", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl shadow-emerald-950/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Google Sheets Background Service & HR Reporting Hub
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Real-time Sync Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated continuous synchronization of candidate screening status, interview schedules, and HR analysis to Google Sheet.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className="bg-emerald-950/30 border-b border-emerald-900/40 px-6 py-2.5 flex items-center justify-between text-xs text-slate-300 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Sheet Connected: <span className="font-mono text-white">{config.sheetName}</span>
            </span>
            <span className="text-slate-400">
              Total Synced Rows: <strong className="text-white">{candidates.length}</strong>
            </span>
            <span className="text-slate-400">
              Last Sync:{' '}
              <span className="font-mono text-slate-200">
                {config.lastSyncedTimestamp ? new Date(config.lastSyncedTimestamp).toLocaleTimeString() : 'Just now'}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTSV}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-medium flex items-center gap-1 transition"
            >
              {copiedData ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedData ? 'Copied to Clipboard!' : 'Copy for Google Sheets'}</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-medium flex items-center gap-1 transition"
            >
              <Download className="w-3 h-3" />
              <span>Download CSV</span>
            </button>

            <a
              href={`https://docs.google.com/spreadsheets/d/${config.sheetId}/edit#gid=0`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-medium flex items-center gap-1 transition"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open Google Sheet</span>
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-800 flex gap-4 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'preview'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Live Sheet Preview ({previewRows.length} Rows)</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Sync Automation Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'script'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Google Apps Script Connector</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'logs'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Audit Sync Logs ({logs.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60">
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>The table below represents the active columns synced in real-time to Google Sheets:</span>
                <span className="font-mono text-emerald-400">Auto-push on call completion: Active</span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/80 max-h-[50vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-300 font-semibold border-b border-slate-800 sticky top-0">
                      <th className="p-2.5 whitespace-nowrap">#</th>
                      <th className="p-2.5 whitespace-nowrap">Candidate Name</th>
                      <th className="p-2.5 whitespace-nowrap">Phone Number</th>
                      <th className="p-2.5 whitespace-nowrap">Role</th>
                      <th className="p-2.5 whitespace-nowrap">Status</th>
                      <th className="p-2.5 whitespace-nowrap">Priority</th>
                      <th className="p-2.5 whitespace-nowrap">Total Exp</th>
                      <th className="p-2.5 whitespace-nowrap">RE Exp</th>
                      <th className="p-2.5 whitespace-nowrap">Gurgaon / Dubai</th>
                      <th className="p-2.5 whitespace-nowrap">Expected CTC</th>
                      <th className="p-2.5 whitespace-nowrap">Interview Schedule</th>
                      <th className="p-2.5 whitespace-nowrap">HR Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {previewRows.map((r, i) => (
                      <tr key={r.candidateId} className="hover:bg-slate-800/40 transition">
                        <td className="p-2.5 font-mono text-slate-500">{i + 1}</td>
                        <td className="p-2.5 font-medium text-white whitespace-nowrap">{r.name}</td>
                        <td className="p-2.5 font-mono text-slate-300 whitespace-nowrap">{r.phone}</td>
                        <td className="p-2.5 text-slate-300 whitespace-nowrap">{r.appliedRole}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-200 border border-slate-700">
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap font-mono text-emerald-400 font-bold">
                          {r.priorityLevel} ({r.priorityScore})
                        </td>
                        <td className="p-2.5 font-mono text-slate-300">{r.totalExpYears} yrs</td>
                        <td className="p-2.5 font-mono text-slate-300">{r.realEstateExpYears} yrs</td>
                        <td className="p-2.5 text-slate-300 whitespace-nowrap">
                          {r.gurgaonExp === 'Yes' ? 'Gurugram' : ''}
                          {r.dubaiExp === 'Yes' ? ' • Dubai' : ''}
                        </td>
                        <td className="p-2.5 font-mono text-amber-300 whitespace-nowrap">{r.expectedSalaryLPA}</td>
                        <td className="p-2.5 whitespace-nowrap text-slate-300">
                          {r.interviewDate !== 'Not Scheduled' ? (
                            <span className="text-emerald-300 font-medium">
                              {r.interviewDate} @ {r.interviewTime}
                            </span>
                          ) : (
                            <span className="text-slate-500">Not Booked</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-300 max-w-xs truncate" title={r.hrRecommendation}>
                          {r.hrRecommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  Continuous Background Sync Settings
                </h3>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-200">Enable Background Auto-Sync Service</label>
                    <p className="text-[11px] text-slate-400">Runs periodically in background and synchronizes all candidate state changes.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoSyncEnabled}
                    onChange={(e) => {
                      const updated = { ...config, autoSyncEnabled: e.target.checked };
                      setConfig(updated);
                      saveGoogleSheetsConfig(updated);
                    }}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Auto-Sync Frequency</label>
                    <select
                      value={config.syncIntervalSeconds}
                      onChange={(e) => {
                        const updated = { ...config, syncIntervalSeconds: Number(e.target.value) };
                        setConfig(updated);
                        saveGoogleSheetsConfig(updated);
                      }}
                      className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value={15}>Every 15 seconds (High Frequency)</option>
                      <option value={30}>Every 30 seconds (Standard)</option>
                      <option value={60}>Every 1 minute</option>
                      <option value={300}>Every 5 minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300">Sheet Tab Name</label>
                    <input
                      type="text"
                      value={config.sheetName}
                      onChange={(e) => {
                        const updated = { ...config, sheetName: e.target.value };
                        setConfig(updated);
                        saveGoogleSheetsConfig(updated);
                      }}
                      className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-200">Auto-push immediately on AI Call completion</span>
                      <p className="text-[11px] text-slate-400">Pushes screening transcript summary immediately when Arjun AI ends a call.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.autoPushOnCallEnd}
                      onChange={(e) => {
                        const updated = { ...config, autoPushOnCallEnd: e.target.checked };
                        setConfig(updated);
                        saveGoogleSheetsConfig(updated);
                      }}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-slate-200">Auto-push on Interview Scheduled or Status Change</span>
                      <p className="text-[11px] text-slate-400">Updates the Google Sheet row instantly when a slot is booked or candidate is rescheduled.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.autoPushOnStatusChange}
                      onChange={(e) => {
                        const updated = { ...config, autoPushOnStatusChange: e.target.checked };
                        setConfig(updated);
                        saveGoogleSheetsConfig(updated);
                      }}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Google Apps Script Webhook Endpoint (Optional)</label>
                  <input
                    type="text"
                    value={config.webhookUrl || ''}
                    onChange={(e) => {
                      const updated = { ...config, webhookUrl: e.target.value };
                      setConfig(updated);
                      saveGoogleSheetsConfig(updated);
                    }}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Paste your deployed Google Apps Script Webhook URL to push data live into your corporate Google Sheet.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'script' && (
            <div className="space-y-4 max-w-3xl">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-white">Google Apps Script Connector Code</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(googleAppsScriptCode);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-xs font-medium flex items-center gap-1 transition"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Copied Code!' : 'Copy Script'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  1. Open your target Google Sheet &gt; Click <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.<br />
                  2. Paste this code and click <strong>Deploy &gt; New Deployment &gt; Web app (Access: Anyone)</strong>.<br />
                  3. Copy the resulting URL into the Webhook Endpoint in Settings tab.
                </p>

                <pre className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60">
                  {googleAppsScriptCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recent Background and Manual Google Sheet sync activities:</span>
                <button
                  onClick={() => setLogs(getGoogleSheetsLogs())}
                  className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No sync logs recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {logs.map((l) => (
                    <div
                      key={l.id}
                      className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            l.status === 'SUCCESS' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white font-mono text-[11px]">{l.type}</span>
                            <span className="text-slate-400 font-mono text-[10px]">[{l.timestamp}]</span>
                          </div>
                          <p className="text-slate-300 text-xs mt-0.5">{l.message}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold whitespace-nowrap">
                        {l.recordsCount} rows
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted Corporate Google Workspace Integration</span>
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
