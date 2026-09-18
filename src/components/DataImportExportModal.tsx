import React, { useState, useRef, useMemo } from 'react';
import { 
  X, Upload, Download, FileText, CheckCircle, RefreshCw, 
  Sparkles, AlertCircle, Copy, Check, Filter, Database, 
  ShieldCheck, ArrowRight, Table, Flame, Users, GitMerge,
  Layers, PhoneCall, AlertTriangle, UserCheck, Trash2, CheckCheck
} from 'lucide-react';
import { Candidate, DataCleaningReport, DuplicateCandidateGroup, DataHygieneMetrics } from '../types';
import { 
  cleanAndEnrichCandidates, 
  exportCandidatesToCSV, 
  parseCSVToCandidates,
  findDuplicateGroups,
  mergeCandidateGroup,
  autoMergeAllDuplicates,
  standardizeAllCandidateNames,
  calculateDataHygieneMetrics
} from '../utils/dataCleaningEngine';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';

interface DataImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onUpdateCandidates: (candidates: Candidate[]) => void;
  onDataImported?: (newCandidates: Candidate[], report: DataCleaningReport) => void;
}

export const DataImportExportModal: React.FC<DataImportExportModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onUpdateCandidates,
  onDataImported,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'duplicates' | 'clean'>('duplicates');
  const [rawText, setRawText] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [previewCleaned, setPreviewCleaned] = useState<Candidate[]>([]);
  const [cleaningReport, setCleaningReport] = useState<DataCleaningReport | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedCSV, setCopiedCSV] = useState<boolean>(false);
  const [copiedJSON, setCopiedJSON] = useState<boolean>(false);
  const [mergeToast, setMergeToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute live duplicate groups
  const duplicateGroups = useMemo(() => findDuplicateGroups(candidates), [candidates]);
  const hygieneMetrics = useMemo(() => calculateDataHygieneMetrics(candidates), [candidates]);

  if (!isOpen) return null;

  // Process raw text or file
  const handleProcessInput = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setPreviewCleaned([]);
      setCleaningReport(null);
      return;
    }

    try {
      let parsed: Partial<Candidate>[] = [];
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        const json = JSON.parse(text);
        parsed = Array.isArray(json) ? json : [json];
      } else {
        parsed = parseCSVToCandidates(text);
      }

      const { cleanedList, report } = cleanAndEnrichCandidates(parsed);
      setPreviewCleaned(cleanedList);
      setCleaningReport(report);
    } catch (e: any) {
      console.error('Error processing import', e);
      setCleaningReport({
        totalProcessed: 0,
        validCandidatesImported: 0,
        phonesNormalized: 0,
        namesCleaned: 0,
        duplicatesMerged: 0,
        rolesStandardized: 0,
        prioritiesComputed: 0,
        errors: [`Parse failed: ${e.message || 'Invalid format'}`],
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessInput(content);
    };
    reader.readAsText(file);
  };

  const handleCommitImport = () => {
    if (previewCleaned.length === 0) return;

    let updatedList: Candidate[];
    if (importMode === 'replace') {
      updatedList = previewCleaned;
    } else {
      // Append mode with deduplication
      const { cleanedList } = cleanAndEnrichCandidates([...candidates, ...previewCleaned]);
      updatedList = cleanedList;
    }

    onUpdateCandidates(updatedList);
    if (onDataImported && cleaningReport) {
      onDataImported(updatedList, cleaningReport);
    }
    onClose();
  };

  const handleRunAutoMergeAll = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const { mergedList, mergedCount, details } = autoMergeAllDuplicates(candidates);
      onUpdateCandidates(mergedList);
      setIsProcessing(false);
      setMergeToast(`Successfully merged ${mergedCount} duplicate profile(s) with full call logs & notes preserved.`);
      setTimeout(() => setMergeToast(null), 4000);
    }, 400);
  };

  const handleMergeSingleGroup = (group: DuplicateCandidateGroup) => {
    const merged = mergeCandidateGroup(group.primaryCandidate, group.duplicateCandidates);
    const duplicateIds = new Set(group.duplicateCandidates.map((c) => c.id));
    
    const updated = candidates
      .filter((c) => !duplicateIds.has(c.id))
      .map((c) => (c.id === group.primaryCandidate.id ? merged : c));

    onUpdateCandidates(updated);
    setMergeToast(`Merged duplicate group for ${merged.name} (${group.matchedKey}).`);
    setTimeout(() => setMergeToast(null), 3500);
  };

  const handleStandardizeNames = () => {
    const { updatedList, changedCount } = standardizeAllCandidateNames(candidates);
    onUpdateCandidates(updatedList);
    setMergeToast(`Standardized naming conventions for ${changedCount} candidate profiles into Title Case.`);
    setTimeout(() => setMergeToast(null), 3500);
  };

  const handleRunFullClean = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const { cleanedList, report } = cleanAndEnrichCandidates(candidates);
      onUpdateCandidates(cleanedList);
      setCleaningReport(report);
      setIsProcessing(false);
      setMergeToast(`Full ATS Data Cleaned! ${report.namesCleaned} names standardized, ${report.phonesNormalized} phones formatted.`);
      setTimeout(() => setMergeToast(null), 4000);
    }, 400);
  };

  const handleDownloadCSV = () => {
    const csv = exportCandidatesToCSV(candidates);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WCR_Candidate_ATS_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(candidates, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WCR_Candidate_ATS_Database_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCSV = () => {
    const csv = exportCandidatesToCSV(candidates);
    navigator.clipboard.writeText(csv);
    setCopiedCSV(true);
    setTimeout(() => setCopiedCSV(false), 2000);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(candidates, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  const sampleCSVTemplate = `Name,Phone,Role,TotalExp,REExp,Company,CurrentCTC,ExpectedCTC,NoticeDays,Status,InterviewDate,InterviewTime
Rohit Verma,9818812345,Property Consultant,3.5,2.5,Anarock Property,8.5 LPA,14 LPA,15,Screened - Ready for Interview,Tomorrow,11:30 AM
Ananya Sharma,+91 9876543210,Sales Manager,5.0,4.0,Square Yards,16 LPA,22 LPA,30,Interview Scheduled,Tomorrow,02:30 PM
Karan Mehra,9899123000,Dubai Investment Advisor,4.0,3.0,DAMAC Advisory,12 LPA,20 LPA,0,Attendance Confirmed,Today,04:00 PM`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-500/40 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl shadow-purple-950/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/15 border border-purple-500/40 rounded-xl text-purple-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Candidate Data Cleaning, Deduplication & Ingestion Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Data Hygiene Score: {hygieneMetrics.hygieneScore}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated duplicate profile resolution by phone/email, Indian +91 phone formatting & Title Case naming standardizer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toast */}
        {mergeToast && (
          <div className="px-6 py-2 bg-emerald-950/80 border-b border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              <span>{mergeToast}</span>
            </div>
            <button onClick={() => setMergeToast(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 border-b border-slate-800 flex gap-4 bg-slate-950/40 overflow-x-auto">
          <button
            onClick={() => setActiveTab('duplicates')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'duplicates'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitMerge className="w-4 h-4" />
            <span>Duplicate Scanner & Merge</span>
            {duplicateGroups.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                {duplicateGroups.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'import'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import Candidate File</span>
          </button>
          <button
            onClick={() => setActiveTab('clean')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'clean'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Name & Phone Hygiene</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'export'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Cleaned ATS</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60">
          {/* TAB 1: DUPLICATES SCANNER & SMART MERGE */}
          {activeTab === 'duplicates' && (
            <div className="space-y-5">
              {/* Hygiene Metric Overview Banner */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-extrabold text-lg">
                      {hygieneMetrics.hygieneScore}%
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        CRM Data Hygiene & Deduplication Engine
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Scans {candidates.length} total profiles against phone collision, email aliases & messy naming artifacts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {duplicateGroups.length > 0 ? (
                      <button
                        onClick={handleRunAutoMergeAll}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        <span>⚡ 1-Click Auto-Merge All {duplicateGroups.length} Groups</span>
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        <span>Zero Duplicate Collisions Found</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Valid +91 Phones</span>
                    <strong className="text-emerald-300 font-mono text-sm">
                      {hygieneMetrics.validPhonesCount} / {candidates.length}
                    </strong>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Title Cased Names</span>
                    <strong className="text-blue-300 font-mono text-sm">
                      {hygieneMetrics.standardizedNamesCount} / {candidates.length}
                    </strong>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Duplicate Collisions</span>
                    <strong className={`font-mono text-sm ${duplicateGroups.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {duplicateGroups.length} groups
                    </strong>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Scheduled Interviews</span>
                    <strong className="text-purple-300 font-mono text-sm">
                      {hygieneMetrics.scheduledInterviewsCount}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Duplicate Resolution Workbench */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <GitMerge className="w-4 h-4 text-amber-400" />
                    <span>Identified Duplicate Groups ({duplicateGroups.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Merges preserve interview dates, transcripts & candidate notes
                  </span>
                </div>

                {duplicateGroups.length === 0 ? (
                  <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Your ATS is 100% Clean!</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      All candidate profiles have unique telephone numbers and distinct email addresses.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {duplicateGroups.map((group) => (
                      <div
                        key={group.id}
                        className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-md"
                      >
                        {/* Group Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {group.reason === 'PHONE_MATCH' ? 'Exact Phone Match' : 'Email Collision'}
                            </span>
                            <span className="text-xs font-bold text-white">{group.matchedKey}</span>
                            <span className="text-[10px] text-slate-500">
                              ({1 + group.duplicateCandidates.length} profiles linked)
                            </span>
                          </div>

                          <button
                            onClick={() => handleMergeSingleGroup(group)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                          >
                            <GitMerge className="w-3.5 h-3.5" />
                            <span>Merge into 1 Master Record</span>
                          </button>
                        </div>

                        {/* Side by side comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Primary Profile */}
                          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>Master Profile (To Keep)</span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">ID: {group.primaryCandidate.id}</span>
                            </div>

                            <div>
                              <p className="font-bold text-white text-sm">{group.primaryCandidate.name}</p>
                              <p className="text-amber-400 text-[11px]">{group.primaryCandidate.appliedRole}</p>
                              <p className="text-slate-400 text-[11px] font-mono">{group.primaryCandidate.email}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                              <div>
                                <span className="text-slate-500 block text-[10px]">Status</span>
                                <span className="text-slate-200 font-medium">{group.primaryCandidate.status}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Interview</span>
                                <span className="text-emerald-300 font-medium">
                                  {group.primaryCandidate.interviewDate ? `${group.primaryCandidate.interviewDate} @ ${group.primaryCandidate.interviewTime}` : 'Not scheduled'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Calls Made</span>
                                <span className="text-slate-200">{group.primaryCandidate.callCount || 0} calls</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Notes Length</span>
                                <span className="text-slate-200">{group.primaryCandidate.notes?.length || 0} chars</span>
                              </div>
                            </div>
                          </div>

                          {/* Duplicate Profiles */}
                          <div className="space-y-2">
                            {group.duplicateCandidates.map((dup, dIdx) => (
                              <div
                                key={dup.id}
                                className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2 opacity-80"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Duplicate Record #{dIdx + 1} (Will Merge)</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">ID: {dup.id}</span>
                                </div>

                                <div>
                                  <p className="font-bold text-slate-300">{dup.name}</p>
                                  <p className="text-slate-400 text-[11px]">{dup.appliedRole}</p>
                                </div>

                                <div className="text-[11px] text-slate-400 bg-slate-950/40 p-1.5 rounded border border-slate-800">
                                  <span>Notes / Screening: </span>
                                  <span className="text-slate-300 line-clamp-1">{dup.notes || 'No extra notes'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT CANDIDATES */}
          {activeTab === 'import' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-slate-700 hover:border-purple-500/60 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-950/40 transition">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,.json,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-purple-400 mb-2" />
                  <p className="text-xs font-semibold text-white">Upload CSV or JSON Candidate File</p>
                  <p className="text-[11px] text-slate-400 mt-1">Supports portal exports (Naukri, LinkedIn, Excel)</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Select Local File
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-300">Or Paste Raw CSV / JSON Data:</label>
                    <button
                      type="button"
                      onClick={() => handleProcessInput(sampleCSVTemplate)}
                      className="text-purple-400 hover:underline text-[11px]"
                    >
                      Load Sample Template
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={rawText}
                    onChange={(e) => handleProcessInput(e.target.value)}
                    placeholder="Paste CSV rows (Name, Phone, Role, Exp, CTC, etc.)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-purple-500"
                  />
                </div>
              </div>

              {cleaningReport && (
                <div className="bg-purple-950/20 border border-purple-900/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Data Cleaning Engine Results:
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {cleaningReport.validCandidatesImported} Clean Candidates Ready
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Phones Formatted</span>
                      <strong className="text-emerald-300 font-mono">{cleaningReport.phonesNormalized}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Names Cleaned</span>
                      <strong className="text-blue-300 font-mono">{cleaningReport.namesCleaned}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Roles Standardized</span>
                      <strong className="text-purple-300 font-mono">{cleaningReport.rolesStandardized}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Duplicates Resolved</span>
                      <strong className="text-amber-300 font-mono">{cleaningReport.duplicatesMerged}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Priorities Assigned</span>
                      <strong className="text-rose-300 font-mono">{cleaningReport.prioritiesComputed}</strong>
                    </div>
                  </div>
                </div>
              )}

              {previewCleaned.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      Preview Cleaned Candidates ({previewCleaned.length}):
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="accent-purple-500"
                        />
                        <span>Append to current list</span>
                      </label>
                      <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="accent-purple-500"
                        />
                        <span>Replace existing roster</span>
                      </label>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/80 max-h-48">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-300 border-b border-slate-800">
                          <th className="p-2">Name</th>
                          <th className="p-2">Phone (Formatted)</th>
                          <th className="p-2">Standardized Role</th>
                          <th className="p-2">Exp (Total/RE)</th>
                          <th className="p-2">CTC (Curr/Exp)</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {previewCleaned.map((c, i) => (
                          <tr key={i} className="hover:bg-slate-850">
                            <td className="p-2 font-medium text-white">{c.name}</td>
                            <td className="p-2 font-mono text-emerald-300">{c.phone}</td>
                            <td className="p-2 text-slate-300">{c.appliedRole}</td>
                            <td className="p-2 font-mono text-slate-300">
                              {c.screening?.totalExperienceYears}y / {c.screening?.realEstateExperienceYears}y
                            </td>
                            <td className="p-2 font-mono text-amber-300">
                              {c.screening?.currentSalaryLPA} / {c.screening?.expectedSalaryLPA}
                            </td>
                            <td className="p-2 text-slate-400">{c.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleCommitImport}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm & Ingest {previewCleaned.length} Cleaned Candidates into Active ATS</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NAME & PHONE HYGIENE */}
          {activeTab === 'clean' && (
            <div className="max-w-3xl space-y-5">
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Automated Name Standardization & Formatting Suite</span>
                  </h3>
                  <span className="text-xs font-mono text-purple-300 font-semibold">
                    {hygieneMetrics.standardizedNamesCount} / {candidates.length} Standardized
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Clean candidate records by stripping noisy salutations (<em>Mr., Ms., Dr., Adv.</em>), trimming stray numbers, normalizing all text to Title Case, and ensuring all telephone contacts strictly conform to the <strong>+91 XXXXX XXXXX</strong> Indian standard.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      <span>Standardize All Candidate Names</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Converts all candidate names to Title Case and strips honorific prefixes across all {candidates.length} profiles.
                    </p>
                    <button
                      onClick={handleStandardizeNames}
                      className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Format All Names to Title Case</span>
                    </button>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Run Full ATS Deep Clean</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Recalculates dynamic priority tiers, formats all phone numbers, and aligns job roles to official openings.
                    </p>
                    <button
                      onClick={handleRunFullClean}
                      disabled={isProcessing}
                      className="w-full mt-2 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>Run Complete In-Memory Deep Clean</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (confirm('Reset candidate roster to official White Collar Realty initial benchmark dataset?')) {
                        onUpdateCandidates(INITIAL_CANDIDATES);
                        setMergeToast('Candidate roster reset to initial verified benchmark data.');
                        setTimeout(() => setMergeToast(null), 3000);
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    Reset Roster to Official Benchmark Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EXPORT */}
          {activeTab === 'export' && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-purple-400" />
                  Export Options for White Collar Realty ATS ({candidates.length} Profiles)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        Google Sheets / Excel CSV
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Formatted with all 26 columns: candidate ratings, call transcripts, experience breakdown, interview slots.
                      </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleDownloadCSV}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Download CSV
                      </button>
                      <button
                        onClick={handleCopyCSV}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedCSV ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-blue-400" />
                        Full ATS Database JSON
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Full structured schema including nested screening memory, call audio logs, remarks history.
                      </p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleDownloadJSON}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Download JSON
                      </button>
                      <button
                        onClick={handleCopyJSON}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedJSON ? <Check className="w-4 h-4 text-blue-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Strict RFC 4180 / Google Sheets & deduplication compliance</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
