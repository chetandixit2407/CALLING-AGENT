import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, Mic, MicOff, Volume2, VolumeX, Sparkles, Send, 
  Calendar, CheckCircle, Clock, Building2, Globe, AlertCircle, 
  Bot, User, UserX, RefreshCw, Mail, MessageSquare, Waves, Radio, Activity,
  Eye, EyeOff, HelpCircle, ExternalLink, Tag
} from 'lucide-react';
import { 
  Candidate, ChatMessage, CallScenario, ScreeningData, InterviewSlot,
  CandidateRemark, RemarkPriority, RemarkCategory,
  ConversationMemory, HrDecisionOutcome, AfterCallAction
} from '../types';
import { WHITE_COLLAR_JOB_DESCRIPTIONS } from '../data/jobDescriptions';
import { voiceAudio } from '../utils/audioSpeech';
import { GeminiLiveClient } from '../utils/geminiLiveClient';

interface VoiceCallModalProps {
  candidate: Candidate;
  scenario: CallScenario;
  availableSlots: InterviewSlot[];
  onClose: () => void;
  onCallEnded: (updatedCandidate: Candidate, bookedSlotId?: string) => void;
  onOpenWhatsApp?: (candidate: Candidate, template?: 'unanswered' | 'interview_reminder' | 'missed_followup' | 'callback' | 'pipeline' | 'query_reply', initialQuery?: string) => void;
  onOpenConfirmationMail?: (candidate: Candidate) => void;
  hideSalaryDetails?: boolean;
  onToggleHideSalary?: () => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  candidate,
  scenario,
  availableSlots,
  onClose,
  onCallEnded,
  onOpenWhatsApp,
  onOpenConfirmationMail,
  hideSalaryDetails = true,
  onToggleHideSalary,
}) => {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended' | 'error'>('ringing');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState<boolean>(false);
  const [isInterrupted, setIsInterrupted] = useState<boolean>(false);
  const [candidateVolume, setCandidateVolume] = useState<number>(0);
  const [agentVolume, setAgentVolume] = useState<number>(0);
  const [languageMode, setLanguageMode] = useState<'Auto' | 'English' | 'Hindi'>('Auto');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Local salary visibility toggle (syncs with prop or local toggle)
  const [hideSalary, setHideSalary] = useState<boolean>(hideSalaryDetails);

  useEffect(() => {
    setHideSalary(hideSalaryDetails);
  }, [hideSalaryDetails]);

  // Live extracted screening state during call
  const [extracted, setExtracted] = useState<Partial<ScreeningData>>(candidate.screening || {});
  const [detectedIntent, setDetectedIntent] = useState<string>('');
  const [bookedSlotId, setBookedSlotId] = useState<string | undefined>(candidate.interviewSlotId);
  const [callbackTime, setCallbackTime] = useState<string | undefined>(candidate.callbackTime);
  const [declineReason, setDeclineReason] = useState<string | undefined>(candidate.declineReason);
  const [statusRec, setStatusRec] = useState<string>(candidate.status);
  const [latestGeneratedRemark, setLatestGeneratedRemark] = useState<{
    text: string;
    priority: RemarkPriority;
    category: RemarkCategory;
    actionDueDate?: string;
  } | null>(candidate.latestRemark ? {
    text: candidate.latestRemark.text,
    priority: candidate.latestRemark.priority,
    category: candidate.latestRemark.category,
    actionDueDate: candidate.latestRemark.actionDueDate,
  } : null);

  const [conversationMemory, setConversationMemory] = useState<Partial<ConversationMemory>>(
    candidate.conversationMemory || {
      candidate_name: candidate.name,
      target_role: candidate.appliedRole,
      current_company: candidate.screening?.currentCompany || '',
      designation: candidate.screening?.currentDesignation || '',
      total_experience: candidate.screening?.totalExperienceYears ? `${candidate.screening.totalExperienceYears} years` : '',
      real_estate_experience: candidate.screening?.realEstateExperienceYears ? `${candidate.screening.realEstateExperienceYears} years` : '',
      gurgaon_experience: candidate.screening?.gurgaonDubaiExperience?.gurgaon ? 'Yes' : 'Unconfirmed',
      dubai_experience: candidate.screening?.gurgaonDubaiExperience?.dubai ? 'Yes' : 'No',
      current_salary: candidate.screening?.currentSalaryLPA || '',
      expected_salary: candidate.screening?.expectedSalaryLPA || '',
      salary_not_disclosed: false,
      current_location: candidate.screening?.currentLocation || '',
      notice_period: candidate.screening?.noticePeriodDays !== undefined ? `${candidate.screening.noticePeriodDays} days` : '',
      earliest_joining_date: candidate.screening?.earliestJoiningDate || '',
      interested: 'Yes',
      interview_date: candidate.interviewDate || '',
      interview_time: candidate.interviewTime || '',
      conversation_status: 'IN_PROGRESS',
      missing_information: [],
      next_action: 'Conduct initial screening',
    }
  );

  const [hrDecisionOutcome, setHrDecisionOutcome] = useState<HrDecisionOutcome | undefined>(candidate.hrDecisionOutcome);
  const [afterCallAction, setAfterCallAction] = useState<AfterCallAction | null>(candidate.afterCallAction || null);
  const [rightPanelTab, setRightPanelTab] = useState<'checklist' | 'memory' | 'action' | 'queries'>('checklist');

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const liveClientRef = useRef<GeminiLiveClient | null>(null);
  const interruptTimeoutRef = useRef<any>(null);
  const stopRingRef = useRef<(() => void) | null>(null);
  const isCallEndedRef = useRef<boolean>(false);

  // Synchronous, idempotent cleanup helper for call termination
  const terminateAudioPipeline = () => {
    isCallEndedRef.current = true;
    if (stopRingRef.current) {
      try {
        stopRingRef.current();
      } catch {}
      stopRingRef.current = null;
    }
    if (interruptTimeoutRef.current) {
      clearTimeout(interruptTimeoutRef.current);
      interruptTimeoutRef.current = null;
    }
    if (liveClientRef.current) {
      try {
        liveClientRef.current.stop();
      } catch {}
      liveClientRef.current = null;
    }
  };

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, isAgentSpeaking]);

  // Call timer interval
  useEffect(() => {
    let timer: any;
    if (callStatus === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  // Connect Gemini Live Client on Mount
  useEffect(() => {
    isCallEndedRef.current = false;

    // 1. Play ringing sound
    const stopRing = voiceAudio.playRing();
    stopRingRef.current = stopRing;

    // 2. Initialize GeminiLiveClient
    const client = new GeminiLiveClient();
    liveClientRef.current = client;

    // Callbacks setup
    client.onOpen = () => {
      if (isCallEndedRef.current) return;
      if (stopRingRef.current) {
        stopRingRef.current();
        stopRingRef.current = null;
      }
      setCallStatus('connected');
    };

    client.onClose = () => {
      if (!isCallEndedRef.current) {
        setCallStatus('ended');
      }
    };

    client.onError = (err) => {
      console.error('Gemini Live error:', err);
      if (stopRingRef.current) {
        stopRingRef.current();
        stopRingRef.current = null;
      }
      setErrorMessage(err.message || 'Connection error with Gemini Live API');
      setCallStatus('error');
    };

    client.onTranscript = (msg) => {
      setTranscript((prev) => {
        // If updating an in-progress message
        const existingIdx = prev.findIndex((m) => m.id === msg.id);
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = msg;
          return updated;
        }
        return [...prev, msg];
      });
    };

    client.onSpeaking = (speaking) => {
      setIsAgentSpeaking(speaking);
      if (speaking) {
        setIsInterrupted(false);
      }
    };

    client.onVolume = (vol) => {
      setAgentVolume(vol);
    };

    client.onCandidateVolume = (vol) => {
      setCandidateVolume(vol);
    };

    client.onInterrupted = () => {
      setIsInterrupted(true);
      setIsAgentSpeaking(false);
      if (interruptTimeoutRef.current) clearTimeout(interruptTimeoutRef.current);
      interruptTimeoutRef.current = setTimeout(() => {
        setIsInterrupted(false);
      }, 2500);
    };

    client.onToolCall = (name, args) => {
      console.log('Tool called from Live API:', name, args);
      handleLiveToolCall(name, args);
    };

    // Format available slots for prompt
    const formattedSlots = availableSlots
      .map((s) => `• Slot ID: "${s.id}" | ${s.displayLabel} (${s.date} at ${s.time})`)
      .join('\n');

    // Connect to WebSocket backend bridge
    client.connect({
      candidate,
      scenario,
      availableSlotsText: formattedSlots,
    });

    return () => {
      terminateAudioPipeline();
    };
  }, []);

  // Handle Real-Time Tool Calls executed by Gemini Live Agent
  const handleLiveToolCall = (name: string, args: any) => {
    if (name === 'recordScreeningDetails') {
      const {
        currentCompany,
        currentDesignation,
        totalExperienceYears,
        realEstateExperienceYears,
        gurgaonDubaiExperience,
        currentSalaryLPA,
        expectedSalaryLPA,
        currentLocation,
        noticePeriodDays,
        earliestJoiningDate,
        keyStrengths,
        summaryNotes,
        programmingLanguages,
        projectsDiscussed,
        candidateQueries,
      } = args;

      setExtracted((prev) => ({
        ...prev,
        ...(currentCompany ? { currentCompany } : {}),
        ...(currentDesignation ? { currentDesignation } : {}),
        ...(totalExperienceYears !== undefined ? { totalExperienceYears } : {}),
        ...(realEstateExperienceYears !== undefined ? { realEstateExperienceYears } : {}),
        ...(gurgaonDubaiExperience ? { gurgaonDubaiExperience } : {}),
        ...(currentSalaryLPA ? { currentSalaryLPA } : {}),
        ...(expectedSalaryLPA ? { expectedSalaryLPA } : {}),
        ...(currentLocation ? { currentLocation } : {}),
        ...(noticePeriodDays !== undefined ? { noticePeriodDays } : {}),
        ...(earliestJoiningDate ? { earliestJoiningDate } : {}),
        ...(keyStrengths ? { keyStrengths } : {}),
        ...(programmingLanguages ? { programmingLanguages } : {}),
        ...(projectsDiscussed ? { projectsDiscussed } : {}),
      }));

      // Auto update conversation memory
      setConversationMemory((prev) => ({
        ...prev,
        current_company: currentCompany || prev.current_company,
        designation: currentDesignation || prev.designation,
        total_experience: totalExperienceYears ? `${totalExperienceYears} years` : prev.total_experience,
        real_estate_experience: realEstateExperienceYears ? `${realEstateExperienceYears} years` : prev.real_estate_experience,
        gurgaon_experience: gurgaonDubaiExperience?.gurgaon ? 'Yes' : prev.gurgaon_experience,
        dubai_experience: gurgaonDubaiExperience?.dubai ? 'Yes' : prev.dubai_experience,
        current_salary: currentSalaryLPA || prev.current_salary,
        expected_salary: expectedSalaryLPA || prev.expected_salary,
        current_location: currentLocation || prev.current_location,
        notice_period: noticePeriodDays !== undefined ? `${noticePeriodDays} days` : prev.notice_period,
        earliest_joining_date: earliestJoiningDate || prev.earliest_joining_date,
      }));

      setStatusRec('Screening Completed');
    }

    if (name === 'bookInterviewSlot') {
      const { slotId, candidateName, date, time } = args;
      setBookedSlotId(slotId);
      setStatusRec('Interview Scheduled');
      setDetectedIntent('confirm_interview');
      setConversationMemory((prev) => ({
        ...prev,
        interview_date: date || prev.interview_date,
        interview_time: time || prev.interview_time,
        next_action: 'Send Sector 67 M3M Urbana confirmation letter and WhatsApp invite',
      }));
    }

    if (name === 'requestCallback') {
      const { time } = args;
      setCallbackTime(time);
      setStatusRec('Callback Requested');
      setDetectedIntent('callback');
      setConversationMemory((prev) => ({
        ...prev,
        next_action: `Follow up via phone / WhatsApp at ${time}`,
      }));
    }

    if (name === 'markNotInterested') {
      const { reason } = args;
      setDeclineReason(reason);
      setStatusRec('Not Interested');
      setDetectedIntent('decline');
      setConversationMemory((prev) => ({
        ...prev,
        interested: 'No',
        next_action: 'Archive or add to 90-day talent pipeline',
      }));
    }

    if (name === 'logAutonomousRemark') {
      const { text, priority, category, actionDueDate } = args;
      setLatestGeneratedRemark({
        text,
        priority: priority || 'Medium',
        category: category || 'Screening Notes',
        actionDueDate: actionDueDate || 'Today',
      });
    }

    if (name === 'finalizeCallAssessment') {
      const { outcome, afterAction } = args;
      if (outcome) setHrDecisionOutcome(outcome);
      if (afterAction) setAfterCallAction(afterAction);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (liveClientRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      liveClientRef.current.setMuted(nextMute);
    }
  };

  // Manual Interrupt Button (Instant Barge-In)
  const handleInterruptAgent = () => {
    if (liveClientRef.current && isAgentSpeaking) {
      liveClientRef.current.interruptAgent();
      setIsInterrupted(true);
      setIsAgentSpeaking(false);
      setTimeout(() => setIsInterrupted(false), 2000);
    }
  };

  // Send candidate text message into Gemini Live session
  const handleSendMessage = (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || !liveClientRef.current) return;

    // Send to Live WebSocket
    liveClientRef.current.sendText(textToSend);
    setInputMessage('');
  };

  // Smart Answer Quick Responses for Candidate FAQ Queries
  const SMART_QUERY_ANSWERS = [
    {
      id: 'location',
      title: '🏢 Office Location',
      query: 'Where is your office located?',
      voiceText: 'White Collar Realty corporate office is on the 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram.',
    },
    {
      id: 'timings',
      title: '⏰ Timings & Tuesday Off',
      query: 'What are the office timings and weekly off?',
      voiceText: 'Our working hours are 10:00 AM to 6:30 PM, six days a week with Tuesday off, as weekends are active client site visit days.',
    },
    {
      id: 'process',
      title: '🎯 2-Round Process',
      query: 'What is the interview process?',
      voiceText: 'We have two rounds: this preliminary HR screening call, followed by a face-to-face discussion with our Director at our Sector 67 Gurugram HQ.',
    },
    {
      id: 'leads',
      title: '💼 Leads & CRM Support',
      query: 'Do you provide verified leads?',
      voiceText: 'Yes, White Collar Realty provides high-intent verified digital portal leads, top developer campaigns, and enterprise CRM tooling.',
    },
    {
      id: 'travel',
      title: '🚗 Site Visit Travel',
      query: 'Is conveyance allowance provided?',
      voiceText: 'Yes, dedicated conveyance allowance and reimbursement are provided for all scheduled client site visits across Gurgaon and NCR.',
    },
    {
      id: 'tech',
      title: '💻 Tech Stack & Projects',
      query: 'What is the tech stack for engineering roles?',
      voiceText: 'For tech positions, our stack comprises TypeScript, React, Node.js, Python, REST APIs, and Gemini AI integrations for telephony and CRM.',
    },
  ];

  // Quick Reply handler for Candidate Queries (Voice or WhatsApp)
  const handleReplyCandidateQuery = (queryAnswer: typeof SMART_QUERY_ANSWERS[0], mode: 'voice' | 'whatsapp') => {
    if (mode === 'voice') {
      handleSendMessage(queryAnswer.voiceText);
    } else if (onOpenWhatsApp) {
      onOpenWhatsApp(candidate, 'query_reply', queryAnswer.query);
    }
  };

  // Simulate unanswered call
  const handleSimulateUnanswered = () => {
    terminateAudioPipeline();
    setCallStatus('ended');

    const updatedCandidate: Candidate = {
      ...candidate,
      status: 'Call Unanswered',
      lastCallDate: new Date().toISOString().split('T')[0],
      callHistory: [
        {
          id: `call-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          duration: '0:00',
          scenario,
          outcome: 'Unanswered',
          summary: 'Candidate did not answer after multiple rings. Queued for automated WhatsApp / SMS reminder sequence.',
        },
        ...candidate.callHistory,
      ],
      latestRemark: {
        id: `rem-${Date.now()}`,
        author: 'Arjun (Virtual HR)',
        category: 'Outreach & Followup',
        priority: 'High',
        actionDueDate: 'Today',
        text: 'Voice call unanswered after ringing. Sent to WhatsApp reconfirmation queue.',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    };

    onCallEnded(updatedCandidate);
  };

  // End Call and persist extracted criteria
  const handleEndCall = () => {
    terminateAudioPipeline();
    setCallStatus('ended');

    // Build structured summary snippet
    const summaryLines = [
      `[AI Voice Call Summary - ${new Date().toLocaleDateString()}]`,
      `Scenario: ${scenario.toUpperCase()}`,
      `Duration: ${formatTime(callDuration)}`,
      `Employer: ${extracted.currentCompany || 'Not recorded'} | Role: ${extracted.currentDesignation || 'Not recorded'}`,
      `Real Estate Exp: ${extracted.realEstateExperienceYears ? `${extracted.realEstateExperienceYears} yrs` : 'Not specified'}`,
      `Gurgaon Exposure: ${extracted.gurgaonDubaiExperience?.gurgaon ? 'Yes' : 'No'} | Dubai Exposure: ${extracted.gurgaonDubaiExperience?.dubai ? 'Yes' : 'No'}`,
      `Salary: ${extracted.currentSalaryLPA || 'Confidential'} (Current) | ${extracted.expectedSalaryLPA || 'Confidential'} (Expected)`,
      `Notice: ${extracted.noticePeriodDays !== undefined ? `${extracted.noticePeriodDays} days` : 'Immediate'}`,
      `Location: ${extracted.currentLocation || candidate.location}`,
      bookedSlotId ? `Scheduled Round 2 F2F at Sector 67 HQ (Slot: ${bookedSlotId})` : `Final Status: ${statusRec}`,
    ].join('\n');

    const newSnippet = {
      id: `snippet-${Date.now()}`,
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: 'Arjun (Virtual HR)',
      title: `${scenario.toUpperCase()} Call Summary`,
      snippet: summaryLines,
    };

    const updatedCandidate: Candidate = {
      ...candidate,
      status: statusRec,
      interviewSlotId: bookedSlotId || candidate.interviewSlotId,
      interviewDate: bookedSlotId 
        ? availableSlots.find((s) => s.id === bookedSlotId)?.date || candidate.interviewDate 
        : candidate.interviewDate,
      interviewTime: bookedSlotId 
        ? availableSlots.find((s) => s.id === bookedSlotId)?.time || candidate.interviewTime 
        : candidate.interviewTime,
      callbackTime: callbackTime || candidate.callbackTime,
      declineReason: declineReason || candidate.declineReason,
      lastCallDate: new Date().toISOString().split('T')[0],
      screening: {
        ...candidate.screening,
        ...extracted,
      },
      latestRemark: latestGeneratedRemark ? {
        id: `rem-${Date.now()}`,
        author: 'Arjun (Virtual HR)',
        category: latestGeneratedRemark.category,
        priority: latestGeneratedRemark.priority,
        actionDueDate: latestGeneratedRemark.actionDueDate || 'Today',
        text: latestGeneratedRemark.text,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      } : candidate.latestRemark,
      notes: candidate.notes ? `${summaryLines}\n\n---\n\n${candidate.notes}` : summaryLines,
      lastNotesAutoSavedAt: new Date().toISOString(),
      notesHistory: [newSnippet, ...(candidate.notesHistory || [])],
      callHistory: [
        {
          id: `call-${Date.now()}`,
          timestamp: new Date().toLocaleString(),
          duration: formatTime(callDuration),
          scenario,
          outcome: statusRec,
          summary: summaryLines,
          transcript,
        },
        ...candidate.callHistory,
      ],
    };

    onCallEnded(updatedCandidate, bookedSlotId);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Quick testing response chips
  const getQuickResponseChips = () => {
    if (scenario === 'reminder') {
      return [
        { label: 'Yes, Attendance Confirmed', text: 'Haanji, I will definitely attend tomorrow at 11:00 AM at your Sector 67 M3M Urbana office.' },
        { label: 'Need to Reschedule', text: 'Actually I have an urgent client visit tomorrow. Can we reschedule to day after tomorrow 3:30 PM?' },
        { label: 'Accepted Another Offer (Decline)', text: 'I have already accepted an offer with another real estate firm, so please cancel.' },
      ];
    }

    if (scenario === 'missed_followup') {
      return [
        { label: 'Apologies, Reschedule', text: 'Extremely sorry, I was held up in emergency travel. Can we reschedule for tomorrow at 2:30 PM?' },
        { label: 'Not Interested Any More', text: 'I am no longer exploring real estate job opportunities. Please close my file.' },
      ];
    }

    const turns = transcript.filter((m) => m.sender === 'candidate').length;
    const commonChips = [
      { label: '🌟 Dubai Exp (3 Years)', text: "I've worked in Dubai luxury real estate for three years." },
      { label: '🌟 DLF + Gurgaon (4 Years)', text: "I'm currently working with DLF Homes in Gurgaon for four years." },
      { label: '🌟 Office Location?', text: 'Where exactly is your office located in Gurgaon?' },
      { label: '🌟 Hinglish Reply', text: 'Haanji main Gurgaon luxury projects mein hi work kar raha hoon.' },
    ];

    if (turns === 0) {
      return [
        { label: 'Yes, speaking', text: 'Yes, speaking.' },
        { label: 'Haanji, main bol raha hu', text: 'Haanji, main bol raha hoon.' },
        { label: 'Wrong number', text: 'No, this is wrong number.' },
        ...commonChips,
      ];
    } else if (turns === 1) {
      return [
        { label: 'Yes, have 2 mins', text: 'Yes, I can speak for two minutes.' },
        { label: 'Haanji, boliye', text: 'Haanji bilkul, kahiye.' },
        { label: 'Office Timings?', text: 'What are the working days and office timings?' },
        { label: 'Driving / Call back at 5:30', text: 'I am driving right now. Please call me back today at 5:30 PM.' },
        ...commonChips,
      ];
    } else if (turns === 2) {
      return [
        { label: 'Square Yards, 4 Yrs Gurgaon', text: 'I am working with Square Yards as Senior Consultant with 4 years experience in Gurgaon luxury residential sales.' },
        { label: 'DLF Consultant, Dubai + Gurgaon', text: 'Currently with DLF Homes with 5 years real estate experience across Gurgaon and Dubai.' },
        { label: 'Tech Stack (React, Node, Python)', text: 'I built real-time CRM telephony tools using React, Node.js, and Python FastAPI.' },
        ...commonChips,
      ];
    } else if (turns === 3) {
      return [
        { label: 'CTC: 10 LPA Present, 14 Expected', text: 'My current fixed salary is 10 LPA and I am expecting around 14 LPA.' },
        { label: 'Prefer Not To Disclose', text: 'I would prefer not to disclose my current salary, but I am expecting around 13 to 14 LPA.' },
        ...commonChips,
      ];
    } else if (turns === 4) {
      return [
        { label: 'Gurgaon, 15 Days Notice', text: 'I stay in Sector 54 Gurgaon, and my notice period is 15 days.' },
        { label: 'Immediate Joiner, DLF Phase 2', text: 'I stay in DLF Phase 2 Gurugram, ready to join immediately as I have served my notice.' },
        ...commonChips,
      ];
    } else {
      return [
        { label: 'Confirm Tomorrow 02:30 PM', text: 'Tomorrow at 2:30 PM works great for me at your Sector 67 office.' },
        { label: 'Confirm Tomorrow 04:30 PM', text: 'Tomorrow at 4:30 PM fits my schedule best.' },
        { label: 'Reschedule Friday 12 PM', text: 'Can we reschedule to Friday at 12:00 PM instead?' },
        ...commonChips,
      ];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl bg-[#0a1120] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#0f1d33] to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-amber-500/20 border border-amber-400/40">
                {candidate.name.substring(0, 2).toUpperCase()}
              </div>
              {callStatus === 'connected' && (
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0e172a]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  {candidate.name}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {scenario === 'screening' ? 'Screening Call' : scenario === 'reminder' ? 'Reconfirmation Call' : scenario === 'missed_followup' ? 'Missed Follow-up' : 'Callback Follow-up'}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{candidate.appliedRole}</span>
                <span>•</span>
                <span className="font-mono text-slate-300">{candidate.phone}</span>
              </p>
            </div>
          </div>

          {/* Call Status, Quick Salary Privacy & WhatsApp Action */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Quick Hide/Show Salary Button */}
            <button
              type="button"
              onClick={() => {
                setHideSalary(!hideSalary);
                if (onToggleHideSalary) onToggleHideSalary();
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                hideSalary 
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title={hideSalary ? 'Salary details are hidden (Confidential mode)' : 'Salary details are visible'}
            >
              {hideSalary ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{hideSalary ? 'Salary Hidden' : 'Salary Visible'}</span>
            </button>

            {/* Direct WhatsApp Followup Button in Header */}
            {onOpenWhatsApp && (
              <button
                type="button"
                onClick={() => onOpenWhatsApp(
                  candidate, 
                  candidate.status === 'Missed Interview - Followup' 
                    ? 'missed_followup' 
                    : bookedSlotId 
                    ? 'interview_reminder' 
                    : 'unanswered'
                )}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Send direct WhatsApp reminder / follow-up"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            {callStatus === 'ringing' ? (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3.5 py-1.5 rounded-lg text-xs font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Ringing...</span>
              </div>
            ) : callStatus === 'connected' ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-lg text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono">{formatTime(callDuration)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3.5 py-1.5 rounded-lg text-xs font-semibold">
                <span>Call Ended</span>
              </div>
            )}

            <button
              onClick={handleEndCall}
              className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-xl transition shadow-md shadow-rose-600/20 cursor-pointer"
              title="Hang up call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gemini Live API Status Bar */}
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 sm:px-5 py-2 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Live Recruiter Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300">
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">Arjun: Virtual AI HR</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-300 font-mono text-[10px]">Gemini Live Voice</span>
            </div>

            {/* Audio Wave / Speaking State Indicator */}
            {isAgentSpeaking ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30 text-[11px] text-amber-300 animate-pulse">
                  <div className="flex items-end gap-0.5 h-3.5 px-0.5">
                    <span className="w-1 bg-amber-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, agentVolume * 0.16)}px` }} />
                    <span className="w-1 bg-amber-300 rounded-full transition-all duration-75" style={{ height: `${Math.max(6, agentVolume * 0.22)}px` }} />
                    <span className="w-1 bg-amber-400 rounded-full transition-all duration-75" style={{ height: `${Math.max(4, agentVolume * 0.14)}px` }} />
                  </div>
                  <span className="font-bold tracking-tight">Arjun Speaking (Natural HR Tone)</span>
                </div>
                <button
                  type="button"
                  onClick={handleInterruptAgent}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/35 text-rose-200 border border-rose-500/50 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Interrupt Arjun speaking (Instant Barge-In)"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>⚡ Interrupt</span>
                </button>
              </div>
            ) : isInterrupted ? (
              <div className="flex items-center gap-1.5 bg-rose-950/70 px-2.5 py-1 rounded-lg border border-rose-500/40 text-[11px] text-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                <span className="font-bold">⚡ Barge-In: Floor yielded to candidate</span>
              </div>
            ) : callStatus === 'connected' ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-emerald-950/70 px-2.5 py-1 rounded-lg border border-emerald-500/40 text-[11px] text-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold">Live Mic Listening (16kHz Stream)</span>
                </div>
                {candidateVolume > 10 && (
                  <div className="flex items-center gap-1 text-[11px] text-cyan-300 bg-cyan-950/40 px-2 py-1 rounded border border-cyan-500/30">
                    <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>Candidate Speaking</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Quick Simulation: Unanswered */}
          {callStatus === 'ringing' && (
            <button
              onClick={handleSimulateUnanswered}
              className="text-slate-400 hover:text-amber-300 underline text-[11px] transition cursor-pointer"
            >
              Simulate: &quot;Candidate Didn&apos;t Answer&quot;
            </button>
          )}

          {/* Right Controls: Mic Mute & Language */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMute}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isMuted ? 'Muted' : 'Mic Live'}</span>
            </button>

            {/* Language Pill */}
            <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/80 px-2 py-1 rounded border border-slate-700/60">
              <Globe className="w-3 h-3 text-amber-400" />
              <span>Hinglish / English</span>
            </div>
          </div>
        </div>

        {/* Modal Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-[500px] overflow-hidden">
          {/* Left 7 cols: Live Transcript & Interactive Query Reply / Input */}
          <div className="lg:col-span-7 flex flex-col min-h-0 border-r border-slate-800 bg-[#080e1a]">
            {/* Transcript Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {transcript.length === 0 && callStatus === 'ringing' && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-bounce">
                    <PhoneOff className="w-8 h-8 text-amber-400 rotate-135" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">Connecting with {candidate.name}...</h4>
                    <p className="text-slate-400 text-xs mt-1 max-w-xs">
                      Establishing real-time bidirectional audio connection with Gemini Live API.
                    </p>
                  </div>
                </div>
              )}

              {transcript.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1 max-w-[88%] ${
                    msg.sender === 'agent'
                      ? 'mr-auto items-start'
                      : msg.sender === 'candidate'
                      ? 'ml-auto items-end'
                      : 'mx-auto items-center text-center'
                  }`}
                >
                  <div
                    className={`flex gap-2.5 ${
                      msg.sender === 'candidate' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {msg.sender !== 'system' && (
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                          msg.sender === 'agent'
                            ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white'
                            : 'bg-cyan-600 text-white'
                        }`}
                      >
                        {msg.sender === 'agent' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                        msg.sender === 'agent'
                          ? 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm'
                          : msg.sender === 'candidate'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium rounded-tr-sm'
                          : 'bg-slate-800/80 text-slate-300 text-[11px] rounded-lg'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold ${
                            msg.sender === 'agent'
                              ? 'text-amber-400'
                              : msg.sender === 'candidate'
                              ? 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {msg.sender === 'agent' ? 'Arjun (Virtual HR)' : msg.sender === 'candidate' ? candidate.name : 'System'}
                        </span>
                        <span
                          className={`text-[9px] ${
                            msg.sender === 'candidate' ? 'text-slate-800' : 'text-slate-400'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>

                  {/* Candidate Message Quick Actions: Reply to Query on WhatsApp */}
                  {msg.sender === 'candidate' && onOpenWhatsApp && (
                    <div className="flex items-center gap-1.5 mt-0.5 pr-9">
                      <button
                        type="button"
                        onClick={() => onOpenWhatsApp(candidate, 'query_reply', msg.text)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 transition cursor-pointer"
                        title="Reply to this candidate message via WhatsApp"
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>Reply on WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInputMessage(`Regarding your point: "${msg.text.slice(0, 40)}...", `)}
                        className="text-[10px] text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 px-2 py-0.5 rounded-full transition cursor-pointer"
                        title="Draft live voice reply"
                      >
                        <span>Voice Reply</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 max-w-[200px]">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Arjun processing...</span>
                </div>
              )}

              <div ref={transcriptEndRef} />
            </div>

            {/* Quick Smart FAQ Answers & Quick Responses */}
            <div className="bg-slate-950 border-t border-slate-800/80 p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Candidate Response Chips & FAQ Replies</span>
                </span>
                <span className="text-[10px] text-slate-400">Click to send or speak into mic</span>
              </div>

              {/* Simulation candidate chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {getQuickResponseChips().map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip.text)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-amber-300 text-[11px] font-medium transition cursor-pointer shrink-0 shadow-xs active:scale-95"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Text Input Bar with Voice Send and WhatsApp Reply Actions */}
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder="Type candidate response or HR voice message..."
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/80 font-sans"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 p-2 rounded-xl transition cursor-pointer shrink-0 shadow-sm"
                  title="Send to Live Voice Stream"
                >
                  <Send className="w-4 h-4" />
                </button>

                {onOpenWhatsApp && (
                  <button
                    type="button"
                    onClick={() => onOpenWhatsApp(candidate, 'query_reply', inputMessage || undefined)}
                    className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 p-2 rounded-xl transition cursor-pointer shrink-0"
                    title="Send / Open reply on WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right 5 cols: Live Screening Dashboard & Real-Time Tool Actions */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-[#0c1424] p-4 overflow-y-auto space-y-3.5">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setRightPanelTab('checklist')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer text-center ${
                  rightPanelTab === 'checklist'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Screening
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('queries')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer text-center ${
                  rightPanelTab === 'queries'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reply Query
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('memory')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer text-center ${
                  rightPanelTab === 'memory'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live Memory
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('action')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer text-center ${
                  rightPanelTab === 'action'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Action
              </button>
            </div>

            {/* TAB 1: Real-Time Checklist */}
            {rightPanelTab === 'checklist' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Screening Criteria
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHideSalary(!hideSalary)}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {hideSalary ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{hideSalary ? 'Salary Masked' : 'Salary Shown'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Current Company */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Current Employer:</span>
                    <span className="font-semibold text-white">
                      {extracted.currentCompany || 'Pending response'}
                    </span>
                  </div>

                  {/* Designation */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Designation:</span>
                    <span className="font-semibold text-white">
                      {extracted.currentDesignation || 'Pending response'}
                    </span>
                  </div>

                  {/* Real Estate Exp */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Real Estate Sales Exp:</span>
                    <span className="font-semibold text-emerald-400">
                      {extracted.realEstateExperienceYears !== undefined ? `${extracted.realEstateExperienceYears} Years` : 'Pending'}
                    </span>
                  </div>

                  {/* Gurgaon / Dubai Exp */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target Markets:</span>
                      <div className="flex gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${extracted.gurgaonDubaiExperience?.gurgaon ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          Gurgaon: {extracted.gurgaonDubaiExperience?.gurgaon ? '✓ Yes' : 'Pending'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${extracted.gurgaonDubaiExperience?.dubai ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          Dubai: {extracted.gurgaonDubaiExperience?.dubai ? '✓ Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Salary Fixed & Expected (Masked when hideSalary is active) */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Fixed / Expected CTC:</span>
                    {hideSalary ? (
                      <span className="text-amber-400/90 font-mono text-[11px] flex items-center gap-1">
                        <EyeOff className="w-3 h-3" />
                        <span>Confidential (Masked)</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-300 font-mono">
                        {extracted.currentSalaryLPA ? `${extracted.currentSalaryLPA} / ${extracted.expectedSalaryLPA || 'TBD'}` : 'Pending disclosure'}
                      </span>
                    )}
                  </div>

                  {/* Notice Period */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Notice Period:</span>
                    <span className="font-semibold text-white">
                      {extracted.noticePeriodDays !== undefined ? `${extracted.noticePeriodDays} Days` : 'Pending'}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400">Current Location:</span>
                    <span className="font-semibold text-white">
                      {extracted.currentLocation || candidate.location}
                    </span>
                  </div>
                </div>

                {/* Available Face-to-Face Slots */}
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 font-bold text-[11px] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Gurgaon HQ Slots (Sector 67)</span>
                    </span>
                    {bookedSlotId && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        Slot Booked
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          setBookedSlotId(slot.id);
                          setStatusRec('Interview Scheduled');
                          setDetectedIntent('confirm_interview');
                          if (liveClientRef.current) {
                            liveClientRef.current.sendText(`Candidate selected slot: ${slot.displayLabel}`);
                          }
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition border cursor-pointer ${
                          bookedSlotId === slot.id
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                            : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-white">{slot.displayLabel}</div>
                          <div className="text-[10px] text-slate-400">{slot.time} • Room 6B</div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${bookedSlotId === slot.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                          {bookedSlotId === slot.id ? 'Selected' : 'Select'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Quick Candidate Query Reply */}
            {rightPanelTab === 'queries' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Candidate Query Answers & WhatsApp Replies</span>
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click below to instantly answer candidate questions in the <strong>Live Voice Call</strong> or dispatch a structured <strong>WhatsApp Response</strong>:
                </p>

                <div className="space-y-2">
                  {SMART_QUERY_ANSWERS.map((ans) => (
                    <div
                      key={ans.id}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{ans.title}</span>
                        <span className="text-[10px] text-slate-500">{ans.query}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        {ans.voiceText}
                      </p>
                      <div className="flex items-center gap-2 pt-1 justify-end">
                        <button
                          type="button"
                          onClick={() => handleReplyCandidateQuery(ans, 'voice')}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Speak answer in live voice call"
                        >
                          <Volume2 className="w-3 h-3 text-amber-400" />
                          <span>Speak in Call</span>
                        </button>

                        {onOpenWhatsApp && (
                          <button
                            type="button"
                            onClick={() => handleReplyCandidateQuery(ans, 'whatsapp')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Open in WhatsApp reply template"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-400" />
                            <span>Reply via WhatsApp</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Live Memory Inspector */}
            {rightPanelTab === 'memory' && (
              <div className="space-y-2 text-[11px]">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-amber-400 text-xs border-b border-slate-800 pb-1">
                    Active Recruiter Memory State
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Candidate</span>
                      <span className="font-bold text-white">{conversationMemory.candidate_name}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Target Role</span>
                      <span className="font-bold text-white">{conversationMemory.target_role}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Current Company</span>
                      <span className="font-bold text-white">{conversationMemory.current_company || '—'}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Designation</span>
                      <span className="font-bold text-white">{conversationMemory.designation || '—'}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Real Estate Exp</span>
                      <span className="font-bold text-emerald-400">{conversationMemory.real_estate_experience || '—'}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 block">Expected CTC</span>
                      <span className="font-bold text-emerald-300">
                        {hideSalary ? 'Confidential (Masked)' : conversationMemory.expected_salary || '—'}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800 mt-2">
                    <span className="text-slate-400 text-[10px] block">Next Action:</span>
                    <span className="font-bold text-amber-400">{conversationMemory.next_action || 'Screening in progress'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Action Record */}
            {rightPanelTab === 'action' && (
              <div className="space-y-3 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2.5 text-[11px]">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Target Role:</span>
                    <span className="font-bold text-white">{afterCallAction?.target_role || candidate.appliedRole}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Interview Status:</span>
                    <span className="font-semibold text-amber-300">
                      {bookedSlotId ? 'SCHEDULED' : 'PENDING_SLOT'}
                    </span>
                  </div>
                  <div className="pb-2 border-b border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Corporate HQ:</span>
                    <span className="text-white text-[10px] leading-tight block">
                      6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">HR Remarks:</span>
                    <p className="text-slate-200 text-[11px] bg-slate-950/80 p-2 rounded border border-slate-800 leading-relaxed">
                      {latestGeneratedRemark?.text || 'Screening evaluated by Arjun Virtual AI HR Recruiter.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Complete Call Actions */}
            <div className="pt-3 border-t border-slate-800 space-y-2 mt-auto">
              {bookedSlotId && onOpenConfirmationMail && (
                <button
                  type="button"
                  onClick={() => onOpenConfirmationMail(candidate)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Confirmation Interview Mail</span>
                </button>
              )}

              {onOpenWhatsApp && (
                <button
                  type="button"
                  onClick={() => onOpenWhatsApp(
                    candidate, 
                    candidate.status === 'Missed Interview - Followup' 
                      ? 'missed_followup' 
                      : bookedSlotId 
                      ? 'interview_reminder' 
                      : 'unanswered'
                  )}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send WhatsApp Followup & Reply</span>
                </button>
              )}

              <button
                id="btn-end-call-update"
                onClick={handleEndCall}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save Call & Update Candidate</span>
              </button>

              <button
                onClick={handleEndCall}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Hang Up Immediately</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
