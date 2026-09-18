import { Candidate, GmailEmailRecord, GmailSequenceTemplate, GmailSequenceType } from '../types';

export const GMAIL_DEFAULT_TEMPLATES: GmailSequenceTemplate[] = [
  {
    id: 'tmpl-interview-invite',
    name: 'Official In-Person Interview Call Letter & Gate Pass',
    type: 'INTERVIEW_INVITE',
    subjectTemplate: 'Interview Invitation: {{applied_role}} at White Collar Realty (M3M Urbana HQ)',
    bodyTemplate: `Dear {{candidate_name}},

Thank you for speaking with our talent acquisition team regarding the {{applied_role}} position with White Collar Realty.

Based on your profile and initial screening discussion with our Virtual HR Recruiter (Arjun), we are pleased to invite you for a comprehensive face-to-face evaluation with our Senior Leadership Panel.

--- INTERVIEW SCHEDULE & VENUE DETAILS ---
• Position: {{applied_role}}
• Scheduled Date: {{interview_date}}
• Scheduled Time: {{interview_time}}
• Reporting Venue: 6th Floor, Tower A, M3M Urbana Business Park, Sector 67, Golf Course Extension Road, Gurugram, Haryana - 122102
• Google Maps Location: https://maps.google.com/?q=M3M+Urbana+Sector+67+Gurgaon

--- DOCUMENTS TO CARRY ---
1. Updated Hard Copy of your Resume / CV
2. Recent Salary Slips / Compensation Annexure (Last 3 Months)
3. Government ID Proof (Aadhaar Card / PAN Card) for Visitor Gate Pass
4. Portfolio / Track Record of High-Value Luxury Closures (if applicable)

--- DRESS CODE & GUIDELINES ---
• Attire: Business Formal / Corporate Attire
• Please plan to arrive 10 minutes prior to your allocated slot for security registration.

If you have any queries or need to adjust your time slot, please reply directly to this email or reach our talent desk at hr@whitecollarrealty.com.

We look forward to meeting you in person!

Warm regards,

Sachin Kumar | Talent Acquisition Lead
White Collar Realty
6th Floor, Tower A, M3M Urbana Business Park, Sector 67, Gurugram
Web: https://whitecollarrealty.com/career
Email: sachinkumarwcr@gmail.com`,
  },
  {
    id: 'tmpl-slot-confirmation',
    name: 'Pre-Interview 24-Hour Attendance Reconfirmation',
    type: 'SLOT_CONFIRMATION',
    subjectTemplate: 'Reminder: In-Person Interview Tomorrow for {{applied_role}} - White Collar Realty',
    bodyTemplate: `Dear {{candidate_name}},

This is a gentle reminder regarding your upcoming interview scheduled for tomorrow at White Collar Realty.

• Position: {{applied_role}}
• Date: {{interview_date}}
• Time: {{interview_time}}
• Location: 6th Floor, Tower A, M3M Urbana Business Park, Sector 67, Gurugram

Our leadership team is eager to learn more about your real estate experience and discuss strategic growth opportunities with us. 

Please reply with "CONFIRMED" to this email to ensure your visitor security clearance is pre-approved at the reception.

Warm regards,
HR Operations Desk
White Collar Realty
Email: hr@whitecollarrealty.com`,
  },
  {
    id: 'tmpl-post-screening',
    name: 'Post-Screening Discussion Summary & Next Steps',
    type: 'POST_SCREENING_NEXT_STEPS',
    subjectTemplate: 'Update on Your Application for {{applied_role}} - White Collar Realty',
    bodyTemplate: `Dear {{candidate_name}},

Thank you for your valuable time during our recent telephonic screening call for the {{applied_role}} opening.

We have reviewed your background, compensation expectations, and real estate experience. Our team has marked your profile as Eligible for the next evaluation round.

Our HR coordinator will be sharing your interview schedule link shortly. You can also view more about our projects and culture at https://whitecollarrealty.com.

Best regards,

Talent Acquisition Team
White Collar Realty`,
  },
  {
    id: 'tmpl-reschedule',
    name: 'Missed Slot Follow-Up & Rescheduling Sequence',
    type: 'MISSED_INTERVIEW_RESCHEDULE',
    subjectTemplate: 'Reschedule Your Interview with White Collar Realty ({{applied_role}})',
    bodyTemplate: `Dear {{candidate_name}},

We noticed that you were unable to attend your scheduled interview on {{interview_date}} for the {{applied_role}} role at our M3M Urbana Gurgaon office.

We understand unexpected scheduling conflicts arise in our fast-paced real estate industry. We would be happy to accommodate you in our next interview batch.

Please reply with your availability for this week (Morning 11:30 AM / Afternoon 2:30 PM / Evening 4:30 PM) so we can issue an updated gate pass.

Warm regards,

HR Operations
White Collar Realty
Email: sachinkumarwcr@gmail.com`,
  },
  {
    id: 'tmpl-general-followup',
    name: 'Luxury Real Estate Talent Network Check-In',
    type: 'GENERAL_FOLLOWUP',
    subjectTemplate: 'Exploring Career Opportunities in Luxury Real Estate: White Collar Realty',
    bodyTemplate: `Dear {{candidate_name}},

Hope you are doing well.

White Collar Realty is expanding its Gurgaon luxury corridors (Golf Course Extension, Dwarka Expressway) and Dubai International Property Advisory desks.

Given your expertise in real estate, we would love to connect for a quick confidential discussion regarding leadership and senior consultant opportunities offering industry-leading compensation (Base CTC + up to 2% uncapped brokerage cuts).

Feel free to share your convenient time for a brief introductory call.

Warm regards,

Talent Acquisition Specialist
White Collar Realty
https://whitecollarrealty.com/career`,
  },
];

const GMAIL_STORAGE_KEY = 'wcr_gmail_sent_records_v1';

export function getSentGmailRecords(): GmailEmailRecord[] {
  try {
    const data = localStorage.getItem(GMAIL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load sent Gmail records', e);
    return [];
  }
}

export function saveGmailRecord(record: GmailEmailRecord): void {
  try {
    const existing = getSentGmailRecords();
    const updated = [record, ...existing];
    localStorage.setItem(GMAIL_STORAGE_KEY, JSON.stringify(updated.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save Gmail record', e);
  }
}

/**
 * Fills template placeholders with candidate's actual CRM information
 */
export function populateGmailTemplate(
  template: GmailSequenceTemplate,
  candidate: Candidate,
  senderEmail: string = 'sachinkumarwcr@gmail.com'
): { subject: string; body: string } {
  const interviewDate = candidate.interviewDate || 'To Be Confirmed';
  const interviewTime = candidate.interviewTime || '11:30 AM';
  const venue = candidate.interviewVenue || '6th Floor, Tower A, M3M Urbana Business Park, Sector 67, Gurugram';
  const appliedRole = candidate.appliedRole || 'Senior Property Consultant';
  const candidateName = candidate.name || 'Candidate';
  const currentCompany = candidate.screening?.currentCompany || 'Real Estate Sector';

  const replacePlaceholders = (text: string): string => {
    return text
      .replace(/\{\{candidate_name\}\}/g, candidateName)
      .replace(/\{\{applied_role\}\}/g, appliedRole)
      .replace(/\{\{interview_date\}\}/g, interviewDate)
      .replace(/\{\{interview_time\}\}/g, interviewTime)
      .replace(/\{\{venue\}\}/g, venue)
      .replace(/\{\{current_company\}\}/g, currentCompany)
      .replace(/\{\{recruiter_name\}\}/g, 'Sachin Kumar')
      .replace(/\{\{sender_email\}\}/g, senderEmail);
  };

  return {
    subject: replacePlaceholders(template.subjectTemplate),
    body: replacePlaceholders(template.bodyTemplate),
  };
}

/**
 * Generates an official Gmail Web compose URL with pre-filled fields
 */
export function generateGmailWebComposeUrl(
  candidateEmail: string,
  subject: string,
  body: string,
  cc: string = 'sachinkumarwcr@gmail.com,hr@whitecollarrealty.com'
): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: candidateEmail,
    su: subject,
    body: body,
    cc: cc,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/**
 * Generates a mailto: link for desktop email client
 */
export function generateMailtoUrl(
  candidateEmail: string,
  subject: string,
  body: string,
  cc: string = 'sachinkumarwcr@gmail.com'
): string {
  return `mailto:${encodeURIComponent(candidateEmail)}?subject=${encodeURIComponent(subject)}&cc=${encodeURIComponent(cc)}&body=${encodeURIComponent(body)}`;
}

/**
 * Dispatches automated interview email sequence
 */
export async function dispatchGmailSequence(
  candidate: Candidate,
  sequenceType: GmailSequenceType,
  senderEmail: string = 'sachinkumarwcr@gmail.com',
  customSubject?: string,
  customBody?: string
): Promise<GmailEmailRecord> {
  const template = GMAIL_DEFAULT_TEMPLATES.find((t) => t.type === sequenceType) || GMAIL_DEFAULT_TEMPLATES[0];
  const { subject, body } = populateGmailTemplate(template, candidate, senderEmail);

  const finalSubject = customSubject || subject;
  const finalBody = customBody || body;

  const emailRecord: GmailEmailRecord = {
    id: `GMAIL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    candidateId: candidate.id,
    candidateEmail: candidate.email || 'candidate@applicant.in',
    candidateName: candidate.name,
    subject: finalSubject,
    bodyHtml: finalBody,
    sequenceType: sequenceType,
    status: 'SENT',
    sentAt: new Date().toISOString(),
    senderEmail: senderEmail,
    ccEmails: ['sachinkumarwcr@gmail.com', 'hr@whitecollarrealty.com'],
    trackingId: `WCR-TRK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
  };

  // Persist record
  saveGmailRecord(emailRecord);

  // Simulated API response delay
  await new Promise((resolve) => setTimeout(resolve, 350));

  return emailRecord;
}
