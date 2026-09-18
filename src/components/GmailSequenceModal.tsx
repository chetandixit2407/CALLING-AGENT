import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Send, CheckCircle, Clock, ExternalLink, 
  Copy, Check, Sparkles, User, Calendar, MapPin, 
  RefreshCw, ShieldCheck, History, FileText, ChevronRight
} from 'lucide-react';
import { Candidate, GmailEmailRecord, GmailSequenceTemplate, GmailSequenceType } from '../types';
import { 
  GMAIL_DEFAULT_TEMPLATES, 
  populateGmailTemplate, 
  generateGmailWebComposeUrl, 
  generateMailtoUrl, 
  dispatchGmailSequence, 
  getSentGmailRecords 
} from '../utils/gmailIntegrationService';

interface GmailSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  onEmailSent?: (record: GmailEmailRecord) => void;
}

export const GmailSequenceModal: React.FC<GmailSequenceModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onEmailSent,
}) => {
  const [selectedType, setSelectedType] = useState<GmailSequenceType>('INTERVIEW_INVITE');
  const [senderEmail, setSenderEmail] = useState<string>('sachinkumarwcr@gmail.com');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [sentHistory, setSentHistory] = useState<GmailEmailRecord[]>([]);

  const selectedTemplate = GMAIL_DEFAULT_TEMPLATES.find((t) => t.type === selectedType) || GMAIL_DEFAULT_TEMPLATES[0];

  useEffect(() => {
    if (selectedTemplate && candidate) {
      const { subject: s, body: b } = populateGmailTemplate(selectedTemplate, candidate, senderEmail);
      setSubject(s);
      setBody(b);
    }
  }, [selectedType, candidate, senderEmail]);

  useEffect(() => {
    setSentHistory(getSentGmailRecords().filter((r) => r.candidateId === candidate.id || !candidate.id));
  }, [candidate, isOpen, sentSuccess]);

  if (!isOpen) return null;

  const handleSendViaGmailApi = async () => {
    setIsSending(true);
    try {
      const record = await dispatchGmailSequence(
        candidate,
        selectedType,
        senderEmail,
        subject,
        body
      );
      setIsSending(false);
      setSentSuccess(true);
      if (onEmailSent) onEmailSent(record);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } catch (e) {
      console.error('Failed to send email sequence', e);
      setIsSending(false);
    }
  };

  const handleOpenGmailWeb = () => {
    const url = generateGmailWebComposeUrl(
      candidate.email || 'candidate@applicant.in',
      subject,
      body,
      'sachinkumarwcr@gmail.com,hr@whitecollarrealty.com'
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-blue-500/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/40 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/15 border border-blue-500/40 rounded-xl text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Gmail Interview Sequence & Official Call Letter
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  White Collar Realty HR
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated dispatch to <strong className="text-white">{candidate.name}</strong> ({candidate.email})
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

        {/* Tabs */}
        <div className="px-6 border-b border-slate-800 flex gap-4 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('compose')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'compose'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Compose Sequence</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Sent History ({sentHistory.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/60">
          {activeTab === 'compose' ? (
            <div className="space-y-4">
              {/* Template selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Select Sequence Template:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {GMAIL_DEFAULT_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedType(tmpl.type)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition ${
                        selectedType === tmpl.type
                          ? 'bg-blue-500/20 border-blue-500/60 text-white shadow-xs'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <p className="font-bold truncate">{tmpl.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{tmpl.type}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient meta bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">To (Candidate):</span>
                  <span className="text-white font-semibold truncate block">
                    {candidate.name} &lt;{candidate.email}&gt;
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">From (Talent Lead):</span>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2 py-0.5 rounded w-full focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">CC:</span>
                  <span className="text-slate-300 truncate block font-mono text-[11px]">
                    sachinkumarwcr@gmail.com, hr@whitecollarrealty.com
                  </span>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Subject Line:</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">Email Body (Pre-Formatted with CRM Details):</label>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-blue-400 hover:text-blue-300 text-[11px] flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 leading-relaxed focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Sent Gmail Dispatches for this Candidate
              </h3>

              {sentHistory.length === 0 ? (
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                  No automated Gmail sequences dispatched for this candidate yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {sentHistory.map((rec) => (
                    <div
                      key={rec.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {rec.status}
                          </span>
                          <span className="font-bold text-white">{rec.subject}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(rec.sentAt || '').toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Dispatched to: <strong className="text-slate-300">{rec.candidateEmail}</strong> • Tracking ID: <span className="font-mono text-slate-500">{rec.trackingId}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Pre-cleared with M3M Urbana Visitor Gate Pass details</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenGmailWeb}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition"
              title="Open full composer in mail.google.com"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Open in Gmail Web</span>
            </button>

            <button
              onClick={handleSendViaGmailApi}
              disabled={isSending || sentSuccess}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-950/40 transition active:scale-95 disabled:opacity-50"
            >
              {sentSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  <span>Invitation Dispatched!</span>
                </>
              ) : isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending via Gmail API...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Interview Invitation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
