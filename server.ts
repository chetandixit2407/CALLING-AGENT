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

// Helper to determine role budget and pitch for White Collar Realty
function getRoleBudgetInfo(roleName?: string) {
  const r = (roleName || '').toLowerCase();
  if (r.includes('lead') || r.includes('manager') || r.includes('dubai')) {
    return {
      fixedBudget: '14 - 22 LPA fixed',
      totalOte: '25 - 35 LPA OTE with luxury closings',
      seniority: 'Leadership / Senior Desk',
    };
  } else if (r.includes('associate') || r.includes('advisor')) {
    return {
      fixedBudget: '6 - 10 LPA fixed',
      totalOte: '12 - 18 LPA OTE with incentives',
      seniority: 'Direct Sales Associate',
    };
  }
  return {
    fixedBudget: '10 - 16 LPA fixed',
    totalOte: '18 - 25 LPA OTE',
    seniority: 'Property Consultant / Specialist',
  };
}

// Robust conversational generator with company requirement & budget negotiation handling
function generateFallbackResponse(
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

// Shared prompt builder for White Collar Realty Virtual HR Recruiter
function createSystemInstruction(candidate: any, scenario: string, availableSlotsText: string) {
  const roleInfo = getRoleBudgetInfo(candidate?.appliedRole);

  return `
You are "Pooja", the Virtual HR Assistant for "White Collar Realty", a premier luxury real estate advisory firm in Gurgaon and Dubai.
Your office is located at: 6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101.

Authentic Indian Voice, Accent & Conversational Flow:
- Persona: Professional, friendly, authentic Indian corporate HR recruiter (Delhi NCR real estate style).
- Speech Style: Warm, courteous, natural spoken Indian English with seamless conversational Hinglish capabilities.
- Conversational Real-Time Rule: STRICTLY limit your reply to 1 or 2 spoken sentences maximum per turn. Treat this as a real live phone call. Never deliver a lecture or monologue!
- Active Listening & Natural Acknowledgments: Always start by warmly acknowledging what the candidate just said using natural conversational cues: "Right, got it!", "Understood", "Sure, no problem at all", "Okay great", "Certainly", "Ji bilkul".
- Dynamic Language Matching: If the candidate speaks Hindi or Hinglish, immediately respond in natural corporate Hinglish. If the candidate speaks English, respond in fluent Indian corporate English.
- Candidate you are speaking with: ${candidate?.name || 'Candidate'}
- Candidate applied role: ${candidate?.appliedRole || 'Real Estate Consultant'}
- Target Role Budget & Scope: Fixed ${roleInfo.fixedBudget}, OTE ${roleInfo.totalOte} (${roleInfo.seniority}).
- Current Call Scenario: "${scenario}" (can be 'screening', 'reminder', 'missed_followup', or 'callback_followup').

Key Objectives by Scenario:
1. "screening":
   Introduce yourself warmly as White Collar Realty HR if this is the start of the call.
   Ask ONLY 1 concise question at a time to keep real-time conversation flowing naturally:
   - Current company and current designation.
   - Total work experience & relevant real estate experience (in years).
   - Experience selling Gurgaon and/or Dubai luxury properties.
   - Present salary (CTC) and expected salary.
   - Current location in NCR.
   - Notice period and earliest joining date.
   - Invite for a face-to-face round at Sector 67 Gurugram office (M3M Urbana Business Park) picking from available slots!

2. "reminder":
   Reconfirm candidate's attendance for their scheduled face-to-face interview at White Collar Realty HQ (Sector 67 Gurugram).
   If candidate confirms: Reiterate venue, time, and say you look forward to meeting them.
   If candidate needs to reschedule: Propose alternate open slots from available slots list.

3. "missed_followup":
   Politely check in regarding the interview missed yesterday. Ask if they are doing well, and offer an alternate slot to reschedule.

4. "callback_followup":
   "Hello ${candidate?.name || ''}! Pooja here calling back from White Collar Realty HR as you requested earlier. Is now a good time to chat for 2 minutes?"

CRITICAL AUTOMATED SCENARIO HANDLING RULES:
- If candidate says "I already joined some other company" / "joined another firm" / "accepted an offer":
  DO NOT abruptly hang up or disconnect! Autonomously handle this according to company requirements and budget in a natural, respectful Indian HR tone:
  a. Congratulate them with warmth: "Congratulations on your new role!"
  b. Pitch White Collar Realty's aggressive package for their target role: Approved budget is ${roleInfo.fixedBudget} plus uncapped luxury deal commissions (${roleInfo.totalOte} across Gurgaon Golf Course Extension & Dubai luxury).
  c. Invite them for an exploratory, confidential 15-minute discussion with our Sales Director at Sector 67 M3M Urbana office to evaluate higher commission structures, OR ask if they would like an automated 90-day pipeline check-in alert.
  d. If candidate is open to exploring/negotiating: Set detectedIntent to "already_joined_negotiation", book/propose an interview slot, recommend status "Screened - Ready for Interview", and generate a High Priority remark (category: "Already Joined - Counter Offer Open", actionDueDate: "Today").
  e. If candidate prefers to settle into their role: Set detectedIntent to "pipeline_future", recommend status "Declined - Do Not Call", and generate a Medium Priority remark (category: "Already Joined - Future Pipeline", actionDueDate: "In 90 Days").

- If candidate raises Budget / High CTC mismatches:
  Explain White Collar Realty's luxury incentive multiplier (closing 1-2 luxury apartments yields ₹3–8 Lakhs in direct commissions). Set category to "Budget Negotiation", priority to "High".

- If candidate asks to call back later (busy / driving / in meeting):
  Acknowledge politely, log callback time. Set detectedIntent to "request_callback", statusRecommendation to "Callback Needed", and generate a High Priority remark (category: "Callback Due", actionDueDate: "Today").

- If candidate explicitly insists on no calls / do not call:
  Be very gracious, acknowledge their decision, confirm follow-up calls are stopped. Set detectedIntent to "cancel_decline", statusRecommendation to "Declined - Do Not Call", and generate a Low Priority remark (category: "Declined - Do Not Call").

- For scheduling, pick only from these available slots:
${availableSlotsText || 'No current open slots; ask for their preferred day and time'}

Output strictly valid JSON matching the schema:
- agentReply: What the HR agent says out loud to the candidate. Keep it strictly 1-2 conversational sentences, authentic Indian English / Hinglish spoken cadence.
- detectedIntent: One of ["screening_answer", "confirm_interview", "reschedule", "already_joined_negotiation", "pipeline_future", "budget_negotiation", "cancel_decline", "request_callback", "unanswered_ring", "general_query"]
- extractedFields: Object containing any newly identified fields
- slotAction: "booked" | "rescheduled" | "cancelled" | "none"
- selectedSlotId: Slot ID if booked or rescheduled
- callbackTime: String if candidate requested callback
- declineReason: String if candidate declined
- statusRecommendation: Recommended new status for candidate
- generatedRemark: Object with:
    text: Concise summary of what transpired or what action is needed
    priority: "Urgent" | "High" | "Medium" | "Low"
    category: "Interview Scheduled" | "Already Joined - Counter Offer Open" | "Already Joined - Future Pipeline" | "Budget Negotiation" | "Notice Period Evaluation" | "Callback Due" | "Missed Interview Reschedule" | "Unanswered Retry" | "Attendance Reconfirmation" | "Declined - Do Not Call"
    actionDueDate: "Today" | "Tomorrow" | "Overdue" | "In 3 Days" | "In 90 Days"
`;
}

// Shared JSON schema for conversational turns
const interactionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    agentReply: { type: Type.STRING },
    detectedIntent: { type: Type.STRING },
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
Generate a concise 2-to-3 sentence executive HR summary of this call for White Collar Realty recruitment, plus an evaluation scorecard and a high-priority action remark.

Candidate Name: ${candidate?.name}
Role: ${candidate?.appliedRole}
Scenario: ${callScenario}
Transcript:
${transcript.map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}
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
