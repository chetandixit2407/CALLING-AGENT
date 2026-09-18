export type LanguageMode = 'Auto (Hinglish/Hindi/English)' | 'English' | 'Hindi';

export type CallScenario = 
  | 'screening' 
  | 'reminder' 
  | 'missed_followup' 
  | 'callback_followup';

export type CandidateStatus =
  | 'Screening Pending'
  | 'Screened - Ready for Interview'
  | 'Interview Scheduled'
  | 'Attendance Confirmed'
  | 'Missed Interview - Followup'
  | 'Callback Needed'
  | 'Declined - Do Not Call';

export type InterviewStatus = 
  | 'Not Scheduled' 
  | 'Scheduled' 
  | 'Confirmed' 
  | 'Rescheduled' 
  | 'Missed' 
  | 'Completed' 
  | 'Declined';

export interface ScreeningData {
  // Education & Academic Credentials (HR Round 1 mandatory)
  educationDegree?: string; // e.g., 'B.Tech Computer Science', 'MBA Marketing', 'BCA', 'B.Com'
  educationCollege?: string; // e.g., 'DTU Delhi', 'IIT Roorkee', 'Amity Gurugram', 'Delhi University'
  graduationYear?: number | string; // e.g., 2024, 2025, 2022
  
  // Tech & Engineering Screening Evaluation
  techProjectsSummary?: string; // Key projects built e.g. Real Estate CRM portal, AI Voice Bot
  programmingLanguages?: string[]; // e.g. ['TypeScript', 'React', 'Node.js', 'Python', 'SQL']
  techFrameworksAndTools?: string[]; // e.g. ['FastAPI', 'PostgreSQL', 'Docker', 'Tailwind']
  githubOrPortfolioUrl?: string;

  // Real Estate & Sales Evaluation
  currentCompany?: string;
  currentDesignation?: string;
  totalExperienceYears?: number;
  realEstateExperienceYears?: number;
  gurgaonDubaiExperience?: {
    gurgaon: boolean;
    dubai: boolean;
    details?: string;
  };

  // Internship Specific Fields
  isInternship?: boolean;
  internshipDurationMonths?: number;
  availabilityForFullTime?: boolean;

  // HR Logistics & Compensation
  currentSalaryLPA?: string; // or stipend e.g., '₹25,000/mo' or '12 LPA Fixed'
  expectedSalaryLPA?: string; // or expected stipend
  currentLocation?: string;
  noticePeriodDays?: number;
  earliestJoiningDate?: string;
  preferredInterviewSlot?: string;
  interviewVenueConfirmed?: boolean;
  workFromOfficeAgreed?: boolean; // M3M Urbana Sector 67 Gurugram HQ
}

export interface ChatMessage {
  id: string;
  sender: 'agent' | 'candidate' | 'system';
  text: string;
  timestamp: string;
  language?: 'English' | 'Hindi' | 'Hinglish';
}

export interface CallRecord {
  id: string;
  candidateId: string;
  candidateName: string;
  timestamp: string;
  scenario: CallScenario;
  durationSeconds: number;
  transcript: ChatMessage[];
  summary: string;
  outcome: string;
  extractedFields: Partial<ScreeningData>;
  detectedIntent?: string;
  callbackTime?: string;
  declineReason?: string;
  conversationMemory?: ConversationMemory;
  hrDecisionOutcome?: HrDecisionOutcome;
  afterCallAction?: AfterCallAction;
}

export type RemarkPriority = 'Urgent' | 'High' | 'Medium' | 'Low';

export type RemarkCategory =
  | 'Interview Scheduled'
  | 'Already Joined - Counter Offer Open'
  | 'Already Joined - Future Pipeline'
  | 'Budget Negotiation'
  | 'Notice Period Evaluation'
  | 'Callback Due'
  | 'Missed Interview Reschedule'
  | 'Unanswered Retry'
  | 'Attendance Reconfirmation'
  | 'Declined - Do Not Call';

export interface CandidateRemark {
  id: string;
  text: string;
  priority: RemarkPriority;
  category: RemarkCategory;
  createdAt: string;
  actionDueDate?: string; // e.g. 'Today', 'Tomorrow', 'Overdue', 'In 3 Days', or 'In 30 Days'
  author?: string; // 'Arjun (Virtual AI HR)' | 'HR Operations'
}

export interface CandidateNoteSnippet {
  id: string;
  timestamp: string;
  title: string;
  snippet: string;
  callScenario?: string;
  scenario?: string;
  callId?: string;
  durationSeconds?: number;
  author?: string; // 'Arjun (Virtual AI HR)' | 'Arjun AI (Vapi Recruiter)' | 'HR Operations'
}

export interface Candidate {
  id: string;
  name: string;
  phone: string;
  email: string;
  appliedRole: string;
  status: CandidateStatus;
  screening: ScreeningData;
  interviewSlotId?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewVenue?: string;
  interviewStatus: InterviewStatus;
  lastCallDate?: string;
  lastEmailSentAt?: string;
  lastWhatsAppSentAt?: string;
  callCount: number;
  unansweredAttempts: number;
  callbackTime?: string;
  declineReason?: string;
  notes?: string;
  notesHistory?: CandidateNoteSnippet[];
  lastNotesAutoSavedAt?: string;
  // Day-by-day alert & remarks fields
  latestRemark?: CandidateRemark;
  remarksHistory?: CandidateRemark[];
  alertDueDate?: 'Overdue' | 'Today' | 'Tomorrow' | 'Upcoming';
  alertReason?: string;
  conversationMemory?: ConversationMemory;
  hrDecisionOutcome?: HrDecisionOutcome;
  afterCallAction?: AfterCallAction;
  callHistory: CallRecord[];
  scorecard?: {
    gurgaonDubaiScore: 'High' | 'Medium' | 'Low' | 'None';
    experienceFit: 'Senior Fit' | 'Mid Fit' | 'Junior Fit';
    budgetAlignment: 'Within Budget' | 'Stretch' | 'High Expectation';
    joiningTimeline: 'Immediate (<15 days)' | '30 Days' | '60+ Days';
    recommendation: 'Priority Interview' | 'Proceed' | 'Consider Alternative' | 'Not Selected';
  };
}

export interface InterviewSlot {
  id: string;
  date: string;
  time: string;
  displayLabel: string;
  venue: string;
  maxCapacity: number;
  bookedCount: number;
  bookedCandidateId?: string;
  bookedCandidateName?: string;
  isAvailable: boolean;
}

export interface FollowupItem {
  id: string;
  candidateId: string;
  candidateName: string;
  phone: string;
  appliedRole: string;
  type: 'unanswered' | 'missed_interview' | 'callback_requested' | 'attendance_reconfirm';
  priority: 'High' | 'Medium' | 'Low';
  scheduledTimeOrDate: string;
  attemptsMade: number;
  lastNote: string;
}

// Rule 28: Conversation Memory State maintained throughout call
export interface ConversationMemory {
  candidate_name: string;
  target_role: string;
  education_degree?: string;
  education_college?: string;
  graduation_year?: string;
  tech_projects?: string;
  programming_languages?: string;
  is_tech_role?: boolean;
  is_internship?: boolean;
  current_company: string;
  designation: string;
  total_experience: string;
  real_estate_experience: string;
  gurgaon_experience: string;
  dubai_experience: string;
  current_salary: string;
  expected_salary: string;
  salary_not_disclosed: boolean;
  current_location: string;
  notice_period: string;
  earliest_joining_date: string;
  work_from_office_agreed?: boolean;
  interested: string;
  interview_date: string;
  interview_time: string;
  conversation_status: string;
  missing_information: string[];
  next_action: string;
}

// Rule 35: HR Decision Rules
export type HrDecisionOutcome =
  | 'SCREENING_COMPLETED'
  | 'INTERVIEW_ELIGIBLE'
  | 'INTERVIEW_SCHEDULED'
  | 'FOLLOW_UP_REQUIRED'
  | 'NOT_INTERESTED'
  | 'NO_ANSWER'
  | 'CALL_BACK_REQUESTED'
  | 'INTERVIEW_RESCHEDULE_REQUIRED'
  | 'INTERVIEW_CANCELLED'
  | 'INTERVIEW_ATTENDED'
  | 'INTERVIEW_MISSED'
  | 'REJECTED'
  | 'MANUAL_HR_REVIEW_REQUIRED';

// Rule 37: After-Call Action Record for HR system
export interface AfterCallAction {
  candidate_id: string;
  call_status: string;
  screening_status: HrDecisionOutcome | string;
  target_role: string;
  screening_summary: string;
  candidate_answers: Record<string, any>;
  missing_information: string[];
  interview_status: string;
  interview_date: string;
  interview_time: string;
  follow_up_required: boolean;
  follow_up_date: string;
  hr_remarks: string;
  next_action: string;
}

// Rule 15 & 16: White Collar Realty Job Description
export interface JobDescription {
  id: string;
  title: string;
  department: string;
  location: string;
  roleType?: 'Job' | 'Internship';
  category?: 'Tech' | 'Real Estate & Sales' | 'Marketing' | 'HR' | 'Finance & Ops';
  isTechRole?: boolean;
  isInternship?: boolean;
  minExperienceYears: number;
  maxExperienceYears: number;
  minRealEstateExpYears: number;
  budgetBand: string;
  oteBand: string;
  educationRequirement?: string;
  techStack?: string[];
  keyResponsibilities: string[];
  requiredSkills: string[];
  marketFocus: string;
  noticePeriodExpectation: string;
  roleSpecificQuestions: string[];
}

export type TeamRoleType = 'HR Operations' | 'Support & Logistics' | 'Hiring Manager' | 'Director / Executive' | 'Branch Desk';

export interface TeamEmailMember {
  id: string;
  name: string;
  email: string;
  role: TeamRoleType;
  department: string;
  isActive: boolean;
  receiveGmailSummaries: boolean;
  receiveCalendarInvites: boolean;
  receiveSheetsSyncAlerts: boolean;
  receiveDriveDossierLinks: boolean;
  receiveWhatsAppAlerts: boolean;
  phone?: string;
  addedAt: string;
}

export interface TeamAutomationConfig {
  autoSyncGoogleSheets: boolean;
  autoSendGmailTeamSummaries: boolean;
  autoBookGoogleCalendar: boolean;
  autoArchiveDriveDossier: boolean;
  autoSendCandidateWhatsApp: boolean;
  autoSendCandidateEmail: boolean;
  googleSheetName: string;
  googleDriveFolderName: string;
  notifyOnCallComplete: boolean;
  notifyOnInterviewScheduled: boolean;
  notifyOnCallbackRequested: boolean;
  teamMembers: TeamEmailMember[];
}

export interface AutomationDispatchResult {
  id: string;
  timestamp: string;
  candidateName: string;
  candidateRole: string;
  event: 'Call Completed' | 'Interview Scheduled' | 'Manual Data Share' | 'Candidate Screened';
  status: 'Success' | 'Partial' | 'Failed';
  dispatchedToEmails: string[];
  sheetsSynced: boolean;
  calendarEventCreated: boolean;
  gmailSentCount: number;
  driveDossierCreated: boolean;
  whatsAppPrepared: boolean;
  details: string;
}

export type CandidatePriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface CandidateCalculatedPriority {
  level: CandidatePriorityLevel;
  score: number; // 0 - 100
  reasons: string[];
}

export interface CandidateAnalysisSummary {
  strengths: string[];
  redFlags: string[];
  gurgaonMarketFit: string;
  ctcFit: string;
  noticePeriodFit: string;
  hrActionRecommendation: string;
  generatedAt: string;
}

export interface GoogleSheetsSyncConfig {
  sheetId: string;
  sheetName: string;
  spreadsheetTitle: string;
  autoSyncEnabled: boolean;
  syncIntervalSeconds: number; // e.g. 30 seconds
  webhookUrl?: string;
  appsScriptUrl?: string;
  lastSyncedTimestamp?: string;
  autoPushOnCallEnd: boolean;
  autoPushOnStatusChange: boolean;
}

export interface GoogleSheetsSyncLog {
  id: string;
  timestamp: string;
  type: 'BACKGROUND_CRON' | 'MANUAL_TRIGGER' | 'ON_CALL_END' | 'ON_STATUS_CHANGE' | 'BATCH_IMPORT';
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  recordsCount: number;
  message: string;
  sheetUrl: string;
}

export interface CareerJobOpening {
  id: string;
  title: string;
  code: string;
  department: string;
  roleType?: 'Job' | 'Internship';
  category?: 'Tech' | 'Real Estate & Sales' | 'Marketing' | 'HR' | 'Finance & Ops';
  isTechRole?: boolean;
  isInternship?: boolean;
  location: string;
  openingsCount: number;
  minExpYears: number;
  maxExpYears: number;
  budgetBand: string;
  oteBand: string;
  status: 'Active' | 'Urgent' | 'Draft';
  careerUrl: string;
  experienceLevel: 'Intern' | 'Entry' | 'Mid' | 'Senior' | 'Leadership';
  educationRequirement?: string;
  techStack?: string[];
  keyResponsibilities: string[];
  requiredSkills: string[];
  mustHaveQualifications: string[];
  screeningQuestions: string[];
  lastSyncedAt?: string;
}

export interface DataCleaningReport {
  totalProcessed: number;
  validCandidatesImported: number;
  phonesNormalized: number;
  namesCleaned: number;
  duplicatesMerged: number;
  rolesStandardized: number;
  prioritiesComputed: number;
  errors: string[];
}

export interface DuplicateCandidateGroup {
  id: string;
  reason: 'PHONE_MATCH' | 'EMAIL_MATCH' | 'NAME_PHONE_MATCH';
  primaryCandidate: Candidate;
  duplicateCandidates: Candidate[];
  confidence: 'HIGH' | 'EXACT' | 'FUZZY';
  matchedKey: string;
}

export interface DataHygieneMetrics {
  hygieneScore: number; // 0 - 100%
  totalCandidates: number;
  validPhonesCount: number;
  standardizedNamesCount: number;
  duplicateProfilesCount: number;
  completeScreeningsCount: number;
  scheduledInterviewsCount: number;
}

// Gmail Integration & Follow-up Sequences
export type GmailSequenceType = 
  | 'INTERVIEW_INVITE' 
  | 'SLOT_CONFIRMATION' 
  | 'POST_SCREENING_NEXT_STEPS' 
  | 'MISSED_INTERVIEW_RESCHEDULE' 
  | 'OFFER_LETTER_PREVIEW' 
  | 'GENERAL_FOLLOWUP';

export interface GmailEmailRecord {
  id: string;
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  subject: string;
  bodyHtml: string;
  sequenceType: GmailSequenceType;
  status: 'QUEUED' | 'SENT' | 'DRAFT' | 'OPENED';
  sentAt?: string;
  senderEmail: string;
  ccEmails?: string[];
  trackingId: string;
  scheduledFor?: string;
}

export interface GmailSequenceTemplate {
  id: string;
  name: string;
  type: GmailSequenceType;
  subjectTemplate: string;
  bodyTemplate: string;
  delayHours?: number;
  autoTriggerOnStatus?: CandidateStatus | 'INTERVIEW_BOOKED';
}

// Google Calendar API Integration
export interface GoogleCalendarEvent {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  title: string;
  description: string;
  location: string;
  startTime: string; // ISO or formatted
  endTime: string;
  status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED' | 'RESCHEDULED';
  googleCalendarLink: string;
  icsDownloadUrl?: string;
  attendees: string[];
  reminderMinutesBefore: number[];
  syncedAt: string;
  eventId?: string;
}

// Voice Transcript Sentiment & Talk-Time Analytics
export type SentimentCategory = 'Positive' | 'Interested' | 'Neutral' | 'Hesitant' | 'Resistant';

export interface VoiceAnalyticsMetrics {
  candidateId: string;
  candidateName: string;
  callRecordId: string;
  totalDurationSeconds: number;
  candidateTalkTimeSeconds: number;
  candidateTalkTimePercentage: number;
  agentTalkTimeSeconds: number;
  agentTalkTimePercentage: number;
  silenceSeconds: number;
  silencePercentage: number;
  candidateWordsCount: number;
  agentWordsCount: number;
  speakingRateWPM: number;
  overallSentiment: SentimentCategory;
  sentimentScore: number; // 0 - 100
  engagementIndex: number; // 0 - 100
  communicationClarity: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
  luxurySalesAptitudeScore: number; // 0 - 100
  keyInterestSignals: string[];
  detectedHesitations: string[];
  topDiscussedKeywords: { word: string; count: number; category: string }[];
  turnCount: number;
  analyzedAt: string;
}


