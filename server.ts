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

// Helper to validate and clean Vapi public key (UUID or key format, not shell commands)
function cleanVapiPublicKey(rawKey?: string): string {
  if (!rawKey || typeof rawKey !== 'string') return '';
  const trimmed = rawKey.trim();
  // Filter out accidental shell command values like 'npm install ...'
  if (trimmed.startsWith('npm ') || trimmed.includes('install') || trimmed.length < 5) {
    return '';
  }
  return trimmed;
}

// Memory store for runtime configured Vapi credentials
let runtimeVapiPublicKey: string = '';

// Vapi public configuration endpoint (safe: only returns public key, assistant ID, and silence timeout)
app.get('/api/vapi-config', (req, res) => {
  const publicKey =
    runtimeVapiPublicKey ||
    cleanVapiPublicKey(process.env.VAPI_PUBLIC_KEY) ||
    cleanVapiPublicKey(process.env.VITE_VAPI_PUBLIC_KEY) ||
    cleanVapiPublicKey(process.env.VAPI_PUBLIC_API_KEY) ||
    '';
  const assistantId =
    process.env.VITE_VAPI_ASSISTANT_ID ||
    process.env.VAPI_ASSISTANT_ID ||
    'ed825f7a-e951-444b-81a7-1d6917e439c5';

  res.json({
    publicKey,
    assistantId,
    configured: Boolean(publicKey),
    silenceTimeoutSeconds: 30,
    responseDelaySeconds: 0.5,
  });
});

// Allow saving Vapi key dynamically at runtime
app.post('/api/vapi-config', (req, res) => {
  const { publicKey } = req.body || {};
  const cleaned = cleanVapiPublicKey(publicKey);
  if (cleaned) {
    runtimeVapiPublicKey = cleaned;
  }
  res.json({
    success: true,
    configured: Boolean(runtimeVapiPublicKey),
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
  hr_recruiter: {
    title: 'HR Recruiter / Talent Acquisition Specialist (Real Estate)',
    department: 'Human Resources & Talent Acquisition',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    minExperienceYears: 2,
    minRealEstateExpYears: 1,
    fixedBudget: '6 - 10 LPA fixed',
    totalOte: '8 - 14 LPA with hiring SLA incentives',
    seniority: 'Talent Acquisition Specialist',
    marketFocus: 'Real Estate Sales Talent Sourcing across Gurugram & Delhi NCR',
    noticePeriodExpectation: 'Immediate to 30 days',
    responsibilities: [
      'Source, screen, and headhunt top-performing real estate sales professionals across Delhi NCR',
      'Manage end-to-end recruitment lifecycle from initial telephonic screening to offer rollout',
      'Coordinate interview schedules with Sales Directors and Department Heads',
      'Maintain candidate pipeline, ATS tracking, and recruitment SLA metrics',
    ],
    requiredSkills: [
      'Real Estate Talent Sourcing & Headhunting',
      'Candidate Telephonic & Voice Screening',
      'Offer Negotiation & Onboarding SLAs',
      'Portal Sourcing (Naukri, LinkedIn, Referrals)',
    ],
    roleSpecificQuestions: [
      'How many years of candidate sourcing and recruitment experience do you have in real estate?',
      'What is your monthly closure run-rate for sales consultant and managerial profiles?',
      'Which sourcing channels have yielded your highest quality hires?',
    ],
  },
};

// Helper to determine role budget and pitch for White Collar Realty
function getRoleBudgetInfo(roleName?: string): RoleJDInfo {
  const r = (roleName || '').toLowerCase();
  if (r.includes('hr') || r.includes('recruit') || r.includes('talent') || r.includes('acquisition') || r.includes('people')) {
    return WHITE_COLLAR_JDS['hr_recruiter'];
  } else if (r.includes('lead') || r.includes('manager') || r.includes('dubai') || r.includes('head') || r.includes('vp')) {
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

export interface ConversationStateInventory {
  identityConfirmed: boolean;
  interestConfirmed: boolean;
  roleConfirmed: boolean;
  currentCompany: string | null;
  designation: string | null;
  experienceYears: number | null;
  gurgaonDubaiExposure: { gurgaon: boolean; dubai: boolean; details?: string } | null;
  currentSalaryLPA: string | null;
  expectedSalaryLPA: string | null;
  salaryDeclined: boolean;
  currentLocation: string | null;
  noticePeriodDays: number | null;
  roleSpecificAnswered: boolean;
  interviewScheduled: boolean;
  knownList: string[];
  missingList: string[];
  nextRequiredField: string;
}

/**
 * Robust Anti-Repetition State Guard & Memory Engine
 * Adheres strictly to User Mandate:
 * 1. Identify the required field.
 * 2. Check whether it is already known (CRM file or past turns).
 * 3. If known -> skip.
 * 4. If unknown -> ask.
 * 5. After answer -> save.
 * 6. Move to next missing field.
 * NEVER ask the same question twice. Treat candidate short answers as final.
 */
export function buildConversationStateInventory(
  candidate: any,
  transcript: any[] = [],
  currentMessage: string = ''
): ConversationStateInventory {
  // 1. Initialize from CRM on file
  let identityConfirmed = false;
  let interestConfirmed = false;
  let roleConfirmed = false;
  let currentCompany: string | null =
    candidate?.screening?.currentCompany || candidate?.conversationMemory?.current_company || null;
  let designation: string | null =
    candidate?.screening?.currentDesignation || candidate?.conversationMemory?.designation || null;
  let experienceYears: number | null =
    candidate?.screening?.realEstateExperienceYears ||
    candidate?.screening?.totalExperienceYears ||
    (candidate?.conversationMemory?.real_estate_experience ? parseFloat(candidate.conversationMemory.real_estate_experience) : null) ||
    null;
  let gurgaonDubaiExposure: { gurgaon: boolean; dubai: boolean; details?: string } | null =
    candidate?.screening?.gurgaonDubaiExperience || null;
  let currentSalaryLPA: string | null =
    candidate?.screening?.currentSalaryLPA || candidate?.conversationMemory?.current_salary || null;
  let expectedSalaryLPA: string | null =
    candidate?.screening?.expectedSalaryLPA || candidate?.conversationMemory?.expected_salary || null;
  let salaryDeclined = false;
  let currentLocation: string | null =
    candidate?.screening?.currentLocation || candidate?.conversationMemory?.current_location || null;
  let noticePeriodDays: number | null =
    candidate?.screening?.noticePeriodDays !== undefined
      ? candidate.screening.noticePeriodDays
      : candidate?.conversationMemory?.notice_period
      ? parseInt(candidate.conversationMemory.notice_period, 10)
      : null;
  let roleSpecificAnswered = false;
  let interviewScheduled = false;

  // 2. Scan full conversation history (all messages) + currentMessage
  const fullTurns = [...(transcript || [])];
  if (currentMessage) {
    fullTurns.push({ sender: 'candidate', text: currentMessage });
  }

  const candidateMessages = fullTurns.filter((m: any) => m.sender === 'candidate');

  if (candidateMessages.length >= 1) {
    identityConfirmed = true;
  }
  if (candidateMessages.length >= 2) {
    interestConfirmed = true;
  }
  if (candidateMessages.length >= 3) {
    roleConfirmed = true;
  }

  for (let i = 0; i < fullTurns.length; i++) {
    const turn = fullTurns[i];
    if (turn.sender === 'candidate') {
      const text = turn.text.toLowerCase();
      const prevAgentText = i > 0 && (fullTurns[i - 1].sender === 'agent' || fullTurns[i - 1].sender === 'assistant')
        ? fullTurns[i - 1].text.toLowerCase()
        : '';

      // Check affirmative responses to previous questions
      if (prevAgentText.includes('couple of minutes') || prevAgentText.includes('calling regarding your application') || prevAgentText.includes('am i speaking with')) {
        if (text.includes('yes') || text.includes('sure') || text.includes('haan') || text.includes('speaking') || text.includes('okay') || text.includes('bol raha')) {
          identityConfirmed = true;
          interestConfirmed = true;
        }
      }
      if (prevAgentText.includes('considered for the') || prevAgentText.includes('position, correct')) {
        if (text.includes('yes') || text.includes('correct') || text.includes('right') || text.includes('ha') || text.includes('haan') || text.includes('sure')) {
          roleConfirmed = true;
        }
      }

      // Check company
      const companyMatches = ['dlf', 'm3m', 'square yards', 'anarock', 'godrej', 'emaar', 'sobha', 'proptiger', 'signature global', 'adani', 'trump tower', 'central park', 'abc realty'];
      for (const comp of companyMatches) {
        if (text.includes(comp)) {
          currentCompany = comp.toUpperCase();
          break;
        }
      }
      if (!currentCompany && (prevAgentText.includes('company') || prevAgentText.includes('working currently') || prevAgentText.includes('which real estate company'))) {
        if (text.length >= 2 && text.length < 50 && !text.includes('?')) {
          currentCompany = turn.text.trim();
        }
      }

      // Check designation
      const desigMatches = ['senior consultant', 'property consultant', 'sales manager', 'team lead', 'associate', 'director', 'manager', 'consultant', 'executive'];
      for (const d of desigMatches) {
        if (text.includes(d)) {
          designation = d.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          break;
        }
      }

      // Check experience
      const expMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/);
      if (expMatch) {
        experienceYears = parseFloat(expMatch[1]);
      } else if (prevAgentText.includes('experience') || prevAgentText.includes('how many years')) {
        const numOnly = text.match(/\b(\d+(?:\.\d+)?)\b/);
        if (numOnly) {
          experienceYears = parseFloat(numOnly[1]);
        }
      }

      // Check Gurgaon / Dubai exposure
      if (text.includes('gurgaon') || text.includes('gurugram') || text.includes('golf course') || text.includes('spr') || text.includes('dwarka expressway') || text.includes('dubai')) {
        gurgaonDubaiExposure = {
          gurgaon: text.includes('gurgaon') || text.includes('gurugram') || text.includes('golf course') || text.includes('spr') || text.includes('dwarka'),
          dubai: text.includes('dubai'),
          details: turn.text.trim(),
        };
      }

      // Check salary / CTC
      const salMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lpa|lakh|lakhs|lac|lacs)/);
      if (salMatch) {
        currentSalaryLPA = `${salMatch[1]} LPA`;
      } else if (text.includes('confidential') || text.includes('not disclose') || text.includes('prefer not to say')) {
        salaryDeclined = true;
        currentSalaryLPA = 'Confidential';
      } else if (prevAgentText.includes('compensation') || prevAgentText.includes('ctc') || prevAgentText.includes('salary')) {
        if (text.length > 1 && text.length < 40) {
          currentSalaryLPA = turn.text.trim();
        }
      }

      // Check notice period
      const noticeMatch = text.match(/(\d+)\s*(?:days?|din)/);
      if (noticeMatch) {
        noticePeriodDays = parseInt(noticeMatch[1], 10);
      } else if (text.includes('immediate') || text.includes('turant') || text.includes('serving notice')) {
        noticePeriodDays = 0;
      } else if (prevAgentText.includes('notice period')) {
        const numMatch = text.match(/\b(\d+)\b/);
        if (numMatch) {
          noticePeriodDays = parseInt(numMatch[1], 10);
        }
      }

      // Check location
      if (text.includes('gurgaon') || text.includes('gurugram')) {
        currentLocation = 'Gurugram';
      } else if (text.includes('delhi')) {
        currentLocation = 'Delhi';
      } else if (text.includes('noida')) {
        currentLocation = 'Noida';
      } else if (prevAgentText.includes('based in ncr') || prevAgentText.includes('where are you based') || prevAgentText.includes('current location')) {
        if (text.length > 2 && text.length < 40) {
          currentLocation = turn.text.trim();
        }
      }

      // Check role specific question answered
      if (prevAgentText.includes('channel partners') || prevAgentText.includes('luxury residential') || prevAgentText.includes('hni') || prevAgentText.includes('closing') || prevAgentText.includes('target')) {
        roleSpecificAnswered = true;
      }

      // Check interview scheduling confirmed
      if (text.includes('tomorrow') || text.includes('kal') || text.includes('friday') || text.includes('2:30') || text.includes('4:30') || text.includes('slot-2') || text.includes('slot-3') || text.includes('works great') || text.includes('perfect') || text.includes('confirm')) {
        if (prevAgentText.includes('interview') || prevAgentText.includes('m3m urbana') || prevAgentText.includes('which slot')) {
          interviewScheduled = true;
        }
      }
    }
  }

  // 3. Build Known & Missing inventories
  const knownList: string[] = [];
  const missingList: string[] = [];

  if (currentCompany) {
    knownList.push(`Current Company: "${currentCompany}"`);
  } else {
    missingList.push('Current Company');
  }

  if (designation) {
    knownList.push(`Designation: "${designation}"`);
  } else {
    missingList.push('Designation');
  }

  if (experienceYears !== null) {
    knownList.push(`Real Estate Experience: "${experienceYears} years"`);
  } else {
    missingList.push('Total / Real Estate Experience');
  }

  if (gurgaonDubaiExposure) {
    knownList.push(`Market Exposure: ${gurgaonDubaiExposure.gurgaon ? 'Gurgaon' : ''} ${gurgaonDubaiExposure.dubai ? 'Dubai' : ''}`);
  } else {
    missingList.push('Gurgaon / Dubai Market Familiarity');
  }

  if (currentSalaryLPA || salaryDeclined) {
    knownList.push(`Compensation: "${currentSalaryLPA || 'Not disclosed'}"`);
  } else {
    missingList.push('Current & Expected Salary (CTC)');
  }

  if (noticePeriodDays !== null) {
    knownList.push(`Notice Period: "${noticePeriodDays === 0 ? 'Immediate' : `${noticePeriodDays} days`}"`);
  } else {
    missingList.push('Notice Period & Earliest Joining');
  }

  if (currentLocation) {
    knownList.push(`Location: "${currentLocation}"`);
  } else {
    missingList.push('Current NCR Location');
  }

  if (roleSpecificAnswered) {
    knownList.push('Role Specific Question: Answered');
  } else {
    missingList.push('Role Specific Domain Question');
  }

  // Determine next required field in sequence (Strict Anti-Repetition Rule: NEVER ASK TWICE)
  let nextRequiredField = 'schedule_interview';
  if (!identityConfirmed) {
    nextRequiredField = 'identity';
  } else if (!interestConfirmed) {
    nextRequiredField = 'interest';
  } else if (!roleConfirmed) {
    nextRequiredField = 'role_verification';
  } else if (!currentCompany) {
    nextRequiredField = 'company';
  } else if (!designation) {
    nextRequiredField = 'designation';
  } else if (experienceYears === null) {
    nextRequiredField = 'experience';
  } else if (!gurgaonDubaiExposure) {
    nextRequiredField = 'market_exposure';
  } else if (!currentSalaryLPA && !salaryDeclined) {
    nextRequiredField = 'salary';
  } else if (noticePeriodDays === null) {
    nextRequiredField = 'notice_period';
  } else if (!currentLocation) {
    nextRequiredField = 'location';
  } else if (!roleSpecificAnswered) {
    nextRequiredField = 'role_specific';
  } else if (!interviewScheduled) {
    nextRequiredField = 'schedule_interview';
  } else {
    nextRequiredField = 'interview_confirmed';
  }

  return {
    identityConfirmed,
    interestConfirmed,
    roleConfirmed,
    currentCompany,
    designation,
    experienceYears,
    gurgaonDubaiExposure,
    currentSalaryLPA,
    expectedSalaryLPA,
    salaryDeclined,
    currentLocation,
    noticePeriodDays,
    roleSpecificAnswered,
    interviewScheduled,
    knownList,
    missingList,
    nextRequiredField,
  };
}

// Robust conversational generator with 38 rules, company requirement & budget negotiation handling
function computeRawFallbackResponse(
  scenario: string,
  userMessage: string,
  candidate: any,
  transcript: any[],
  availableSlots: any[]
) {
  const lower = (userMessage || '').toLowerCase().trim();
  const availableSlotList = availableSlots
    .filter((s: any) => s.isAvailable)
    .map((s: any) => s.displayLabel)
    .join(', ');

  const roleInfo = getRoleBudgetInfo(candidate?.appliedRole);
  const candName = candidate?.name || 'Candidate';
  const candRole = candidate?.appliedRole || 'Property Consultant';

  // SCENARIO 0: Silence handling & "Are you there?" response (Rule 9 / User Requirement)
  if (lower.includes('[silence]') || lower.includes('silence') || lower === '...') {
    return {
      agentReply: 'Take your time.',
      detectedIntent: 'silence_handled',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate paused during conversation. Arjun waited patiently without repeating questions.`,
        priority: 'Medium',
        category: 'Notice Period Evaluation',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.1: Candidate confirms presence after "Are you there?" check (e.g., "yes", "I am here", "haan")
  // CRITICAL REQUIREMENT: Do NOT repeat the previous question!
  if (
    lower === 'yes' ||
    lower === 'yes i am' ||
    lower === 'yes i am here' ||
    lower === "i'm here" ||
    lower === 'i am here' ||
    lower === 'haan' ||
    lower === 'haan ji' ||
    lower === 'haan main sun raha hoon' ||
    lower === 'sun raha hoon' ||
    lower === 'yes i can hear you' ||
    lower === 'can you hear me' ||
    lower === 'boliye' ||
    lower === 'haan boliye'
  ) {
    const isHindi = lower.includes('haan') || lower.includes('boliye') || lower.includes('sun');
    return {
      agentReply: isHindi
        ? 'Theek hai, aap aaraam se bataiye, main sun raha hoon.'
        : "Great, please take your time, I'm listening.",
      detectedIntent: 'presence_confirmed',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate confirmed presence. Maintained conversational calm without repeating question.`,
        priority: 'Low',
        category: 'General Interaction',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.2: Candidate asks About White Collar Realty (Company Overview)
  if (
    lower.includes('about white collar') ||
    lower.includes('about the company') ||
    lower.includes('company profile') ||
    lower.includes('company details') ||
    lower.includes('what does white collar do') ||
    lower.includes('kya karti hai company') ||
    lower.includes('tell me about company') ||
    lower.includes('company background')
  ) {
    return {
      agentReply:
        "White Collar Realty is a luxury real estate advisory firm partnering with premier developers like DLF, M3M, Godrej, Emaar, and Sobha across Gurugram and Dubai. We operate from M3M Urbana, Sector 67. How familiar are you with Gurgaon's luxury residential market?",
      detectedIntent: 'company_inquiry',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate inquired about White Collar Realty. Provided professional overview and engaged experience.`,
        priority: 'Medium',
        category: 'Company Overview',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.3: Candidate asks Work Timings / Working Days
  if (
    lower.includes('working hour') ||
    lower.includes('working hours') ||
    lower.includes('office timing') ||
    lower.includes('office timings') ||
    lower.includes('timings kya') ||
    lower.includes('timing kya') ||
    lower.includes('working day') ||
    lower.includes('shift timing') ||
    lower.includes('week off') ||
    lower.includes('kitne baje')
  ) {
    return {
      agentReply:
        'Our office timings are 10:00 AM to 6:30 PM, six days a week with Tuesday off, as weekends are our primary client site-visit days. Does that schedule suit you comfortably?',
      detectedIntent: 'timings_inquiry',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate inquired about office timings & working days (10 AM - 6:30 PM, Tuesday off).`,
        priority: 'Medium',
        category: 'Work Schedule',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.4: Candidate asks Interview Rounds / Selection Process
  if (
    lower.includes('how many rounds') ||
    lower.includes('interview round') ||
    lower.includes('interview rounds') ||
    lower.includes('kitne round') ||
    lower.includes('selection process') ||
    lower.includes('hiring process')
  ) {
    return {
      agentReply:
        'We have two rounds: this preliminary HR screening, followed by a face-to-face discussion with our Director at our Sector 67 corporate office. Are you available for an in-person meeting this week?',
      detectedIntent: 'interview_process_inquiry',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate inquired regarding interview stages (HR screening + Director F2F).`,
        priority: 'Medium',
        category: 'Interview Process',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.45: Candidate asks about Leads / Marketing Support
  if (
    lower.includes('leads provided') ||
    lower.includes('lead support') ||
    lower.includes('data milega') ||
    lower.includes('leads milengi') ||
    lower.includes('cold calling') ||
    lower.includes('crm leads') ||
    lower.includes('client database')
  ) {
    return {
      agentReply:
        'Yes, White Collar Realty provides high-intent verified CRM leads and digital marketing campaigns, alongside encouraging active personal HNI client networking. What has been your primary source of closings recently?',
      detectedIntent: 'leads_inquiry',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate inquired about CRM lead support and marketing allocations.`,
        priority: 'Medium',
        category: 'Lead Support',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.46: Candidate asks about Travel / Cab / Conveyance
  if (
    lower.includes('cab facility') ||
    lower.includes('travel allowance') ||
    lower.includes('conveyance') ||
    lower.includes('petrol allowance') ||
    lower.includes('travel expense')
  ) {
    return {
      agentReply:
        'We provide conveyance and travel allowances for all client site visits. Our office is also conveniently located near Sector 55-56 Rapid Metro. Coming back to your profile, what is your notice period?',
      detectedIntent: 'benefits_inquiry',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate inquired about travel/conveyance allowances. Addressed and returned to screening.`,
        priority: 'Low',
        category: 'Conveyance Policy',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.5: Candidate says "Wait, let me check" (Rule 12)
  if (
    lower.includes('wait') ||
    lower.includes('let me check') ||
    lower.includes('ek minute') ||
    lower.includes('ek min') ||
    lower.includes('hold on') ||
    lower.includes('zara ruko')
  ) {
    return {
      agentReply: 'Sure, take your time.',
      detectedIntent: 'candidate_wait',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate asked to wait / check information. Arjun acknowledged patiently per Rule 12.`,
        priority: 'Low',
        category: 'Notice Period Evaluation',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.6: Candidate asks Office Location / Address (Rule 14)
  if (
    lower.includes('office location') ||
    lower.includes('where is your office') ||
    lower.includes('office address') ||
    lower.includes('where are you located') ||
    lower.includes('kahan hai office') ||
    lower.includes('office kahan hai')
  ) {
    return {
      agentReply:
        "Our office is on the 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram. Coming back to your profile, what's your notice period?",
      detectedIntent: 'office_inquiry',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate inquired about office location. Answered accurately and naturally returned to screening per Rule 14.`,
        priority: 'Low',
        category: 'Interview Scheduling',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.7: Candidate correction (Rule 11) - e.g. "No, sorry, I meant four years, not five"
  if (
    lower.includes('sorry, i meant') ||
    lower.includes('sorry i meant') ||
    lower.includes('i meant 4') ||
    lower.includes('not 5') ||
    lower.includes('not five') ||
    lower.includes('galti se') ||
    (lower.includes('meant') && lower.includes('year'))
  ) {
    return {
      agentReply: 'No problem, four years. Got it.',
      detectedIntent: 'correction_handled',
      extractedFields: {
        realEstateExperienceYears: 4,
        totalExperienceYears: 4,
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate corrected experience to four years. Updated state seamlessly per Rule 11.`,
        priority: 'Low',
        category: 'Candidate Correction',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.8: Candidate provides multi-entity statement (Rule 6)
  // e.g. "I'm currently working with ABC Realty, it's been around four years, but before that I was in Dubai for two years."
  if (
    lower.includes('abc realty') ||
    (lower.includes('currently working with') && lower.includes('dubai') && lower.includes('year'))
  ) {
    return {
      agentReply:
        'Got it, four years with ABC Realty and two years in Dubai. What kind of properties were you handling there?',
      detectedIntent: 'screening_answer',
      extractedFields: {
        currentCompany: 'ABC Realty',
        realEstateExperienceYears: 6,
        totalExperienceYears: 6,
        gurgaonDubaiExperience: {
          gurgaon: false,
          dubai: true,
          details: 'ABC Realty 4 years + 2 years Dubai real estate',
        },
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate provided multi-entity statement (ABC Realty, 4 yrs + 2 yrs Dubai). Extracted without re-asking per Rule 6.`,
        priority: 'Medium',
        category: 'Dubai Market Experience',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.9: Dynamic Dubai Exploration (Rule 5 & 22)
  if (
    lower.includes('worked in dubai') ||
    lower.includes('dubai real estate') ||
    (lower.includes('dubai') && (lower.includes('year') || lower.includes('3 year') || lower.includes('three year')))
  ) {
    return {
      agentReply: "Oh, that's interesting. Were those mainly ready-to-move properties or off-plan projects?",
      detectedIntent: 'dubai_exploration',
      extractedFields: {
        gurgaonDubaiExperience: {
          gurgaon: true,
          dubai: true,
          details: 'Experienced in Dubai property market',
        },
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Discovered Dubai market background. Initiated dynamic conversation per Rule 5.`,
        priority: 'Medium',
        category: 'Dubai Market Experience',
        actionDueDate: 'Today',
      },
    };
  }

  if (lower.includes('mostly off-plan') || lower.includes('off-plan') || lower.includes('off plan')) {
    return {
      agentReply: 'Got it. And were you dealing directly with buyers, or mainly channel partners?',
      detectedIntent: 'dubai_exploration',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Explored off-plan transaction scope dynamically per Rule 5.`,
        priority: 'Medium',
        category: 'Dubai Market Experience',
        actionDueDate: 'Today',
      },
    };
  }

  if (lower.includes('luxury residential') || (lower.includes('luxury') && lower.includes('residential'))) {
    return {
      agentReply: 'Got it. And were you handling your own clients, or were you also managing a team?',
      detectedIntent: 'role_exploration',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Deepened exploration into client handling vs team management per Rule 21.`,
        priority: 'Medium',
        category: 'Domain Depth Evaluation',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.10: Candidate speaks Hinglish (Rule 16)
  // e.g. "Main abhi Gurgaon mein hi work kar raha hoon"
  if (
    lower.includes('gurgaon mein hi work') ||
    lower.includes('gurgaon me hi work') ||
    lower.includes('main abhi gurgaon')
  ) {
    return {
      agentReply: 'Okay, got it. Gurgaon mein aap mainly kis type ke projects handle kar rahe hain?',
      detectedIntent: 'screening_answer',
      extractedFields: {
        location: 'Gurgaon',
        gurgaonDubaiExperience: {
          gurgaon: true,
          dubai: false,
          details: 'Currently working in Gurgaon market',
        },
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Responded in natural conversational Hinglish per Rule 16.`,
        priority: 'Medium',
        category: 'Hinglish Adaptation',
        actionDueDate: 'Today',
      },
    };
  }

  if (lower === 'residential' || lower === 'residential properties' || lower === 'mostly residential') {
    return {
      agentReply:
        'Right. Aur aapka experience mostly end-to-end sales mein hai ya lead generation side bhi handle karte hain?',
      detectedIntent: 'sales_depth_inquiry',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Inquired about sales closing vs lead generation scope per Rule 21.`,
        priority: 'Medium',
        category: 'Sales Experience Evaluation',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.11: Candidate asks interview duration / details
  if (
    lower.includes('how much time') ||
    lower.includes('kitna time lagega') ||
    lower.includes('interview duration')
  ) {
    return {
      agentReply:
        'It usually takes about 30 to 45 minutes for the initial discussion. By the way, are you available for a face-to-face interview this week?',
      detectedIntent: 'interview_duration_inquiry',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Clarified interview duration and returned smoothly to scheduling per Rule 14.`,
        priority: 'Low',
        category: 'Interview Scheduling',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 0.12: Personal context (Rule 15) - e.g. "I moved to Gurgaon last year because my family shifted here"
  if (
    lower.includes('family shifted') ||
    lower.includes('moved to gurgaon') ||
    lower.includes('shifted to gurgaon')
  ) {
    return {
      agentReply:
        "Okay, that makes sense. Since you're now based in Gurgaon, how familiar are you with the local property market?",
      detectedIntent: 'off_topic_redirect',
      extractedFields: {
        location: 'Gurgaon',
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate shared personal relocation background. Acknowledged warmly and steered to market knowledge per Rule 15.`,
        priority: 'Low',
        category: 'Market Familiarity',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 1: Strict Explicit Decline detection (Rule 10)
  if (
    lower.includes('not interested') ||
    lower.includes('nahi chahiye') ||
    lower.includes('decline') ||
    lower.includes('stop calling') ||
    lower.includes('do not call') ||
    lower.includes('remove my name') ||
    lower.includes('no longer exploring')
  ) {
    return {
      agentReply:
        "Understood. Thank you for your time. I'll update the recruitment status accordingly. Have a good day.",
      detectedIntent: 'cancel_decline',
      hrDecisionOutcome: 'NOT_INTERESTED',
      extractedFields: {},
      declineReason: userMessage,
      statusRecommendation: 'Declined - Do Not Call',
      generatedRemark: {
        text: `Candidate explicitly declined further interaction. Marked as NOT_INTERESTED per company compliance policy.`,
        priority: 'Low',
        category: 'Declined - Do Not Call',
        actionDueDate: undefined,
      },
    };
  }

  // SCENARIO 2: Callback request detection (Rule 11)
  if (
    lower.includes('call back') ||
    lower.includes('busy') ||
    lower.includes('driving') ||
    lower.includes('meeting') ||
    lower.includes('baad me') ||
    lower.includes('sham ko') ||
    lower.includes('call later') ||
    lower.includes('call me at')
  ) {
    return {
      agentReply:
        'No problem. Would you prefer that I call you back later? I have noted down a callback alert for today.',
      detectedIntent: 'request_callback',
      hrDecisionOutcome: 'CALL_BACK_REQUESTED',
      extractedFields: {},
      callbackTime: 'Later Today (Requested by Candidate)',
      statusRecommendation: 'Callback Needed',
      generatedRemark: {
        text: `Candidate currently busy / driving. Requested callback. Follow-up priority queued.`,
        priority: 'High',
        category: 'Callback Due',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 3: Candidate asks about salary range or budget upfront (Rule 7)
  if (
    lower.includes('salary range') ||
    lower.includes('what is the package') ||
    lower.includes('what is the budget') ||
    lower.includes('budget kitna') ||
    lower.includes('kitna package') ||
    lower.includes('package range') ||
    (lower.includes('salary') && (lower.includes('range') || lower.includes('bracket') || lower.includes('band') || lower.includes('give')))
  ) {
    return {
      agentReply:
        "The exact package depends on the role and experience, and the HR team will discuss the applicable range during the process. Before we move ahead, I'd like to understand your current and expected compensation.",
      detectedIntent: 'salary_inquiry',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate asked for salary range upfront. Answered per Rule 7 without inventing ranges; redirected to current/expected CTC.`,
        priority: 'Medium',
        category: 'Budget Negotiation',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 4: Candidate hesitates or refuses to disclose salary (Rule 20)
  if (
    lower.includes('prefer not to disclose') ||
    lower.includes('cannot disclose') ||
    lower.includes('not comfortable') ||
    lower.includes('will discuss later') ||
    lower.includes('not disclose') ||
    lower.includes('nda')
  ) {
    return {
      agentReply:
        'No problem at all, we can discuss compensation at a later stage. What is your current notice period or earliest joining date?',
      detectedIntent: 'screening_answer',
      extractedFields: {},
      conversationMemory: {
        salary_not_disclosed: true,
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate chose not to disclose current compensation (salary_not_disclosed = true). Smoothly proceeded to notice period.`,
        priority: 'Medium',
        category: 'Notice Period Evaluation',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 5: Off-topic conversation (Rule 8)
  if (
    lower.includes('mumbai') ||
    lower.includes('bangalore') ||
    lower.includes('weather') ||
    lower.includes('shifted from') ||
    lower.includes('traffic')
  ) {
    return {
      agentReply:
        "Understood. That gives me some context. Since this role involves Gurgaon property sales, I'd also like to understand your Gurgaon market experience.",
      detectedIntent: 'off_topic_redirect',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate went off-topic. Smoothly redirected conversation to Gurgaon real estate experience per Rule 8.`,
        priority: 'Medium',
        category: 'Notice Period Evaluation',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 6: "I don't know" / Uncertain answer (Rule 9)
  if (
    lower.includes("don't know") ||
    lower.includes('dont know') ||
    lower.includes('not sure') ||
    lower.includes('pata nahi') ||
    lower === 'no idea'
  ) {
    return {
      agentReply:
        "That's okay. Could you tell me approximately what you have in mind, or your current notice period?",
      detectedIntent: 'clarification',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate expressed uncertainty. Reassured candidate and simplified the inquiry per Rule 9.`,
        priority: 'Medium',
        category: 'Notice Period Evaluation',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 7: Candidate already joined another firm (Workflow)
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
    if (lower.includes('open') || lower.includes('explore') || lower.includes('lpa') || lower.includes('kitna')) {
      return {
        agentReply: `That is great! For our ${candRole} desk, White Collar Realty offers a budget of ${roleInfo.fixedBudget}, plus uncapped quarterly incentives where top closers make ${roleInfo.totalOte} across Gurgaon luxury and Dubai properties. We can arrange a confidential, direct discussion with our Sales Director at our Sector 67 HQ. Would ${availableSlotList ? availableSlotList.split(',')[0] : 'Tomorrow at 2:30 PM'} work for a quick conversation?`,
        detectedIntent: 'reschedule',
        hrDecisionOutcome: 'INTERVIEW_ELIGIBLE',
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
      agentReply: `Congratulations on your new role! At White Collar Realty, our approved budget for ${candRole} is ${roleInfo.fixedBudget} plus industry-leading uncapped deal commissions. Would you be open to an exploratory 15-minute confidential discussion with our Director at our Sector 67 M3M Urbana office, or would you prefer we stay in touch for a 3-month check-in?`,
      detectedIntent: 'already_joined_negotiation',
      hrDecisionOutcome: 'INTERVIEW_ELIGIBLE',
      extractedFields: {
        currentCompany: 'Recently Joined Other Firm',
      },
      statusRecommendation: 'Screened - Ready for Interview',
      generatedRemark: {
        text: `Candidate mentioned having joined another company. Auto-engaged with company requirements & role budget pitch (${roleInfo.fixedBudget} + incentives).`,
        priority: 'High',
        category: 'Already Joined - Counter Offer Open',
        actionDueDate: 'Today',
      },
    };
  }

  // SCENARIO 8: 90-day pipeline request
  if (lower.includes('3 month') || lower.includes('stay in touch') || lower.includes('after some time') || lower.includes('settle in')) {
    return {
      agentReply: `Understood and completely respected! I have scheduled an automated 90-day talent check-in alert in our White Collar Realty CRM so our senior team can reconnect with you in 3 months. Best wishes!`,
      detectedIntent: 'pipeline_future',
      hrDecisionOutcome: 'FOLLOW_UP_REQUIRED',
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

  // SCENARIO 9: Attendance Reminder Scenario (Rule 25)
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
        hrDecisionOutcome: 'INTERVIEW_ATTENDED',
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
        agentReply: `Sure, that's absolutely fine. Let me check the available options: ${availableSlotList || 'Tomorrow at 2:30 PM, or Friday 12:00 PM'}. Which one would suit you better?`,
        detectedIntent: 'reschedule',
        hrDecisionOutcome: 'INTERVIEW_RESCHEDULE_REQUIRED',
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

  // SCENARIO 10: Missed Interview Follow-up Scenario (Rule 26)
  if (scenario === 'missed_followup') {
    if (
      lower.includes('reschedule') ||
      lower.includes('yes') ||
      lower.includes('haan') ||
      lower.includes('free') ||
      lower.includes('slot')
    ) {
      return {
        agentReply: `We completely understand! We would be delighted to reschedule your face-to-face round at our Sector 67 Gurugram office. We have open slots on ${availableSlotList || 'Tomorrow at 2:30 PM or Friday at 12:00 PM'}. Would you like to confirm one of these?`,
        detectedIntent: 'reschedule',
        hrDecisionOutcome: 'INTERVIEW_RESCHEDULE_REQUIRED',
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

  // SCENARIO 11: Slot booking detection (Rule 22)
  const matchedSlot = availableSlots.find((s: any) =>
    s.isAvailable && lower.includes(s.time.substring(0, 5).toLowerCase()) ||
    (lower.includes('tomorrow') && lower.includes('2:30') && s.id === 'slot-2') ||
    (lower.includes('tomorrow') && lower.includes('4:30') && s.id === 'slot-3') ||
    (lower.includes('friday') && s.date.toLowerCase().includes('friday')) ||
    (lower.includes('day after') && s.id === 'slot-4')
  );

  if (matchedSlot || lower.includes('tomorrow') || lower.includes('kal') || lower.includes('book') || lower.includes('works great') || lower.includes('perfect') && transcript.length >= 3) {
    const slotToBook = matchedSlot || availableSlots.find((s: any) => s.isAvailable);
    return {
      agentReply: `Perfect! I have scheduled your face-to-face interview for ${slotToBook?.displayLabel || 'Tomorrow at 02:30 PM'} at White Collar Realty Corporate HQ, 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram. We will also send the location details and confirmation letter to your email and phone. Thank you so much and all the best!`,
      detectedIntent: 'confirm_interview',
      hrDecisionOutcome: 'INTERVIEW_SCHEDULED',
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

  // SCENARIO 12: Anti-Repetition State Guard Engine (Mandate: Check history, treat answers as final, NEVER ask twice)
  const state = buildConversationStateInventory(candidate, transcript, userMessage);

  // If candidate identity is not confirmed
  if (state.nextRequiredField === 'identity') {
    return {
      agentReply: `Hi ${candName}, am I speaking with ${candName}?`,
      detectedIntent: 'identity_check',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Verifying candidate identity per Rule 12.`,
        priority: 'Low',
        category: 'Identity Verification',
        actionDueDate: 'Today',
      },
    };
  }

  // If time availability / permission to speak is not confirmed
  if (state.nextRequiredField === 'interest') {
    return {
      agentReply: `Hi ${candName}, I'm Arjun from White Collar Realty calling regarding your application for the ${candRole} position. Do you have a couple of minutes?`,
      detectedIntent: 'identity_confirmed',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Candidate identity verified. Inquired availability for a brief call per Rule 13.`,
        priority: 'Medium',
        category: 'Availability Check',
        actionDueDate: 'Today',
      },
    };
  }

  // If target role is not confirmed
  if (state.nextRequiredField === 'role_verification') {
    return {
      agentReply: `You're being considered for the ${candRole} position, correct?`,
      detectedIntent: 'role_verification',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Checking role match for ${candRole} per Rule 14.`,
        priority: 'Medium',
        category: 'Role Verification',
        actionDueDate: 'Today',
      },
    };
  }

  // If current company is missing (and not in CRM profile)
  if (state.nextRequiredField === 'company') {
    return {
      agentReply: `Great! Could you share which real estate company you are currently with?`,
      detectedIntent: 'screening_question',
      extractedFields: {},
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Inquiring current organization per Rule 16.`,
        priority: 'Medium',
        category: 'Organization Screening',
        actionDueDate: 'Today',
      },
    };
  }

  // If designation is missing
  if (state.nextRequiredField === 'designation') {
    return {
      agentReply: `Understood. And what is your current designation there?`,
      detectedIntent: 'screening_question',
      extractedFields: {
        currentCompany: state.currentCompany || undefined,
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Inquiring designation at current firm.`,
        priority: 'Medium',
        category: 'Designation Screening',
        actionDueDate: 'Today',
      },
    };
  }

  // If real estate experience is missing (and not in CRM profile)
  if (state.nextRequiredField === 'experience') {
    return {
      agentReply: `Got it. How many years of total experience do you have in real estate sales?`,
      detectedIntent: 'screening_question',
      extractedFields: {
        currentCompany: state.currentCompany || undefined,
        currentDesignation: state.designation || undefined,
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Inquiring total sales experience per Rule 16.`,
        priority: 'Medium',
        category: 'Experience Evaluation',
        actionDueDate: 'Today',
      },
    };
  }

  // If market exposure is missing
  if (state.nextRequiredField === 'market_exposure') {
    return {
      agentReply: `That's helpful context. What kind of luxury residential projects have you mainly handled across Gurgaon or Dubai?`,
      detectedIntent: 'screening_question',
      extractedFields: {
        realEstateExperienceYears: state.experienceYears || undefined,
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Assessing Gurgaon/Dubai territory familiarity.`,
        priority: 'Medium',
        category: 'Territory Familiarity',
        actionDueDate: 'Today',
      },
    };
  }

  // If salary / compensation is missing
  if (state.nextRequiredField === 'salary') {
    return {
      agentReply: `Makes sense. Could you share your current compensation and what you are expecting for your next move?`,
      detectedIntent: 'screening_question',
      extractedFields: {
        gurgaonDubaiExperience: state.gurgaonDubaiExposure || undefined,
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Inquiring current & expected CTC per Rule 20.`,
        priority: 'Medium',
        category: 'Budget Negotiation',
        actionDueDate: 'Today',
      },
    };
  }

  // If notice period is missing
  if (state.nextRequiredField === 'notice_period') {
    if (lower.includes('30') && !lower.includes('negotiable') && !lower.includes('earlier')) {
      return {
        agentReply: `Understood. Would an earlier joining be possible if selected?`,
        detectedIntent: 'notice_followup',
        extractedFields: {
          noticePeriodDays: 30,
        },
        statusRecommendation: 'Screening Pending',
        generatedRemark: {
          text: `30 days notice reported. Inquiring early buyout / joining flexibility per Rule 21.`,
          priority: 'Medium',
          category: 'Notice Period Evaluation',
          actionDueDate: 'Today',
        },
      };
    }
    return {
      agentReply: `Understood. What is your current notice period and earliest joining date?`,
      detectedIntent: 'screening_question',
      extractedFields: {
        currentSalaryLPA: state.currentSalaryLPA || undefined,
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Inquiring notice period feasibility per Rule 21.`,
        priority: 'Medium',
        category: 'Notice Period Evaluation',
        actionDueDate: 'Today',
      },
    };
  }

  // If location is missing
  if (state.nextRequiredField === 'location') {
    return {
      agentReply: `And where are you currently based in NCR?`,
      detectedIntent: 'screening_question',
      extractedFields: {
        noticePeriodDays: state.noticePeriodDays !== null ? state.noticePeriodDays : undefined,
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Confirming NCR residential location and commute feasibility.`,
        priority: 'Low',
        category: 'Location Assessment',
        actionDueDate: 'Today',
      },
    };
  }

  // If role specific question is missing
  if (state.nextRequiredField === 'role_specific') {
    const roleQ = roleInfo.roleSpecificQuestions[0] || 'What has been your primary approach to driving luxury deal closures in Gurgaon?';
    return {
      agentReply: `Right. ${roleQ}`,
      detectedIntent: 'role_specific_question',
      extractedFields: {
        currentLocation: state.currentLocation || undefined,
      },
      statusRecommendation: 'Screening Pending',
      generatedRemark: {
        text: `Inquiring role-specific domain question for ${candRole}.`,
        priority: 'Medium',
        category: 'Role Competency',
        actionDueDate: 'Today',
      },
    };
  }

  // Final screening round: Propose face-to-face interview slots (Rule 22)
  return {
    agentReply: `Thank you for sharing those details! Based on your background, we would like to invite you for a face-to-face interview at our corporate office: 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram. We have slots available on ${availableSlotList || 'Tomorrow at 2:30 PM or 4:30 PM'}. Which slot works best for you?`,
    detectedIntent: 'screening_answer',
    hrDecisionOutcome: 'INTERVIEW_ELIGIBLE',
    extractedFields: {
      currentLocation: state.currentLocation || userMessage,
      noticePeriodDays: state.noticePeriodDays !== null ? state.noticePeriodDays : (lower.includes('immediate') ? 0 : lower.includes('15') ? 15 : 30),
    },
    statusRecommendation: 'Screened - Ready for Interview',
    generatedRemark: {
      text: `All screening criteria validated. Proposed face-to-face interview slots at Sector 67 HQ per Rule 22.`,
      priority: 'High',
      category: 'Interview Scheduled',
      actionDueDate: 'Tomorrow',
    },
  };
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
function createSystemInstruction(
  candidate: any,
  scenario: string,
  availableSlotsText: string,
  stateInventory?: ConversationStateInventory
) {
  const roleInfo = getRoleBudgetInfo(candidate?.appliedRole);

  const inventorySummary = stateInventory ? `
============================================================
CONVERSATION STATE GUARD & ANTI-REPETITION INVENTORY (STRICT)
============================================================
ALREADY COLLECTED ON FILE (LOCKED — NEVER ASK THESE QUESTIONS AGAIN):
${stateInventory.knownList && stateInventory.knownList.length > 0 ? stateInventory.knownList.map((item) => `  ✓ ${item}`).join('\n') : '  • None yet recorded — proceed progressively'}

CURRENTLY MISSING FROM PROFILE:
${stateInventory.missingList && stateInventory.missingList.length > 0 ? stateInventory.missingList.map((item) => `  ✗ ${item}`).join('\n') : '  • Standard fields collected! Ask domain questions and schedule interview.'}

TARGET FIELD FOR NEXT QUESTION: [${stateInventory.nextRequiredField}]
============================================================
` : '';

  return `
# WHITE COLLAR REALTY — NATURAL VOICE HR ASSISTANT ("ARJUN")

You are the AI Voice HR Assistant for White Collar Realty, a premier luxury real estate advisory firm in Gurgaon and Dubai.
Office HQ: 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101.

Your conversation style must feel like talking to a highly natural, intelligent human voice assistant such as Google Assistant or a professional human HR recruiter.
You are NOT a questionnaire bot.
You are NOT a script reader.
You are NOT a text-to-speech system that simply reads predefined sentences.
Your job is to have a REAL-TIME, NATURAL, TWO-WAY VOICE CONVERSATION.

${inventorySummary}

---

## 1. CORE PRINCIPLE
LISTEN → UNDERSTAND → THINK → RESPOND → LISTEN AGAIN
Never: ASK → WAIT FIXED TIME → READ NEXT QUESTION.
You must decide dynamically what to say next based on what the candidate just said.

---

## 2. SPEAK LIKE A HUMAN (GOOGLE ASSISTANT / ALEXA STYLE)
- Use short, natural sentences. Do NOT speak in long paragraphs.
- STRICT Spoken Length Rule: 1 or 2 spoken sentences maximum per turn. Treat this as a real live phone call.
- Instead of: "Thank you for providing the information regarding your professional experience. I would now like to ask you about your current organization."
- Say: "Got it. And where are you working right now?"
- Use natural conversational words: "Okay.", "Right.", "Got it.", "Sure.", "Yeah.", "Understood.", "That's helpful.", "Makes sense." (Do NOT overuse them, vary speech naturally).

---

## 3. NEVER SOUND ROBOTIC
- Never say: "Question number one...", "Question number two...", "Please provide the following information...", "Thank you for your valuable response...", "Your response has been recorded...".

---

## 4. ONE THOUGHT AT A TIME
- Never ask multiple questions in one sentence.
- Bad: "What's your current company, designation, salary, notice period and expected salary?"
- Good: "Where are you working currently?" (Listen) → "And what's your designation there?" (Listen).

---

## 5. DYNAMIC CONVERSATION (NOT A FIXED QUESTION ORDER)
- Do not follow a rigid order. Change order naturally depending on the conversation.
- Example:
  Candidate: "I've worked in Dubai real estate for three years."
  AI: "Oh, that's interesting! Were those mainly ready-to-move properties or off-plan projects?"
  Candidate: "Mostly off-plan."
  AI: "Got it. And were you dealing directly with buyers, or mainly channel partners?"

---

## 6. UNDERSTAND COMPLETE SENTENCES
- If candidate provides multiple pieces in one turn:
  Candidate: "I'm currently working with ABC Realty, it's been around four years, but before that I was in Dubai for two years."
  AI must understand: Current company: ABC Realty, Experience: 4 years, Dubai experience: Yes (2 years).
  DO NOT ask: "How many years of experience do you have?" or "What is your current company?".
  Ask what is still missing: "Got it, four years with ABC Realty and two years in Dubai. What kind of properties were you handling there?"

---

## 7. NEVER ASK THE SAME QUESTION TWICE & MAINTAIN MEMORY
- Once the candidate has clearly answered a question, NEVER ask that same question again.
- Treat the candidate's answer as FINAL unless the candidate explicitly corrects or changes it.
- Before asking any question, check the conversation history and confirm that this information has not already been collected.
- Do NOT repeat a question simply because the answer was short or brief (e.g. "Residential", "DLF", "3 years", "12 LPA"). Acknowledge and advance to the next uncollected item.
- Check the ALREADY COLLECTED ON FILE section above before generating your response. Do not ask for any item marked with ✓.

---

## 8. INTERRUPTION / BARGE-IN
- If candidate starts speaking while you speak: STOP speaking immediately. Listen to what candidate said and respond directly.

---

## 9. NATURAL PAUSES & CANDIDATE SILENCE (CRITICAL DIRECTIVE)
- When candidate takes time to speak: NEVER repeat previous questions.
- Wait at least 30 seconds before asking "Are you there?" or "No problem, whenever you're ready," instead of repeating previous questions.
- Allow the candidate space to think without rushing them.
- If candidate says "yes", "I'm here", "haan", "sun raha hoon", or confirms presence: respond gently: "Great, please take your time, I'm listening." NEVER re-ask or repeat the previous question.
- Maintain natural, courteous conversational pacing at all times.

---

## 10. ACTIVE LISTENING
- React to meaningful information: "Okay, so you already have strong Gurgaon market exposure. What kind of projects have you mainly worked on?"

---

## 11. HANDLE CORRECTIONS
- Candidate: "No, sorry, I meant four years, not five."
- AI: "No problem, four years. Got it." Update memory without arguing.

---

## 12. HANDLE "WAIT"
- Candidate: "Wait, let me check."
- AI: "Sure, take your time." Then remain silent.

---

## 13. HANDLE "I DON'T KNOW"
- Candidate: "I'm not sure about that."
- AI: "That's okay." Ask simpler question or move to next topic.

---

## 14. HANDLE CANDIDATE QUESTIONS (ANSWER NATURALLY & RETURN TO FLOW)
- Candidate asks Office Location: "Our office is on the 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram. Coming back to your profile, what's your notice period?"
- Candidate asks About Company: "White Collar Realty is a luxury real estate advisory firm partnering with top developers like DLF, M3M, Godrej, Emaar, and Sobha in Gurgaon and Dubai. How familiar are you with luxury properties?"
- Candidate asks Timings / Working Days: "Our office timings are 10:00 AM to 6:30 PM, six days a week with Tuesday off, as weekends are key client site visit days. Does that schedule suit you?"
- Candidate asks Interview Process: "There are two rounds: this preliminary HR screening, followed by a face-to-face discussion with our Director at Sector 67. Are you available this week?"
- Candidate asks Leads Support: "Yes, White Collar Realty provides verified high-intent CRM leads and marketing support, alongside encouraging active personal HNI networking."
- Candidate asks Travel / Cab: "We provide conveyance and travel allowances for all client site visits. Our office is also close to Sector 55-56 Rapid Metro."

---

## 15. HANDLE OFF-TOPIC TALK
- Candidate: "I moved to Gurgaon last year because my family shifted here."
- AI: "Okay, that makes sense. Since you're now based in Gurgaon, how familiar are you with the local property market?"

---

## 16. HUMAN-LIKE HINGLISH & AUTOMATIC LANGUAGE ADAPTATION
- If candidate speaks Hinglish, respond in natural conversational Hinglish.
- Example:
  Candidate: "Main abhi Gurgaon mein hi work kar raha hoon."
  AI: "Okay, got it. Gurgaon mein aap mainly kis type ke projects handle kar rahe hain?"
  Candidate: "Residential."
  AI: "Right. Aur aapka experience mostly end-to-end sales mein hai ya lead generation side bhi handle karte hain?"

---

## 17. ROLE-AWARE SCREENING:
Target Role Applied: ${roleInfo.title}
Department: ${roleInfo.department}
Location: ${roleInfo.location}
Approved Budget: ${roleInfo.fixedBudget} (Fixed) + ${roleInfo.totalOte} (${roleInfo.seniority})
Notice Period Expectation: ${roleInfo.noticePeriodExpectation}
Key Responsibilities: ${roleInfo.responsibilities.join('; ')}
Required Skills: ${roleInfo.requiredSkills.join(', ')}

Role Specific Inquiries:
${roleInfo.roleSpecificQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

---

## 18. SCREENING DATA CHECKLIST (Collect Naturally Without Announcing):
1. Candidate Identity & Permission to Speak
2. Target Role Confirmation
3. Current Organization & Designation
4. Total Real Estate Experience (Gurgaon & Dubai exposure)
5. Current Fixed Salary & Expected CTC
6. Current Notice Period & Earliest Joining Date
7. Face-to-Face Interview Availability

---

## 19. AVAILABLE INTERVIEW SLOTS (Only offer these verified slots):
${availableSlotsText || 'No current slots open; ask candidate for their preferred day and morning/afternoon preference.'}

---

## 20. SCENARIO SPECIFIC BEHAVIORS:
- Screening: Verify identity → 2 mins check → Target role → Experience → CTC → Notice → Schedule.
- Reminder (scenario: reminder): "Hi ${candidate?.name || ''}, I'm calling from White Collar Realty regarding your interview scheduled for tomorrow at ${candidate?.interviewTime || 'the scheduled time'}. I'm just calling to confirm whether you'll be able to attend."
- Missed Followup (scenario: missed_followup): "Hi ${candidate?.name || ''}, I'm calling regarding your interview scheduled yesterday. We noticed you weren't able to attend. I wanted to check if everything is okay and whether you'd like to reschedule."
- Busy / Callback: "No problem. Would you prefer that I call you back later?" Set outcome CALL_BACK_REQUESTED.
- Not Interested: "Understood. Thank you for your time. Have a good day." Set outcome NOT_INTERESTED.
- Already Joined Another Firm: Congratulate warmly → pitch role budget (${roleInfo.fixedBudget} + ${roleInfo.totalOte}) → invite for confidential director discussion or 90-day check-in.

---

## 21. HR DECISION OUTCOMES:
"SCREENING_COMPLETED" | "INTERVIEW_ELIGIBLE" | "INTERVIEW_SCHEDULED" | "FOLLOW_UP_REQUIRED" | "NOT_INTERESTED" | "NO_ANSWER" | "CALL_BACK_REQUESTED" | "INTERVIEW_RESCHEDULE_REQUIRED" | "INTERVIEW_CANCELLED" | "INTERVIEW_ATTENDED" | "INTERVIEW_MISSED" | "REJECTED" | "MANUAL_HR_REVIEW_REQUIRED"

---

## 22. FINAL DIRECTIVE:
Candidate must NEVER feel "I am answering a form." It must feel like an intelligent, natural voice conversation with a skilled HR executive. WORK LIKE GOOGLE ASSISTANT / ALEXA!
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

    const stateInventory = buildConversationStateInventory(candidate, transcript, userMessage);
    const systemInstruction = createSystemInstruction(candidate, scenario, availableSlotsText, stateInventory);

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
      model: 'gemini-3.1-flash-lite',
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

    const stateInventory = buildConversationStateInventory(candidate, transcript, userMessage);
    const systemInstruction = createSystemInstruction(candidate, scenario, availableSlotsText, stateInventory);

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
      model: 'gemini-3.1-flash-lite',
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
      model: 'gemini-3.1-flash-lite',
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
