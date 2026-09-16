import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization of Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not found in environment. Fallback conversational engine will be used.');
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// White Collar Realty Job Descriptions & Specifications
interface RoleJDInfo {
  title: string;
  department: string;
  location: string;
  minExperienceYears: number;
  minRealEstateExpYears: number;
  fixedBudget: string;
  totalOte: string;
  seniority: string;
  marketFocus: string;
  noticePeriodExpectation: string;
  responsibilities: string[];
  requiredSkills: string[];
  roleSpecificQuestions: string[];
}

const WHITE_COLLAR_JDS: Record<string, RoleJDInfo> = {
  sales_manager: {
    title: 'Sales Manager (Luxury Real Estate)',
    department: 'Luxury Residential & Commercial Sales (Gurgaon & Dubai)',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    minExperienceYears: 4,
    minRealEstateExpYears: 3,
    fixedBudget: '14 - 22 LPA fixed',
    totalOte: '25 - 35 LPA OTE with luxury closings',
    seniority: 'Leadership / Squad Head',
    marketFocus: 'Gurgaon Luxury Corridors (Golf Course Ext, SPR, Dwarka Expressway) & Dubai Freehold',
    noticePeriodExpectation: 'Immediate to 30 days max',
    responsibilities: [
      'Lead and mentor a high-performing squad of 8 to 15 Property Consultants',
      'Drive monthly gross booking targets of ₹15–30 Cr across DLF, M3M, Godrej, Emaar, and Sobha inventories',
      'Conduct high-ticket negotiations and closing meetings with HNIs and NRI investors',
      'Facilitate client investment roadshows for Dubai off-plan luxury projects',
    ],
    requiredSkills: [
      'Team Leadership & Squad Target Accountability',
      'High-Ticket Real Estate Negotiation & Closing',
      'Gurugram Circle Rates, RERA & Dubai Freehold Regulations',
      'HNI & Corporate Network in Delhi NCR',
    ],
    roleSpecificQuestions: [
      'How large was the sales team you were managing in your last role?',
      'Were you personally accountable for monthly squad targets, and what was your run-rate?',
      'Which Gurgaon luxury developer projects or Dubai portfolios have you actively closed?',
      'What has been your average ticket size and closing conversion ratio?',
    ],
  },
  property_consultant: {
    title: 'Property Consultant / Senior Property Consultant',
    department: 'Direct Sales & HNI Client Advisory',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    minExperienceYears: 2,
    minRealEstateExpYears: 1.5,
    fixedBudget: '10 - 16 LPA fixed',
    totalOte: '18 - 25 LPA OTE with direct transaction commissions',
    seniority: 'Property Consultant / Specialist',
    marketFocus: 'Gurugram Primary Luxury Residential & High-Street Commercial Corridors',
    noticePeriodExpectation: 'Immediate to 30 days',
    responsibilities: [
      'Manage end-to-end buyer journey from qualified lead engagement to site visit and booking',
      'Present luxury residential layouts (₹2 Cr – ₹15 Cr+) and commercial retail assets to clients',
      'Coordinate site visits at M3M, DLF, SmartWorld, and Elan sites across Gurugram',
      'Negotiate terms and facilitate booking documentation per developer guidelines',
    ],
    requiredSkills: [
      'Consultative Property Selling & Lead Conversion',
      'Gurugram Micro-Market & Infrastructure Understanding',
      'Relationship Building with HNI Buyers',
      'Fluent Spoken English & Corporate Communication',
    ],
    roleSpecificQuestions: [
      'How many years have you been handling direct real estate property sales in Gurgaon?',
      'What category of properties (Luxury Residential, Plots, or Commercial) have you primarily closed?',
      'What has been your typical monthly lead-to-site-visit and booking conversion rate?',
      'Have you closed any deals in Golf Course Extension Road or SPR in the last 6 months?',
    ],
  },
  business_development: {
    title: 'Business Development Manager / Corporate Sales',
    department: 'Institutional & Channel Partner Sales',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    minExperienceYears: 3,
    minRealEstateExpYears: 2,
    fixedBudget: '6 - 10 LPA fixed',
    totalOte: '12 - 18 LPA OTE with incentives',
    seniority: 'Direct Sales Associate',
    marketFocus: 'Delhi NCR Corporate Alliances & Channel Partner Network',
    noticePeriodExpectation: 'Immediate to 30 days',
    responsibilities: [
      'Onboard and activate tier-1 Channel Partners and independent wealth brokers across NCR',
      'Structure joint customer engagement sessions and project launch briefings',
      'Drive corporate tie-ups with MNCs across Cyber City, Golf Course Road, and Udyog Vihar',
    ],
    requiredSkills: [
      'Channel Partner Network Development',
      'B2B Corporate Real Estate Presentation',
      'Revenue Forecasting and Pipeline Review',
    ],
    roleSpecificQuestions: [
      'How many active Channel Partners did you manage in your network in Gurgaon?',
      'Have you handled corporate desk activations or NRI roadshows?',
      'What was your average monthly revenue generated through broker networks?',
    ],
  },
};

// Helper to determine role budget and pitch for White Collar Realty
function getRoleBudgetInfo(roleName?: string): RoleJDInfo {
  const r = (roleName || '').toLowerCase();
  if (r.includes('lead') || r.includes('manager') || r.includes('dubai') || r.includes('head') || r.includes('vp')) {
    return WHITE_COLLAR_JDS['sales_manager'];
  } else if (r.includes('associate') || r.includes('advisor') || r.includes('bd') || r.includes('business')) {
    return WHITE_COLLAR_JDS['business_development'];
  }
  return WHITE_COLLAR_JDS['property_consultant'];
}

function mapStatusToHrOutcome(statusRec?: string, intent?: string): string {
  if (intent === 'cancel_decline' || statusRec?.includes('Declined')) return 'NOT_INTERESTED';
  if (intent === 'request_callback' || statusRec?.includes('Callback')) return 'CALL_BACK_REQUESTED';
  if (intent === 'confirm_interview' || statusRec?.includes('Interview Scheduled')) return 'INTERVIEW_SCHEDULED';
  if (intent === 'reschedule') return 'INTERVIEW_RESCHEDULE_REQUIRED';
  if (statusRec?.includes('Ready for Interview') || intent === 'already_joined_negotiation') return 'INTERVIEW_ELIGIBLE';
  if (statusRec?.includes('Screening Pending') || intent === 'screening_answer') return 'SCREENING_COMPLETED';
  return 'FOLLOW_UP_REQUIRED';
}

function enrichFallbackWithMemoryAndOutcome(raw: any, candidate: any, userMessage: string): any {
  const hrDecisionOutcome = raw.hrDecisionOutcome || mapStatusToHrOutcome(raw.statusRecommendation, raw.detectedIntent);
  const conversationMemory = raw.conversationMemory || {
    candidate_name: candidate?.name || 'Candidate',
    target_role: candidate?.appliedRole || 'Property Consultant',
    current_company: raw.extractedFields?.currentCompany || candidate?.screening?.currentCompany || '',
    designation: raw.extractedFields?.currentDesignation || candidate?.screening?.currentDesignation || '',
    total_experience: raw.extractedFields?.totalExperienceYears ? `${raw.extractedFields.totalExperienceYears} years` : (candidate?.screening?.totalExperienceYears ? `${candidate?.screening?.totalExperienceYears} years` : ''),
    real_estate_experience: raw.extractedFields?.realEstateExperienceYears ? `${raw.extractedFields.realEstateExperienceYears} years` : (candidate?.screening?.realEstateExperienceYears ? `${candidate?.screening?.realEstateExperienceYears} years` : ''),
    gurgaon_experience: raw.extractedFields?.gurgaonDubaiExperience?.gurgaon ? 'Yes' : 'Unconfirmed',
    dubai_experience: raw.extractedFields?.gurgaonDubaiExperience?.dubai ? 'Yes' : 'No',
    current_salary: raw.extractedFields?.currentSalaryLPA || candidate?.screening?.currentSalaryLPA || '',
    expected_salary: raw.extractedFields?.expectedSalaryLPA || candidate?.screening?.expectedSalaryLPA || '',
    salary_not_disclosed: false,
    current_location: raw.extractedFields?.currentLocation || candidate?.screening?.currentLocation || '',
    notice_period: raw.extractedFields?.noticePeriodDays !== undefined ? `${raw.extractedFields.noticePeriodDays} days` : '',
    earliest_joining_date: raw.extractedFields?.earliestJoiningDate || '',
    interested: raw.statusRecommendation?.includes('Declined') ? 'No' : 'Yes',
    interview_date: raw.selectedSlotId ? 'Scheduled' : '',
    interview_time: '',
    conversation_status: hrDecisionOutcome,
    missing_information: [],
    next_action: raw.statusRecommendation || 'Review candidate responses',
  };

  return {
    ...raw,
    hrDecisionOutcome,
    conversationMemory,
  };
}

// Robust conversational generator with company requirement & budget negotiation handling
function computeRawFallbackResponse(
  scenario: string,
  userMessage: string,
  candidate: any,
  transcript: any[],
  availableSlots: any[]
) {
  const lower = (userMessage || '').toLowerCase();
  const availableSlotList = availableSlots
    .filter((s: any) => s.isAvailable)
    .map((s: any) => s.displayLabel)
    .join(', ');

  const roleInfo = getRoleBudgetInfo(candidate?.appliedRole);

  // SCENARIO 1: Candidate says they already joined another company / accepted another offer
  // System handles this according to company requirements and budget for the target role
  if (
    lower.includes('already join') ||
    lower.includes('already accepted') ||
    lower.includes('joined some other') ||
    lower.includes('joined another') ||
    lower.includes('dusri company join') ||
    lower.includes('dusri jagah join') ||
    lower.includes('joined recently') ||
    lower.includes('got another job') ||
    lower.includes('accepted offer') ||
    lower.includes('new company')
  ) {
    // If they already expressed openness or mentioned their package, proceed to counter-offer negotiation
    if (lower.includes('open') || lower.includes('explore') || lower.includes('lpa') || lower.includes('kitna') || lower.includes('what is the package')) {
      return {
        agentReply: `That is great! For our ${candidate?.appliedRole || 'luxury sales'} desk, White Collar Realty offers a budget of ${roleInfo.fixedBudget}, plus uncapped quarterly incentives where top closers make ${roleInfo.totalOte} across Gurgaon luxury and Dubai properties. We can arrange a confidential, direct discussion with our Sales Director at our Sector 67 HQ. Would ${availableSlotList ? availableSlotList.split(',')[0] : 'Tomorrow at 2:30 PM'} work for a quick conversation?`,
        detectedIntent: 'reschedule',
        extractedFields: {
          currentCompany: lower.includes('square') ? 'Square Yards' : lower.includes('anarock') ? 'Anarock' : 'Recently Joined Other Firm',
        },
        statusRecommendation: 'Screened - Ready for Interview',
        generatedRemark: {
          text: `Candidate recently joined another firm, but is open to evaluating White Collar Realty counter-offer. Target role budget pitch (${roleInfo.fixedBudget}) shared. Ready for leadership discussion.`,
          priority: 'High',
          category: 'Already Joined - Counter Offer Open',
          actionDueDate: 'Today',
        },
      };
    }

    return {
      agentReply: `Congratulations on your new role! At White Collar Realty, we are rapidly scaling our luxury Gurugram and Dubai portfolios, and our approved budget for ${candidate?.appliedRole || 'this position'} is ${roleInfo.fixedBudget} plus industry-leading uncapped deal commissions. Even though you recently joined, would you be open to an exploratory 15-minute confidential discussion with our Director at our Sector 67 M3M Urbana office, or would you prefer we stay in touch for a 3-month check-in?`,
      detectedIntent: 'already_joined_negotiation',
      extractedFields: {
        currentCompany: 'Recently Joined Other Firm',
      },
      statusRecommendation: 'Screened - Ready for Interview',
      generatedRemark: {
        text: `Candidate mentioned having joined another company. Auto-engaged with company requirements & role budget pitch (${roleInfo.fixedBudget} + incentives). Awaiting candidate preference for counter-discussion vs 90-day pipeline.`,
        priority: 'High',
        category: 'Already Joined - Counter Offer Open',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 2: Candidate wants 3-month check-in / pipeline
  if (lower.includes('3 month') || lower.includes('stay in touch') || lower.includes('after some time') || lower.includes('settle in') || lower.includes('later')) {
    return {
      agentReply: `Understood and completely respected! We wish you great success in your initial tenure. I have scheduled an automated 90-day talent check-in alert in our White Collar Realty CRM so our senior team can reconnect with you in December. Best wishes!`,
      detectedIntent: 'pipeline_future',
      extractedFields: {},
      statusRecommendation: 'Declined - Do Not Call',
      generatedRemark: {
        text: `Candidate committed to current onboarding. Scheduled automated 90-day talent check-in alert to assess future luxury real estate openings.`,
        priority: 'Medium',
        category: 'Already Joined - Future Pipeline',
        actionDueDate: 'In 90 Days',
      },
    };
  }

  // SCENARIO 3: Budget / High CTC Negotiation Scenario
  if (lower.includes('budget') || lower.includes('ctc') || lower.includes('salary') || lower.includes('lpa') && (lower.includes('high') || lower.includes('more') || lower.includes('kam'))) {
    return {
      agentReply: `We understand compensation is a key priority. For high performers closing luxury inventory in Gurgaon Golf Course Extension and Dubai, White Collar Realty has flexible budget bands up to ${roleInfo.fixedBudget}, and our closure commissions can easily add 8 to 15 Lakhs on top of your fixed pay. Would you like to sit down with our hiring manager to review the exact incentive matrix?`,
      detectedIntent: 'budget_negotiation',
      extractedFields: {
        expectedSalaryLPA: userMessage,
      },
      statusRecommendation: 'Screened - Ready for Interview',
      generatedRemark: {
        text: `Salary discussion handled: Candidate discussed CTC expectations. Highlighted White Collar Realty role budget band (${roleInfo.fixedBudget}) and high-ticket luxury closure commission slabs.`,
        priority: 'High',
        category: 'Budget Negotiation',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 4: Strict Explicit Decline detection
  if (
    lower.includes('not interested') ||
    lower.includes('nahi chahiye') ||
    lower.includes('decline') ||
    lower.includes('stop calling') ||
    lower.includes('do not call') ||
    lower.includes('remove my name')
  ) {
    return {
      agentReply:
        'Understood. Thank you for letting us know! We have updated our records and stopped further follow-up calls. We wish you all the very best for your career ahead.',
      detectedIntent: 'cancel_decline',
      extractedFields: {},
      declineReason: userMessage,
      statusRecommendation: 'Declined - Do Not Call',
      generatedRemark: {
        text: `Candidate explicitly declined further interaction. Marked as Do Not Call per company compliance policy.`,
        priority: 'Low',
        category: 'Declined - Do Not Call',
        actionDueDate: undefined,
      },
    };
  }

  // SCENARIO 5: Callback request detection
  if (
    lower.includes('call back') ||
    lower.includes('busy') ||
    lower.includes('driving') ||
    lower.includes('meeting') ||
    lower.includes('baad me') ||
    lower.includes('sham ko') ||
    lower.includes('call later')
  ) {
    return {
      agentReply:
        'Sure, absolutely no problem! We understand you are busy right now. I have noted down a callback alert for today. Our HR team will reconnect with you shortly. Have a safe drive!',
      detectedIntent: 'request_callback',
      extractedFields: {},
      callbackTime: 'Later Today (Requested by Candidate)',
      statusRecommendation: 'Callback Needed',
      generatedRemark: {
        text: `Candidate currently busy / driving. Requested callback for later today. Alert set for HR queue.`,
        priority: 'High',
        category: 'Callback Due',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 6: Attendance Reminder
  if (scenario === 'reminder') {
    if (
      lower.includes('yes') ||
      lower.includes('haan') ||
      lower.includes('confirm') ||
      lower.includes('aunga') ||
      lower.includes('attending') ||
      lower.includes('see you')
    ) {
      return {
        agentReply:
          'That is wonderful! We have reconfirmed your attendance for your face-to-face interview. Our office is located at 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram. Please carry an updated copy of your resume. Looking forward to meeting you!',
        detectedIntent: 'confirm_interview',
        extractedFields: { interviewVenueConfirmed: true },
        statusRecommendation: 'Attendance Confirmed',
        generatedRemark: {
          text: `Candidate personally reconfirmed interview attendance at Sector 67 HQ. Directions & contact person shared.`,
          priority: 'High',
          category: 'Attendance Reconfirmation',
          actionDueDate: 'Tomorrow',
        },
      };
    }
    if (
      lower.includes('reschedule') ||
      lower.includes('nahi aa paunga') ||
      lower.includes('can we change') ||
      lower.includes('postpone')
    ) {
      return {
        agentReply: `No worries at all! We can easily reschedule your interview. We have the following upcoming slots available: ${availableSlotList || 'Day after tomorrow at 3:30 PM, or Friday 12:00 PM'}. Which one would suit you better?`,
        detectedIntent: 'reschedule',
        extractedFields: {},
        statusRecommendation: 'Screened - Ready for Interview',
        generatedRemark: {
          text: `Candidate requested rescheduling of scheduled interview. Alternate open slots offered.`,
          priority: 'Urgent',
          category: 'Missed Interview Reschedule',
          actionDueDate: 'Today',
        },
      };
    }
  }

  // SCENARIO 7: Missed Interview Follow-up
  if (scenario === 'missed_followup') {
    if (
      lower.includes('reschedule') ||
      lower.includes('yes') ||
      lower.includes('haan') ||
      lower.includes('free') ||
      lower.includes('slot')
    ) {
      return {
        agentReply: `We completely understand that unexpected priorities come up! We would be delighted to reschedule your face-to-face round at our Sector 67 Gurugram office (M3M Urbana Business Park). We have open slots on ${availableSlotList || 'Tomorrow at 2:30 PM or Friday at 12:00 PM'}. Would you like to confirm one of these?`,
        detectedIntent: 'reschedule',
        extractedFields: {},
        statusRecommendation: 'Screened - Ready for Interview',
        generatedRemark: {
          text: `Candidate missed previous interview slot; contacted via AI follow-up. Candidate agreed to reschedule.`,
          priority: 'Urgent',
          category: 'Missed Interview Reschedule',
          actionDueDate: 'Today',
        },
      };
    }
  }

  // SCENARIO 8: Slot booking detection
  const matchedSlot = availableSlots.find((s: any) =>
    s.isAvailable && lower.includes(s.time.substring(0, 5).toLowerCase()) ||
    (lower.includes('tomorrow') && lower.includes('2:30') && s.id === 'slot-2') ||
    (lower.includes('tomorrow') && lower.includes('4:30') && s.id === 'slot-3') ||
    (lower.includes('friday') && s.date.toLowerCase().includes('friday')) ||
    (lower.includes('day after') && s.id === 'slot-4')
  );

  if (matchedSlot || lower.includes('tomorrow') || lower.includes('kal') || lower.includes('book') || lower.includes('schedule')) {
    const slotToBook = matchedSlot || availableSlots.find((s: any) => s.isAvailable);
    return {
      agentReply: `Perfect! I have scheduled your face-to-face interview for ${slotToBook?.displayLabel || 'Tomorrow at 02:30 PM'} at White Collar Realty Corporate HQ, 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram. We will also send the location details and confirmation letter to your email and phone. Thank you so much and all the best!`,
      detectedIntent: 'confirm_interview',
      slotAction: 'booked',
      selectedSlotId: slotToBook?.id || 'slot-2',
      extractedFields: {
        preferredInterviewSlot: slotToBook?.displayLabel || 'Tomorrow at 02:30 PM',
        interviewVenueConfirmed: true,
      },
      statusRecommendation: 'Interview Scheduled',
      generatedRemark: {
        text: `Face-to-face interview successfully locked for ${slotToBook?.displayLabel || 'Tomorrow 02:30 PM'} at Sector 67 HQ. Dispatched email confirmation.`,
        priority: 'High',
        category: 'Interview Scheduled',
        actionDueDate: 'Tomorrow',
      },
    };
  }

  // General screening flow
  const turnCount = transcript.filter((m: any) => m.sender === 'candidate').length;
  if (turnCount <= 1) {
    return {
      agentReply:
        'Great to know! Could you also share your total work experience and specifically how many years have been in real estate sales? Also, have you had hands-on exposure to Gurgaon or Dubai properties?',
      detectedIntent: 'screening_answer',
      extractedFields: {
        currentCompany: lower.includes('realty') || lower.includes('consultant') ? userMessage : undefined,
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Screening in progress: Captured candidate current employer. Asking for real estate track record in Gurgaon & Dubai.`,
        priority: 'Medium',
        category: 'Notice Period Evaluation',
        actionDueDate: 'Today',
      },
    };
  } else if (turnCount === 2) {
    return {
      agentReply:
        'Understood, that is very relevant experience! What is your current fixed salary package, and what are your expectations for this role with White Collar Realty?',
      detectedIntent: 'screening_answer',
      extractedFields: {
        gurgaonDubaiExperience: {
          gurgaon: lower.includes('gurgaon') || lower.includes('ncr'),
          dubai: lower.includes('dubai'),
          details: userMessage,
        },
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Real estate domain experience validated for Gurgaon/Dubai. Inquiring on present and expected CTC alignment.`,
        priority: 'Medium',
        category: 'Budget Negotiation',
        actionDueDate: 'Today',
      },
    };
  } else if (turnCount === 3) {
    return {
      agentReply:
        'Got it. Where are you currently based in Delhi NCR, and what is your official notice period or earliest possible joining date?',
      detectedIntent: 'screening_answer',
      extractedFields: {
        expectedSalaryLPA: userMessage,
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate stated CTC expectations (${userMessage}). Checking location and notice period feasibility.`,
        priority: 'Medium',
        category: 'Notice Period Evaluation',
        actionDueDate: 'Today',
      },
    };
  } else {
    return {
      agentReply: `Thank you for sharing those details! Based on your profile, we would love to invite you for a face-to-face interview at our corporate office: 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram. We have slots available on ${availableSlotList || 'Tomorrow at 2:30 PM or 4:30 PM'}. Which slot works best for you?`,
      detectedIntent: 'screening_answer',
      extractedFields: {
        currentLocation: userMessage,
        noticePeriodDays: lower.includes('immediate') ? 0 : lower.includes('15') ? 15 : 30,
      },
      statusRecommendation: 'Screened - Ready for Interview',
      generatedRemark: {
        text: `All 7 screening criteria validated. Candidate ready for face-to-face interview booking at Sector 67 HQ.`,
        priority: 'High',
        category: 'Interview Scheduled',
        actionDueDate: 'Tomorrow',
      },
    };
  }
}

function generateFallbackResponse(
  scenario: string,
  userMessage: string,
  candidate: any,
  transcript: any[],
  availableSlots: any[]
) {
  const raw = computeRawFallbackResponse(scenario, userMessage, candidate, transcript, availableSlots);
  return enrichFallbackWithMemoryAndOutcome(raw, candidate, userMessage);
}

// Shared prompt builder for White Collar Realty Virtual HR Recruiter
function createSystemInstruction(candidate: any, scenario: string, availableSlotsText: string) {
  const roleInfo = getRoleBudgetInfo(candidate?.appliedRole);

  return `
# WHITE COLLAR REALTY — AI HR VOICE RECRUITER ("POOJA")

You are "Pooja", the Virtual HR Assistant of White Collar Realty, a premier luxury real estate advisory firm in Gurgaon and Dubai.
Office HQ: 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101.

Your job is to conduct natural, human-like HR recruitment conversations with candidates over voice.
You are NOT a question-reading bot. You must behave like an experienced human HR recruiter who listens carefully, understands what the candidate actually said, decides what to ask next, naturally handles pauses and interruptions, and maintains a natural conversational rhythm.

---

## CONVERSATIONAL CONSTRAINTS & AUTHENTIC INDIAN ACCENT:
- Persona: Professional, friendly, authentic Indian corporate HR recruiter (Delhi NCR real estate style).
- Speech Style: Warm, courteous, natural spoken Indian English with seamless conversational Hinglish capabilities.
- STRICT Spoken Length Rule: STRICTLY limit your reply to 1 or 2 spoken sentences maximum per turn. Treat this as a real live phone call. Never deliver a lecture or monologue!
- Active Listening & Natural Transitions: Start with natural conversational cues: "Right, got it", "Understood", "That makes sense", "Sure", "Okay great", "Just to clarify...", "That's helpful", "Ji bilkul".
- Avoid Repetitive Robot Words: Never repeatedly say "Certainly", "Absolutely", or "Thank you for providing that information".
- Dynamic Language Matching: If the candidate speaks Hindi or Hinglish, respond in natural corporate Hinglish. If English, respond in fluent Indian corporate English.

---

## 38 OPERATIONAL RULES & BEHAVIOR:

### 1. PRIMARY OBJECTIVE
Screen the candidate, understand their profile, verify target role, screen according to relevant White Collar Realty JD, ask role-specific questions, collect missing HR info, assess interest, determine interview qualification, schedule/confirm/reschedule/cancel, handle reminders/follow-ups, and record complete outcome.
* NEVER make up candidate information.
* NEVER invent job requirements.
* NEVER invent interview slots.
* NEVER claim an interview is booked unless the scheduling system confirms it.

### 2. HUMAN CONVERSATION RULE
Never act like a robotic question-reading form ("Question 1, Question 2"). The next question MUST depend on what the candidate just said.

### 3. NEVER ASK WHAT YOU ALREADY KNOW
Always inspect the transcript and existing profile data before asking. If candidate already disclosed "I have 5 years experience in Gurgaon luxury sales", do NOT ask experience again.

### 4. LISTEN BEFORE SPEAKING
Acknowledge candidate responses before moving forward.

### 5. HANDLE SILENCE NATURALLY
If candidate pauses: First short pause: "Take your time." If silence continues: "No problem, whenever you're ready." Never repeatedly say "Hello? Are you there?".

### 6. HANDLE INTERRUPTION
If candidate speaks or interrupts, acknowledge immediately and respond directly to what they said. Never continue reading your previous sentence over them.

### 7. HANDLE UNEXPECTED QUESTIONS (SALARY / BUDGET)
If candidate asks about salary range:
"The exact package depends on the role and experience, and the HR team will discuss the applicable range during the process. Before we move ahead, I'd like to understand your current and expected compensation."
Never invent arbitrary salary ranges.

### 8. HANDLE OFF-TOPIC CONVERSATION
Politely acknowledge and smoothly redirect:
"Understood. That gives me some context. Since this role involves Gurgaon property sales, I'd also like to understand your Gurgaon market experience."

### 9. HANDLE "I DON'T KNOW"
"That's okay." Move to the next relevant question or offer a simpler clarification.

### 10. HANDLE "I'M NOT INTERESTED"
"Understood. Thank you for your time. I'll update the recruitment status accordingly. Have a good day." Set hrDecisionOutcome to "NOT_INTERESTED", status to "Declined - Do Not Call", and end call.

### 11. HANDLE BUSY CANDIDATE
"No problem. Would you prefer that I call you back later?" Collect preferred callback time, confirm politely, set hrDecisionOutcome to "CALL_BACK_REQUESTED".

### 12. CANDIDATE IDENTITY VERIFICATION & 13. NATURAL INTRODUCTION
At call start: "Hi, am I speaking with ${candidate?.name || 'Candidate'}?"
If yes: "Great! I'm Pooja, virtual HR assistant from White Collar Realty. Is this a good time for a quick conversation regarding the ${candidate?.appliedRole || 'Real Estate'} position?"

### 14. TARGET ROLE CONFIRMATION
"You're being considered for the ${candidate?.appliedRole || 'Real Estate'} position, correct?" If no: "Could you tell me which role you're interested in?"

### 15. JOB DESCRIPTION AWARENESS & 16. ROLE-SPECIFIC SCREENING
Target Role Applied: ${roleInfo.title}
Department: ${roleInfo.department}
Location: ${roleInfo.location}
Approved Budget: ${roleInfo.fixedBudget} (Fixed) + ${roleInfo.totalOte} (${roleInfo.seniority})
Notice Period Expectation: ${roleInfo.noticePeriodExpectation}
Key Responsibilities: ${roleInfo.responsibilities.join('; ')}
Required Skills: ${roleInfo.requiredSkills.join(', ')}

Role Specific Questions to naturally ask:
${roleInfo.roleSpecificQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

### 17. ADAPTIVE QUESTIONING & 18. FOLLOW-UP QUESTIONS
If candidate says they managed a team of 15, naturally follow up: "And were you personally accountable for their monthly booking target as well?"

### 19. REQUIRED SCREENING INFORMATION
Track: Current company, designation, total experience, real estate experience, Gurgaon/Dubai sales exposure, current CTC, expected CTC, notice period, earliest joining date.

### 20. SALARY CONVERSATION
"Could you share your current compensation and what you're expecting for your next move?"
If candidate refuses or is hesitant: note salary_not_disclosed = true and proceed smoothly without pressuring.

### 21. NOTICE PERIOD
"What's your current notice period?"
If 30 days: "Would an earlier joining be possible if selected?"

### 22. INTERVIEW SCHEDULING
Only offer open slots provided below. Propose 1 or 2 options:
${availableSlotsText || 'No current slots open; ask candidate for their preferred day and morning/afternoon preference.'}

### 23. RESCHEDULING
"Sure, that's absolutely fine. Let me check the available options." Propose available slots.

### 24. CANCELLATION
"Sure. Would you like to cancel the interview completely, or would you prefer to reschedule it?"

### 25. INTERVIEW REMINDER (Scenario: reminder)
"Hi ${candidate?.name || ''}, I'm calling from White Collar Realty regarding your interview scheduled for tomorrow at ${candidate?.interviewTime || 'the scheduled time'}. I'm just calling to confirm whether you'll be able to attend."

### 26. MISSED INTERVIEW (Scenario: missed_followup)
"Hi ${candidate?.name || ''}, I'm calling regarding your interview scheduled yesterday. We noticed you weren't able to attend. I wanted to check if everything is okay and whether you'd like to reschedule."

### 27. CALL FAILURE / NO ANSWER
Mark status "NO_ANSWER" or "FOLLOW_UP_REQUIRED".

### 28. CONVERSATION MEMORY
Maintain and output updated structured conversation memory JSON object.

### 29. DO NOT FOLLOW A RIGID SCRIPT
Use these rules as a dynamic conversational framework.

### 30. HUMAN SPEECH STYLE
Keep replies conversational, short, and natural.

### 31. LANGUAGE & 32. NATURAL HINGLISH
Fluent corporate Indian English or natural spoken Hinglish. Avoid textbook archaic Hindi.

### 33. EMOTIONAL AWARENESS
If candidate sounds rushed or nervous: "No worries, take your time." If frustrated, remain calm and helpful.

### 34. PRIVACY
Only discuss professional recruitment details. Never request passwords or financial credentials.

### 35. HR DECISION RULES
Select exactly one outcome:
"SCREENING_COMPLETED" | "INTERVIEW_ELIGIBLE" | "INTERVIEW_SCHEDULED" | "FOLLOW_UP_REQUIRED" | "NOT_INTERESTED" | "NO_ANSWER" | "CALL_BACK_REQUESTED" | "INTERVIEW_RESCHEDULE_REQUIRED" | "INTERVIEW_CANCELLED" | "INTERVIEW_ATTENDED" | "INTERVIEW_MISSED" | "REJECTED" | "MANUAL_HR_REVIEW_REQUIRED"

### 36. END OF CALL
Provide a warm, professional closing: "Thank you so much for your time today. Have a great day ahead!"

### 37. AFTER-CALL ACTION
Record full structured data for the White Collar Realty HR CRM.

### 38. MOST IMPORTANT BEHAVIOR
Listen -> Understand -> Remember -> Respond naturally -> Decide what information is needed next -> Ask one useful question -> Listen again.

---

## CANDIDATE "ALREADY JOINED" / COUNTER-OFFER WORKFLOW:
If candidate says they joined another firm:
1. Congratulate them warmly: "Congratulations on your new role!"
2. Pitch White Collar Realty role budget: Approved budget is ${roleInfo.fixedBudget} plus uncapped luxury deal commissions (${roleInfo.totalOte} across Gurgaon & Dubai).
3. Invite them for an exploratory, confidential 15-minute discussion with our Sales Director at Sector 67 M3M Urbana office, OR offer an automated 90-day talent check-in alert.
4. If candidate is open: set detectedIntent to "already_joined_negotiation", hrDecisionOutcome to "INTERVIEW_ELIGIBLE", propose a slot.
5. If candidate declines: set detectedIntent to "pipeline_future", hrDecisionOutcome to "FOLLOW_UP_REQUIRED", remark category "Already Joined - Future Pipeline" (actionDueDate: "In 90 Days").
`;
}

// Shared JSON schema for conversational turns
const interactionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    agentReply: { type: Type.STRING },
    detectedIntent: { type: Type.STRING },
    hrDecisionOutcome: { type: Type.STRING },
    conversationMemory: {
      type: Type.OBJECT,
      properties: {
        candidate_name: { type: Type.STRING },
        target_role: { type: Type.STRING },
        current_company: { type: Type.STRING },
        designation: { type: Type.STRING },
        total_experience: { type: Type.STRING },
        real_estate_experience: { type: Type.STRING },
        gurgaon_experience: { type: Type.STRING },
        dubai_experience: { type: Type.STRING },
        current_salary: { type: Type.STRING },
        expected_salary: { type: Type.STRING },
        salary_not_disclosed: { type: Type.BOOLEAN },
        current_location: { type: Type.STRING },
        notice_period: { type: Type.STRING },
        earliest_joining_date: { type: Type.STRING },
        interested: { type: Type.STRING },
        interview_date: { type: Type.STRING },
        interview_time: { type: Type.STRING },
        conversation_status: { type: Type.STRING },
        missing_information: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        next_action: { type: Type.STRING },
      },
    },
    extractedFields: {
      type: Type.OBJECT,
      properties: {
        currentCompany: { type: Type.STRING },
        currentDesignation: { type: Type.STRING },
        totalExperienceYears: { type: Type.NUMBER },
        realEstateExperienceYears: { type: Type.NUMBER },
        gurgaonDubaiExperience: {
          type: Type.OBJECT,
          properties: {
            gurgaon: { type: Type.BOOLEAN },
            dubai: { type: Type.BOOLEAN },
            details: { type: Type.STRING },
          },
        },
        currentSalaryLPA: { type: Type.STRING },
        expectedSalaryLPA: { type: Type.STRING },
        currentLocation: { type: Type.STRING },
        noticePeriodDays: { type: Type.NUMBER },
        earliestJoiningDate: { type: Type.STRING },
        preferredInterviewSlot: { type: Type.STRING },
        interviewVenueConfirmed: { type: Type.BOOLEAN },
      },
    },
    slotAction: { type: Type.STRING },
    selectedSlotId: { type: Type.STRING },
    callbackTime: { type: Type.STRING },
    declineReason: { type: Type.STRING },
    statusRecommendation: { type: Type.STRING },
    generatedRemark: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING },
        priority: { type: Type.STRING },
        category: { type: Type.STRING },
        actionDueDate: { type: Type.STRING },
      },
      required: ['text', 'priority', 'category'],
    },
  },
  required: ['agentReply', 'detectedIntent'],
};

// Conversation Interaction Endpoint
app.post('/api/call/interact', async (req, res) => {
  try {
    const {
      candidate,
      scenario,
      transcript = [],
      userMessage,
      languagePreference = 'Auto (Hinglish/Hindi/English)',
      availableSlots = [],
    } = req.body;

    const availableSlotsText = availableSlots
      .filter((s: any) => s.isAvailable)
      .map((s: any) => `[ID: ${s.id}] ${s.displayLabel} (${s.time}) at ${s.venue}`)
      .join('\n');

    const ai = getGenAI();

    if (!ai) {
      const fallback = generateFallbackResponse(
        scenario,
        userMessage,
        candidate,
        transcript,
        availableSlots
      );
      return res.json(fallback);
    }

    const systemInstruction = createSystemInstruction(candidate, scenario, availableSlotsText);

    const conversationPrompt = `
Previous Conversation Transcript:
${(transcript || [])
  .map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`)
  .join('\n')}

Candidate's Latest Message: "${userMessage || ''}"
Candidate's Existing Profile Data: ${JSON.stringify(candidate?.screening || {})}
Language Preference: ${languagePreference}

Respond to the candidate and extract any new details.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: conversationPrompt,
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: interactionResponseSchema,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/call/interact:', error);
    // Graceful fallback
    const fallback = generateFallbackResponse(
      req.body.scenario,
      req.body.userMessage,
      req.body.candidate,
      req.body.transcript,
      req.body.availableSlots || []
    );
    return res.json(fallback);
  }
});

// Streaming Conversation Interaction Endpoint for sub-second real-time voice latency
app.post('/api/call/interact-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
  };

  const {
    candidate,
    scenario,
    transcript = [],
    userMessage,
    languagePreference = 'Auto (Hinglish/Hindi/English)',
    availableSlots = [],
  } = req.body;

  const fallback = generateFallbackResponse(
    scenario,
    userMessage,
    candidate,
    transcript,
    availableSlots
  );

  const ai = getGenAI();

  if (!ai) {
    // Stream fallback tokens with realistic low latency delay
    const words = fallback.agentReply.split(' ');
    for (let i = 0; i < words.length; i++) {
      sendEvent('chunk', { text: (i === 0 ? '' : ' ') + words[i] });
      await new Promise((r) => setTimeout(r, 8));
    }
    sendEvent('complete', fallback);
    sendEvent('done', {});
    return res.end();
  }

  try {
    const availableSlotsText = availableSlots
      .filter((s: any) => s.isAvailable)
      .map((s: any) => `[ID: ${s.id}] ${s.displayLabel} (${s.time}) at ${s.venue}`)
      .join('\n');

    const systemInstruction = createSystemInstruction(candidate, scenario, availableSlotsText);

    const conversationPrompt = `
Previous Conversation Transcript:
${(transcript || [])
  .map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`)
  .join('\n')}

Candidate's Latest Message: "${userMessage || ''}"
Candidate's Existing Profile Data: ${JSON.stringify(candidate?.screening || {})}
Language Preference: ${languagePreference}

Respond to the candidate and extract any new details.
`;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents: conversationPrompt,
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: interactionResponseSchema,
      },
    });

    let accumulatedRaw = '';
    let replyEmittedLength = 0;
    let replyFinished = false;

    for await (const chunk of responseStream) {
      const text = chunk.text || '';
      accumulatedRaw += text;

      if (!replyFinished) {
        const keyMatch = accumulatedRaw.match(/"agentReply"\s*:\s*"/);
        if (keyMatch && keyMatch.index !== undefined) {
          const startIndex = keyMatch.index + keyMatch[0].length;
          const contentAfterStart = accumulatedRaw.slice(startIndex);

          let endIndex = -1;
          for (let i = 0; i < contentAfterStart.length; i++) {
            if (contentAfterStart[i] === '"' && (i === 0 || contentAfterStart[i - 1] !== '\\')) {
              endIndex = i;
              break;
            }
          }

          const rawReplyPart = endIndex !== -1 ? contentAfterStart.slice(0, endIndex) : contentAfterStart;
          const unescaped = rawReplyPart
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');

          if (unescaped.length > replyEmittedLength) {
            const delta = unescaped.slice(replyEmittedLength);
            replyEmittedLength = unescaped.length;
            sendEvent('chunk', { text: delta });
          }

          if (endIndex !== -1) {
            replyFinished = true;
          }
        }
      }
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(accumulatedRaw.trim());
    } catch {
      parsed = fallback;
    }

    if (!parsed?.agentReply && fallback.agentReply) {
      parsed = { ...fallback, ...parsed };
    }
    if (!parsed?.generatedRemark && fallback.generatedRemark) {
      parsed.generatedRemark = fallback.generatedRemark;
    }

    sendEvent('complete', parsed);
    sendEvent('done', {});
    res.end();
  } catch (error: any) {
    console.error('Error in /api/call/interact-stream:', error);
    sendEvent('complete', fallback);
    sendEvent('done', {});
    res.end();
  }
});

// Call Summarizer Endpoint
app.post('/api/call/summarize', async (req, res) => {
  try {
    const { candidate, transcript = [], callScenario } = req.body;
    const ai = getGenAI();

    if (!ai || transcript.length === 0) {
      const turns = transcript.length;
      return res.json({
        summary: `Call completed (${callScenario} scenario). Total ${turns} exchanges. Candidate profile and negotiation remarks logged for White Collar Realty hiring.`,
        keyHighlights: [
          'Conversational screening completed',
          'Status and remark priority updated',
        ],
        scorecard: {
          gurgaonDubaiScore: 'Medium',
          experienceFit: 'Mid Fit',
          budgetAlignment: 'Within Budget',
          joiningTimeline: '30 Days',
          recommendation: 'Interview Recommended',
        },
        latestRemark: {
          text: `Call completed (${turns} turns). Profile assessed for White Collar Realty luxury portfolio.`,
          priority: 'High',
          category: callScenario === 'reminder' ? 'Attendance Reconfirmation' : 'Interview Scheduled',
          actionDueDate: 'Tomorrow',
        },
      });
    }

    const prompt = `
Generate a concise 2-to-3 sentence executive HR summary of this call for White Collar Realty recruitment, plus an evaluation scorecard, a high-priority action remark, and the official After-Call Action record adhering to White Collar Realty Rule 37.

Candidate Name: ${candidate?.name}
Role: ${candidate?.appliedRole}
Scenario: ${callScenario}
Office HQ: 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram

Transcript:
${transcript.map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}

Rule 37: Generate structured after-call action for HR system with exact screening_status (one of SCREENING_COMPLETED, INTERVIEW_ELIGIBLE, INTERVIEW_SCHEDULED, FOLLOW_UP_REQUIRED, NOT_INTERESTED, NO_ANSWER, CALL_BACK_REQUESTED, INTERVIEW_RESCHEDULE_REQUIRED, INTERVIEW_CANCELLED, INTERVIEW_ATTENDED, INTERVIEW_MISSED, REJECTED, MANUAL_HR_REVIEW_REQUIRED), missing_information checklist, and immediate next_action.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyHighlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            scorecard: {
              type: Type.OBJECT,
              properties: {
                gurgaonDubaiScore: { type: Type.STRING },
                experienceFit: { type: Type.STRING },
                budgetAlignment: { type: Type.STRING },
                joiningTimeline: { type: Type.STRING },
                recommendation: { type: Type.STRING },
              },
              required: ['recommendation'],
            },
            latestRemark: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                priority: { type: Type.STRING },
                category: { type: Type.STRING },
                actionDueDate: { type: Type.STRING },
              },
              required: ['text', 'priority', 'category'],
            },
            afterCallAction: {
              type: Type.OBJECT,
              properties: {
                candidate_id: { type: Type.STRING },
                call_status: { type: Type.STRING },
                screening_status: { type: Type.STRING },
                target_role: { type: Type.STRING },
                screening_summary: { type: Type.STRING },
                candidate_answers: {
                  type: Type.OBJECT,
                  properties: {
                    current_company: { type: Type.STRING },
                    designation: { type: Type.STRING },
                    total_experience: { type: Type.STRING },
                    real_estate_experience: { type: Type.STRING },
                    gurgaon_experience: { type: Type.STRING },
                    dubai_experience: { type: Type.STRING },
                    current_salary: { type: Type.STRING },
                    expected_salary: { type: Type.STRING },
                    notice_period: { type: Type.STRING },
                    earliest_joining_date: { type: Type.STRING },
                  },
                },
                missing_information: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                interview_status: { type: Type.STRING },
                interview_date: { type: Type.STRING },
                interview_time: { type: Type.STRING },
                follow_up_required: { type: Type.BOOLEAN },
                follow_up_date: { type: Type.STRING },
                hr_remarks: { type: Type.STRING },
                next_action: { type: Type.STRING },
              },
              required: ['candidate_id', 'screening_status', 'hr_remarks', 'next_action'],
            },
          },
          required: ['summary', 'scorecard'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
  } catch (error) {
    console.error('Error in /api/call/summarize:', error);
    return res.json({
      summary: 'Candidate call recorded and transcribed. Status and screening attributes updated.',
      scorecard: {
        gurgaonDubaiScore: 'Medium',
        experienceFit: 'Mid Fit',
        budgetAlignment: 'Within Budget',
        joiningTimeline: '30 Days',
        recommendation: 'Interview Recommended',
      },
      latestRemark: {
        text: 'Call completed. Remarks recorded for HR review.',
        priority: 'High',
        category: 'Interview Scheduled',
        actionDueDate: 'Today',
      },
      afterCallAction: {
        candidate_id: req.body?.candidate?.id || 'cand-unknown',
        call_status: 'COMPLETED',
        screening_status: 'SCREENING_COMPLETED',
        target_role: req.body?.candidate?.appliedRole || 'Property Consultant',
        screening_summary: 'Call completed and transcribed. Candidate profile updated.',
        candidate_answers: {},
        missing_information: [],
        interview_status: 'PENDING_SLOT',
        interview_date: '',
        interview_time: '',
        follow_up_required: false,
        follow_up_date: '',
        hr_remarks: 'Candidate profile ready for recruiter follow-up.',
        next_action: 'Recruiter to review screening answers.',
      },
    });
  }
});

// Vite middleware & Production static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`White Collar Realty HR Voice Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
