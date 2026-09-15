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
  currentCompany?: string;
  currentDesignation?: string;
  totalExperienceYears?: number;
  realEstateExperienceYears?: number;
  gurgaonDubaiExperience?: {
    gurgaon: boolean;
    dubai: boolean;
    details?: string;
  };
  currentSalaryLPA?: string;
  expectedSalaryLPA?: string;
  currentLocation?: string;
  noticePeriodDays?: number;
  earliestJoiningDate?: string;
  preferredInterviewSlot?: string;
  interviewVenueConfirmed?: boolean;
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
  author?: string; // 'Pooja (Virtual AI HR)' | 'HR Operations'
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
  // Day-by-day alert & remarks fields
  latestRemark?: CandidateRemark;
  remarksHistory?: CandidateRemark[];
  alertDueDate?: 'Overdue' | 'Today' | 'Tomorrow' | 'Upcoming';
  alertReason?: string;
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
