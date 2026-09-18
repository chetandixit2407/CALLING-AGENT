import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, Check, Copy, Phone, PhoneMissed, 
  Calendar, Clock, MapPin, Building, X, ExternalLink, Sparkles,
  HelpCircle, MessageCircle, ArrowRight, ShieldCheck, Tag
} from 'lucide-react';
import { Candidate } from '../types';

export type WhatsAppTemplateType = 
  | 'unanswered' 
  | 'interview_reminder' 
  | 'missed_followup' 
  | 'callback' 
  | 'pipeline' 
  | 'query_reply';

interface WhatsAppReminderModalProps {
  candidate: Candidate;
  isOpen: boolean;
  onClose: () => void;
  defaultTemplate?: WhatsAppTemplateType;
  initialQuery?: string;
  onWhatsAppSent?: (candidateId: string, loggedNote?: string) => void;
  hideSalary?: boolean;
}

interface SmartAnswerOption {
  id: string;
  label: string;
  category: string;
  text: string;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  candidate,
  isOpen,
  onClose,
  defaultTemplate = 'unanswered',
  initialQuery = '',
  onWhatsAppSent,
  hideSalary = false,
}) => {
  const [templateType, setTemplateType] = useState<WhatsAppTemplateType>(defaultTemplate);
  const [phone, setPhone] = useState(candidate.phone || '');
  const [customReplyText, setCustomReplyText] = useState('');
  const [selectedSmartAnswer, setSelectedSmartAnswer] = useState<string | null>(null);
  const [candidateQueryText, setCandidateQueryText] = useState(initialQuery || '');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (defaultTemplate) {
      setTemplateType(defaultTemplate);
    }
    if (initialQuery) {
      setCandidateQueryText(initialQuery);
    }
  }, [defaultTemplate, initialQuery, isOpen]);

  if (!isOpen) return null;

  const interviewDate = candidate.interviewDate || 'Tomorrow';
  const interviewTime = candidate.interviewTime || '11:00 AM';
  const venue = '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101';

  // Smart Pre-built Responses for Candidate Questions
  const SMART_ANSWERS: SmartAnswerOption[] = [
    {
      id: 'location',
      label: 'Office Location & Landmark',
      category: 'Venue',
      text: `Our corporate headquarters is located at: 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101. Nearest Metro station: Sector 55-56 Rapid Metro (or Huda City Centre).`,
    },
    {
      id: 'timings',
      label: 'Work Timings & Off Day',
      category: 'Schedule',
      text: `Our office working hours are 10:00 AM to 6:30 PM (6 days a week). We observe Tuesday as the designated weekly off because weekends are prime client site-visit days in luxury real estate.`,
    },
    {
      id: 'rounds',
      label: 'Interview Process & Rounds',
      category: 'Hiring',
      text: `Our hiring process consists of 2 stages: 1) Initial HR Profile Screening (conducted over call) and 2) Face-to-Face Final Discussion with our Director at our Sector 67 Gurugram HQ.`,
    },
    {
      id: 'leads',
      label: 'Lead Support & CRM Platform',
      category: 'Sales Support',
      text: `Yes! White Collar Realty provides high-intent verified digital portal leads, developer-exclusive campaigns (DLF, M3M, Godrej, Emaar, Sobha), and enterprise CRM tooling to all consultants.`,
    },
    {
      id: 'travel',
      label: 'Site Visit Travel & Cab Allowance',
      category: 'Perks',
      text: `White Collar Realty provides dedicated conveyance and travel reimbursement for all scheduled client property visits and project walkthroughs across Gurgaon and NCR.`,
    },
    {
      id: 'tech_role',
      label: 'Tech Role Stack & Projects',
      category: 'Tech',
      text: `For our technical & engineering roles, our core stack includes modern TypeScript, React, Node.js, REST/GraphQL APIs, and AI integrations. You will work on real-time CRM and telephony systems.`,
    },
    {
      id: 'reschedule',
      label: 'Reschedule Interview Proposal',
      category: 'Scheduling',
      text: `No worries at all! We understand schedule constraints. We can reschedule your face-to-face round to tomorrow at 2:30 PM or 4:30 PM. Please let us know which time suits you best.`,
    },
  ];

  const getMessageContent = () => {
    if (templateType === 'unanswered') {
      return `Hello ${candidate.name},

This is Arjun, Talent Recruiter from *White Collar Realty*. 

We tried calling your number regarding your application for the *${candidate.appliedRole}* role, but were unable to connect.

Could you please reply with a convenient time today for a quick 2-minute introductory chat, or confirm if you are available for a brief call?

📍 *Corporate HQ:* ${venue}
🏢 *White Collar Realty HR Desk*
Looking forward to speaking with you!`;
    }

    if (templateType === 'interview_reminder') {
      return `Hello ${candidate.name},

Gentle reminder regarding your upcoming face-to-face interview for the *${candidate.appliedRole}* position at *White Collar Realty*.

📅 *Date:* ${interviewDate}
⏰ *Time:* ${interviewTime}
📍 *Venue:* ${venue} (Landmark: M3M Urbana Business Park, Sector 67, Gurugram)
📄 *Please Bring:* Updated Resume & Govt ID Proof

We tried connecting over phone for a quick reconfirmation. Please reply *YES* to confirm your attendance, or let us know if you need to adjust the timing.

Regards,
Arjun | White Collar Realty HR Team`;
    }

    if (templateType === 'missed_followup') {
      return `Hello ${candidate.name},

This is Arjun from *White Collar Realty HR*. 

We noticed you were unable to attend your scheduled interview round at our Sector 67 Gurugram office. We hope everything is well at your end.

If you are still interested in exploring the *${candidate.appliedRole}* position, please reply with your preferred day and time. We have open interview slots available this week.

📍 *Venue:* ${venue}
Regards,
HR Recruitment | White Collar Realty`;
    }

    if (templateType === 'callback') {
      return `Hello ${candidate.name},

This is Arjun from *White Collar Realty*. 

You had requested a callback regarding your application for the *${candidate.appliedRole}* opportunity.

Please let us know what time works best for you today for a quick 2-minute conversation.

Regards,
Arjun | White Collar Realty HR Team`;
    }

    if (templateType === 'pipeline') {
      return `Hello ${candidate.name},

Hope you are doing great! This is Arjun from *White Collar Realty*. 

Reaching out from our Talent Relations desk regarding luxury real estate leadership opportunities across our Gurgaon & Dubai portfolios.

We would love to stay connected and explore synergies whenever you consider your next career milestone.

Best regards,
White Collar Realty Executive Hiring Desk`;
    }

    // Query reply template
    const queryPart = candidateQueryText ? `Regarding your question: "${candidateQueryText}"\n\n` : '';
    const answerBody = customReplyText || (selectedSmartAnswer ? SMART_ANSWERS.find(a => a.id === selectedSmartAnswer)?.text : `Thank you for reaching out to White Collar Realty HR. We are happy to clarify any questions regarding the ${candidate.appliedRole} position at our Sector 67 Gurugram HQ.`);

    return `Hello ${candidate.name},

This is Arjun from *White Collar Realty HR*.

${queryPart}${answerBody}

Please let us know if you need any further information or if you are ready to schedule your interview round at our Sector 67 Gurugram office.

📍 *Office:* ${venue}
Best regards,
Arjun | White Collar Realty`;
  };

  const messageText = getMessageContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const cleanPhoneNumber = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.startsWith('91') && digits.length === 12) return digits;
    return digits || '919876543210';
  };

  const handleOpenWhatsAppWeb = () => {
    const targetPhone = cleanPhoneNumber(phone);
    const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    
    if (onWhatsAppSent) {
      const note = `[WhatsApp Sent - ${templateType.toUpperCase()}] ${messageText.slice(0, 100)}...`;
      onWhatsAppSent(candidate.id, note);
    }
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1800);
  };

  const handleApplySmartAnswer = (option: SmartAnswerOption) => {
    setSelectedSmartAnswer(option.id);
    setCustomReplyText(option.text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-[#0d1526] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-[#0e221b] to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-['Space_Grotesk']">
                <span>WhatsApp Outreach & Candidate Query Reply</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Instant Channel
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Direct WhatsApp follow-up and fast candidate response handler for <strong className="text-slate-200">{candidate.name}</strong> ({candidate.appliedRole})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Template Selector Pills */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Follow-up Scenario / Query Action
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('unanswered')}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col gap-1 cursor-pointer ${
                  templateType === 'unanswered'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-xs'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Unanswered Call</span>
                  <PhoneMissed className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-[10px] text-slate-400">Request screening callback</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('interview_reminder')}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col gap-1 cursor-pointer ${
                  templateType === 'interview_reminder'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-xs'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Interview Reminder</span>
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-[10px] text-slate-400">Reconfirm Sector 67 F2F slot</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('missed_followup')}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col gap-1 cursor-pointer ${
                  templateType === 'missed_followup'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-200 shadow-xs'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Missed Interview</span>
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <span className="text-[10px] text-slate-400">Reschedule missed round</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('callback')}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col gap-1 cursor-pointer ${
                  templateType === 'callback'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-200 shadow-xs'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Callback Request</span>
                  <Phone className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <span className="text-[10px] text-slate-400">Follow up on requested time</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('query_reply')}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col gap-1 cursor-pointer ${
                  templateType === 'query_reply'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-xs'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Reply to Query</span>
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-[10px] text-slate-400">Answer specific questions</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('pipeline')}
                className={`p-2.5 rounded-xl text-left border transition flex flex-col gap-1 cursor-pointer ${
                  templateType === 'pipeline'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-xs'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">Talent Pipeline</span>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <span className="text-[10px] text-slate-400">90-day check-in & stay connected</span>
              </button>
            </div>
          </div>

          {/* Candidate Phone Number & Profile Quick Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Candidate Mobile Number (WhatsApp Target)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                Candidate Profile Info
              </label>
              <div className="text-slate-300 text-[11px] leading-relaxed flex items-center justify-between">
                <span>{candidate.appliedRole} • {candidate.location}</span>
                <span className="font-bold text-amber-400">{candidate.status}</span>
              </div>
            </div>
          </div>

          {/* Smart Answers for Candidate Queries (Shows when Query Reply is Active or on click) */}
          {templateType === 'query_reply' && (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Smart HR Quick Answers (White Collar Realty FAQ)</span>
                </span>
                <span className="text-[10px] text-emerald-400">Click to insert into reply</span>
              </div>

              {/* Candidate's original inquiry if present */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Candidate's Question / Query / Remark:
                </label>
                <input
                  type="text"
                  value={candidateQueryText}
                  onChange={(e) => setCandidateQueryText(e.target.value)}
                  placeholder="e.g. Where is the office? What are the job timings? What is the salary structure?"
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {SMART_ANSWERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleApplySmartAnswer(option)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer flex items-center gap-1 ${
                      selectedSmartAnswer === option.id
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Custom Answer Input */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Custom / Edited Answer Text:
                </label>
                <textarea
                  value={customReplyText}
                  onChange={(e) => setCustomReplyText(e.target.value)}
                  rows={2}
                  placeholder="Type or customize your HR response here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                />
              </div>
            </div>
          )}

          {/* Generated Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                WhatsApp Message Preview
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {messageText.length} characters
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-sans text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
              {messageText}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Message</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsAppWeb}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{sentSuccess ? 'Opening WhatsApp Web...' : 'Open in WhatsApp & Log'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
