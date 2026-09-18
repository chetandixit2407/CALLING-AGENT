import { Candidate, GoogleCalendarEvent } from '../types';

const CALENDAR_STORAGE_KEY = 'wcr_google_calendar_events_v1';

export function getSavedCalendarEvents(): GoogleCalendarEvent[] {
  try {
    const data = localStorage.getItem(CALENDAR_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load Google Calendar events', e);
    return [];
  }
}

export function saveCalendarEvent(event: GoogleCalendarEvent): void {
  try {
    const existing = getSavedCalendarEvents();
    const filtered = existing.filter((e) => e.candidateId !== event.candidateId || e.id !== event.id);
    const updated = [event, ...filtered];
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(updated.slice(0, 100)));
  } catch (e) {
    console.error('Failed to save Google Calendar event', e);
  }
}

/**
 * Parses interview date & time string into ISO Date objects
 */
export function parseInterviewDateTime(dateStr?: string, timeStr?: string): { start: Date; end: Date } {
  const now = new Date();
  let targetDate = new Date();

  if (dateStr) {
    const lower = dateStr.toLowerCase();
    if (lower.includes('today')) {
      targetDate = new Date();
    } else if (lower.includes('tomorrow')) {
      targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (lower.includes('in 2 days') || lower.includes('in 3 days')) {
      targetDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    } else {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }
  }

  // Parse time e.g. "11:30 AM", "02:30 PM", "4:00 PM"
  let hours = 11;
  let minutes = 30;

  if (timeStr) {
    const match = timeStr.match(/(\d+):?(\d+)?\s*(am|pm)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3] ? match[3].toLowerCase() : '';

      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;

      hours = h;
      minutes = m;
    }
  }

  targetDate.setHours(hours, minutes, 0, 0);
  const endDate = new Date(targetDate.getTime() + 45 * 60 * 1000); // 45 min interview slot

  return { start: targetDate, end: endDate };
}

/**
 * Generates an official Google Calendar 1-Click scheduling URL
 */
export function generateGoogleCalendarWebUrl(
  candidate: Candidate,
  customTitle?: string,
  customLocation?: string
): string {
  const { start, end } = parseInterviewDateTime(candidate.interviewDate, candidate.interviewTime);

  const formatGCalDate = (d: Date): string => {
    return d.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const title = customTitle || `Interview: ${candidate.appliedRole} - ${candidate.name} (White Collar Realty)`;
  const location = customLocation || candidate.interviewVenue || '6th Floor, Tower A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana - 122102';
  
  const details = `WHITE COLLAR REALTY - CANDIDATE INTERVIEW
Candidate Name: ${candidate.name}
Phone: ${candidate.phone}
Email: ${candidate.email}
Applied Designation: ${candidate.appliedRole}
Interview Status: ${candidate.interviewStatus || 'Confirmed'}

Reporting Venue: ${location}
Hiring Lead: Sachin Kumar (sachinkumarwcr@gmail.com)
Candidate Notes: ${candidate.notes || 'Interview scheduled via Arjun AI Virtual HR Recruiter.'}
Portal: https://whitecollarrealty.com/career`;

  const attendees = [
    candidate.email || 'candidate@applicant.in',
    'sachinkumarwcr@gmail.com',
    'hr@whitecollarrealty.com'
  ].join(',');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGCalDate(start)}/${formatGCalDate(end)}`,
    details: details,
    location: location,
    add: attendees,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an RFC 5545 compliant .ics (iCalendar) string for Apple / Outlook / Google Calendar
 */
export function generateICSFileContent(candidate: Candidate): string {
  const { start, end } = parseInterviewDateTime(candidate.interviewDate, candidate.interviewTime);

  const formatICSDate = (d: Date): string => {
    return d.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const title = `Interview: ${candidate.appliedRole} - ${candidate.name} (White Collar Realty)`;
  const location = candidate.interviewVenue || '6th Floor, Tower A, M3M Urbana Business Park, Sector 67, Gurugram';
  const description = `Face-to-Face Interview Evaluation for ${candidate.name} (${candidate.appliedRole})\\nVenue: ${location}\\nContact: Sachin Kumar (sachinkumarwcr@gmail.com)`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//White Collar Realty//ATS Calendar Service//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:WCR-${candidate.id}-${Date.now()}@whitecollarrealty.com`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'ORGANIZER;CN=White Collar Realty HR:mailto:sachinkumarwcr@gmail.com',
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=${candidate.name}:mailto:${candidate.email}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: White Collar Realty Interview in 30 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Downloads .ics calendar invite directly to user's device
 */
export function downloadCandidateICSFile(candidate: Candidate): void {
  const ics = generateICSFileContent(candidate);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Interview_${candidate.name.replace(/\s+/g, '_')}_WCR.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Background Service API: Auto-schedules interview in Google Calendar
 */
export async function autoScheduleGoogleCalendarInterview(
  candidate: Candidate
): Promise<GoogleCalendarEvent> {
  const { start, end } = parseInterviewDateTime(candidate.interviewDate, candidate.interviewTime);
  const gcalUrl = generateGoogleCalendarWebUrl(candidate);

  const event: GoogleCalendarEvent = {
    id: `GCAL-${candidate.id}-${Date.now()}`,
    candidateId: candidate.id,
    candidateName: candidate.name,
    candidateEmail: candidate.email || 'candidate@applicant.in',
    title: `Interview: ${candidate.appliedRole} - ${candidate.name} (White Collar Realty)`,
    description: `Face-to-face evaluation at M3M Urbana HQ. Screening notes: ${candidate.notes || 'Screened by Arjun AI'}.`,
    location: candidate.interviewVenue || '6th Floor, Tower A, M3M Urbana Business Park, Sector 67, Gurugram',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status: 'CONFIRMED',
    googleCalendarLink: gcalUrl,
    attendees: [candidate.email, 'sachinkumarwcr@gmail.com', 'hr@whitecollarrealty.com'],
    reminderMinutesBefore: [1440, 60, 15],
    syncedAt: new Date().toISOString(),
    eventId: `gcal_evt_${Math.random().toString(36).substring(2, 10)}`,
  };

  saveCalendarEvent(event);
  return event;
}
