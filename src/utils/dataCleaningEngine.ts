import { 
  Candidate, DataCleaningReport, CandidateStatus, 
  InterviewStatus, DuplicateCandidateGroup, DataHygieneMetrics 
} from '../types';
import { calculateCandidatePriority, generateCandidateHRAnalysisSummary } from './candidateAnalysisEngine';

/**
 * Normalizes an Indian or international phone number to standard "+91 XXXXX XXXXX" format
 */
export function normalizePhoneNumber(rawPhone: string): { cleanPhone: string; isValid: boolean; normalizedKey: string } {
  if (!rawPhone) return { cleanPhone: '', isValid: false, normalizedKey: '' };

  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, '');

  // If starts with 91 and has 12 digits, strip 91
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  if (digits.length === 10) {
    const p1 = digits.substring(0, 5);
    const p2 = digits.substring(5);
    return {
      cleanPhone: `+91 ${p1} ${p2}`,
      isValid: true,
      normalizedKey: digits,
    };
  }

  // If already formatted or international
  if (digits.length >= 7) {
    return {
      cleanPhone: rawPhone.trim(),
      isValid: true,
      normalizedKey: digits.slice(-10),
    };
  }

  return {
    cleanPhone: rawPhone.trim(),
    isValid: false,
    normalizedKey: digits,
  };
}

/**
 * Cleans and Title-cases a name string, removing honorifics, numbers, or special artifacts
 */
export function cleanName(rawName: string): string {
  if (!rawName) return 'Unknown Candidate';
  let cleaned = rawName
    .replace(/^(mr\.|mrs\.|ms\.|dr\.|adv\.|shri|smt)\s*/gi, '')
    .replace(/[0-9!@#$%^&*()_=+\[\]{};:"\\|,.<>\/?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return 'Candidate';

  // Convert to Proper Title Case
  cleaned = cleaned
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return cleaned || 'Candidate';
}

/**
 * Standardizes applied role names against White Collar Realty designations
 */
export function standardizeAppliedRole(rawRole: string): string {
  const r = (rawRole || '').toLowerCase().trim();

  if (r.includes('lead') || r.includes('sm') || r.includes('manager') || r.includes('head') || r.includes('sales lead')) {
    return 'Sales Manager / Team Lead (Luxury Real Estate)';
  }
  if (r.includes('dubai') || r.includes('dxb') || r.includes('international') || r.includes('invest')) {
    return 'Investment Advisor - Dubai & International Real Estate';
  }
  if (r.includes('bd') || r.includes('business dev') || r.includes('alliance') || r.includes('channel') || r.includes('broker')) {
    return 'Business Development Manager (Channel Partner Alliances)';
  }
  if (r.includes('tele') || r.includes('pre') || r.includes('inside') || r.includes('calling') || r.includes('lead gen')) {
    return 'Presales & Tele-Calling Specialist';
  }
  if (r.includes('hr') || r.includes('recruit') || r.includes('talent') || r.includes('acquisition') || r.includes('ta')) {
    return 'HR Recruiter / Talent Acquisition Specialist';
  }
  return 'Senior Property Consultant';
}

/**
 * Scans candidate roster and identifies duplicate groups by phone numbers or emails
 */
export function findDuplicateGroups(candidates: Candidate[]): DuplicateCandidateGroup[] {
  const phoneBuckets = new Map<string, Candidate[]>();
  const emailBuckets = new Map<string, Candidate[]>();

  candidates.forEach((cand) => {
    const { normalizedKey } = normalizePhoneNumber(cand.phone);
    if (normalizedKey && normalizedKey.length >= 8) {
      const existing = phoneBuckets.get(normalizedKey) || [];
      existing.push(cand);
      phoneBuckets.set(normalizedKey, existing);
    }

    const cleanEmail = (cand.email || '').trim().toLowerCase();
    if (cleanEmail && !cleanEmail.includes('wcr-applicant.in') && !cleanEmail.includes('placeholder')) {
      const existing = emailBuckets.get(cleanEmail) || [];
      existing.push(cand);
      emailBuckets.set(cleanEmail, existing);
    }
  });

  const duplicateGroups: DuplicateCandidateGroup[] = [];
  const processedCandIds = new Set<string>();

  // Helper to pick the most informative candidate as primary
  const pickPrimaryCandidate = (list: Candidate[]): Candidate => {
    return [...list].sort((a, b) => {
      // Prioritize interview scheduled
      if (a.interviewDate && !b.interviewDate) return -1;
      if (!a.interviewDate && b.interviewDate) return 1;

      // Prioritize call history length
      const aCalls = a.callHistory?.length || 0;
      const bCalls = b.callHistory?.length || 0;
      if (aCalls !== bCalls) return bCalls - aCalls;

      // Prioritize notes length
      const aNotesLen = (a.notes || '').length;
      const bNotesLen = (b.notes || '').length;
      return bNotesLen - aNotesLen;
    })[0];
  };

  // Group by phone collisions
  phoneBuckets.forEach((bucket, phoneKey) => {
    if (bucket.length > 1) {
      const primary = pickPrimaryCandidate(bucket);
      const duplicates = bucket.filter((c) => c.id !== primary.id);
      
      bucket.forEach((c) => processedCandIds.add(c.id));

      duplicateGroups.push({
        id: `DUP-PHONE-${phoneKey}`,
        reason: 'PHONE_MATCH',
        primaryCandidate: primary,
        duplicateCandidates: duplicates,
        confidence: 'EXACT',
        matchedKey: primary.phone,
      });
    }
  });

  // Group by email collisions (if not already grouped)
  emailBuckets.forEach((bucket, emailKey) => {
    if (bucket.length > 1) {
      const unassigned = bucket.filter((c) => !processedCandIds.has(c.id));
      if (unassigned.length > 1) {
        const primary = pickPrimaryCandidate(unassigned);
        const duplicates = unassigned.filter((c) => c.id !== primary.id);

        unassigned.forEach((c) => processedCandIds.add(c.id));

        duplicateGroups.push({
          id: `DUP-EMAIL-${emailKey.replace(/[^a-zA-Z0-9]/g, '')}`,
          reason: 'EMAIL_MATCH',
          primaryCandidate: primary,
          duplicateCandidates: duplicates,
          confidence: 'HIGH',
          matchedKey: emailKey,
        });
      }
    }
  });

  return duplicateGroups;
}

/**
 * Merges a primary candidate with a list of duplicates, preserving all call logs,
 * scheduled interviews, notes history, and enriched screening data.
 */
export function mergeCandidateGroup(primary: Candidate, duplicates: Candidate[]): Candidate {
  const merged: Candidate = { ...primary };

  // Standardize primary name
  merged.name = cleanName(merged.name);

  // Normalize phone
  const { cleanPhone } = normalizePhoneNumber(merged.phone);
  merged.phone = cleanPhone || merged.phone;

  // Combine notes
  const notesSet = new Set<string>();
  if (merged.notes) notesSet.add(merged.notes);

  // Combine call history
  const allCalls = [...(merged.callHistory || [])];
  const callIds = new Set(allCalls.map((c) => c.id));

  // Combine notes history
  const allNotesHistory = [...(merged.notesHistory || [])];
  const noteIds = new Set(allNotesHistory.map((n) => n.id));

  duplicates.forEach((dup) => {
    if (dup.notes && !notesSet.has(dup.notes)) {
      notesSet.add(dup.notes);
    }

    // Merge screening attributes if missing on primary
    if (!merged.screening.currentCompany && dup.screening?.currentCompany) {
      merged.screening.currentCompany = dup.screening.currentCompany;
    }
    if (!merged.screening.currentSalaryLPA && dup.screening?.currentSalaryLPA) {
      merged.screening.currentSalaryLPA = dup.screening.currentSalaryLPA;
    }
    if (!merged.screening.expectedSalaryLPA && dup.screening?.expectedSalaryLPA) {
      merged.screening.expectedSalaryLPA = dup.screening.expectedSalaryLPA;
    }
    if (!merged.interviewDate && dup.interviewDate) {
      merged.interviewDate = dup.interviewDate;
      merged.interviewTime = dup.interviewTime;
      merged.interviewVenue = dup.interviewVenue;
      merged.interviewStatus = dup.interviewStatus;
      merged.interviewSlotId = dup.interviewSlotId;
    }

    // Merge call history
    if (dup.callHistory) {
      dup.callHistory.forEach((c) => {
        if (!callIds.has(c.id)) {
          allCalls.push(c);
          callIds.add(c.id);
        }
      });
    }

    // Merge notes history
    if (dup.notesHistory) {
      dup.notesHistory.forEach((n) => {
        if (!noteIds.has(n.id)) {
          allNotesHistory.push(n);
          noteIds.add(n.id);
        }
      });
    }

    // Add total calls count
    merged.callCount = (merged.callCount || 0) + (dup.callCount || 0);
  });

  merged.notes = Array.from(notesSet).join('\n---\n');
  merged.callHistory = allCalls;
  merged.notesHistory = allNotesHistory;

  // Recalculate priority
  calculateCandidatePriority(merged);

  return merged;
}

/**
 * Automatically identifies and merges all duplicate profiles across the candidates list
 */
export function autoMergeAllDuplicates(candidates: Candidate[]): {
  mergedList: Candidate[];
  mergedCount: number;
  details: string[];
} {
  const groups = findDuplicateGroups(candidates);
  if (groups.length === 0) {
    return { mergedList: candidates, mergedCount: 0, details: ['No duplicate candidate profiles found.'] };
  }

  const duplicatesToDelete = new Set<string>();
  const mergedCandidateMap = new Map<string, Candidate>();
  const details: string[] = [];

  groups.forEach((grp) => {
    const merged = mergeCandidateGroup(grp.primaryCandidate, grp.duplicateCandidates);
    mergedCandidateMap.set(merged.id, merged);

    grp.duplicateCandidates.forEach((dup) => {
      duplicatesToDelete.add(dup.id);
    });

    details.push(
      `Merged ${grp.duplicateCandidates.length} profile(s) for "${merged.name}" (${grp.matchedKey}) into primary ID ${merged.id}`
    );
  });

  const mergedList = candidates
    .filter((c) => !duplicatesToDelete.has(c.id))
    .map((c) => (mergedCandidateMap.has(c.id) ? mergedCandidateMap.get(c.id)! : c));

  return {
    mergedList,
    mergedCount: duplicatesToDelete.size,
    details,
  };
}

/**
 * Standardizes names across all candidate profiles (removes prefixes, title cases)
 */
export function standardizeAllCandidateNames(candidates: Candidate[]): {
  updatedList: Candidate[];
  changedCount: number;
} {
  let changedCount = 0;
  const updatedList = candidates.map((cand) => {
    const cleaned = cleanName(cand.name);
    if (cleaned !== cand.name) {
      changedCount++;
      return { ...cand, name: cleaned };
    }
    return cand;
  });

  return { updatedList, changedCount };
}

/**
 * Calculates overall candidate data hygiene metrics
 */
export function calculateDataHygieneMetrics(candidates: Candidate[]): DataHygieneMetrics {
  const total = candidates.length;
  if (total === 0) {
    return {
      hygieneScore: 100,
      totalCandidates: 0,
      validPhonesCount: 0,
      standardizedNamesCount: 0,
      duplicateProfilesCount: 0,
      completeScreeningsCount: 0,
      scheduledInterviewsCount: 0,
    };
  }

  let validPhones = 0;
  let standardizedNames = 0;
  let completeScreenings = 0;
  let scheduledInterviews = 0;

  candidates.forEach((c) => {
    const { isValid } = normalizePhoneNumber(c.phone);
    if (isValid) validPhones++;

    const cName = cleanName(c.name);
    if (cName === c.name) standardizedNames++;

    if (c.screening?.currentCompany && c.screening?.expectedSalaryLPA && c.screening?.totalExperienceYears) {
      completeScreenings++;
    }

    if (c.interviewDate || c.status === 'Interview Scheduled') {
      scheduledInterviews++;
    }
  });

  const duplicateGroups = findDuplicateGroups(candidates);
  const dupCount = duplicateGroups.reduce((acc, g) => acc + g.duplicateCandidates.length, 0);

  // Compute composite hygiene score
  const phoneScore = (validPhones / total) * 30;
  const nameScore = (standardizedNames / total) * 20;
  const screeningScore = (completeScreenings / total) * 25;
  const duplicatePenalty = Math.max(0, 25 - dupCount * 5);

  const hygieneScore = Math.min(100, Math.round(phoneScore + nameScore + screeningScore + duplicatePenalty));

  return {
    hygieneScore,
    totalCandidates: total,
    validPhonesCount: validPhones,
    standardizedNamesCount: standardizedNames,
    duplicateProfilesCount: dupCount,
    completeScreeningsCount: completeScreenings,
    scheduledInterviewsCount: scheduledInterviews,
  };
}

/**
 * Cleans, validates, deduplicates, and enriches a list of candidate records
 */
export function cleanAndEnrichCandidates(rawCandidates: Partial<Candidate>[]): {
  cleanedList: Candidate[];
  report: DataCleaningReport;
} {
  const report: DataCleaningReport = {
    totalProcessed: rawCandidates.length,
    validCandidatesImported: 0,
    phonesNormalized: 0,
    namesCleaned: 0,
    duplicatesMerged: 0,
    rolesStandardized: 0,
    prioritiesComputed: 0,
    errors: [],
  };

  const phoneMap = new Map<string, Candidate>();
  const emailMap = new Map<string, Candidate>();
  const results: Candidate[] = [];

  rawCandidates.forEach((raw, idx) => {
    try {
      const origName = raw.name || '';
      const cleanedN = cleanName(origName);
      if (cleanedN !== origName) report.namesCleaned++;

      const origPhone = raw.phone || '';
      const { cleanPhone, isValid: isPhoneValid, normalizedKey } = normalizePhoneNumber(origPhone);
      if (cleanPhone !== origPhone) report.phonesNormalized++;

      const origRole = raw.appliedRole || '';
      const stdRole = standardizeAppliedRole(origRole);
      if (stdRole !== origRole) report.rolesStandardized++;

      const cleanEmail = (raw.email || `candidate.${Date.now()}.${idx}@wcr-applicant.in`).trim().toLowerCase();
      const lookupPhoneKey = normalizedKey;

      // Check if duplicate exists
      if (lookupPhoneKey && phoneMap.has(lookupPhoneKey)) {
        report.duplicatesMerged++;
        const existing = phoneMap.get(lookupPhoneKey)!;
        // Merge screening fields if missing
        if (!existing.screening?.currentCompany && raw.screening?.currentCompany) {
          existing.screening.currentCompany = raw.screening.currentCompany;
        }
        if (!existing.notes && raw.notes) {
          existing.notes = raw.notes;
        }
        return;
      }

      if (cleanEmail && emailMap.has(cleanEmail) && !cleanEmail.includes('wcr-applicant.in')) {
        report.duplicatesMerged++;
        return;
      }

      const totalExp = Number(raw.screening?.totalExperienceYears) || 3;
      const reExp = Number(raw.screening?.realEstateExperienceYears) || Math.min(totalExp, 2);

      const candidateId = raw.id || `CAND-WCR-${Date.now()}-${idx + 1}`;
      const status: CandidateStatus = raw.status || (raw.interviewDate ? 'Interview Scheduled' : 'Screening Pending');
      const interviewStatus: InterviewStatus = raw.interviewStatus || (raw.interviewDate ? 'Scheduled' : 'Not Scheduled');

      const candidate: Candidate = {
        id: candidateId,
        name: cleanedN,
        phone: cleanPhone || '+91 98000 00000',
        email: cleanEmail,
        appliedRole: stdRole,
        status,
        interviewStatus,
        interviewSlotId: raw.interviewSlotId,
        interviewDate: raw.interviewDate,
        interviewTime: raw.interviewTime,
        interviewVenue: raw.interviewVenue || '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
        lastCallDate: raw.lastCallDate || 'Never called',
        callCount: Number(raw.callCount) || 0,
        unansweredAttempts: Number(raw.unansweredAttempts) || 0,
        notes: raw.notes || `Candidate imported for ${stdRole}.`,
        screening: {
          currentCompany: raw.screening?.currentCompany || 'Real Estate Sector',
          currentDesignation: raw.screening?.currentDesignation || stdRole,
          totalExperienceYears: totalExp,
          realEstateExperienceYears: reExp,
          gurgaonDubaiExperience: {
            gurgaon: raw.screening?.gurgaonDubaiExperience?.gurgaon ?? true,
            dubai: raw.screening?.gurgaonDubaiExperience?.dubai ?? (stdRole.includes('Dubai') ? true : false),
            details: raw.screening?.gurgaonDubaiExperience?.details || 'Active Delhi NCR corridor sales',
          },
          currentSalaryLPA: raw.screening?.currentSalaryLPA || '7.5 LPA',
          expectedSalaryLPA: raw.screening?.expectedSalaryLPA || '12.0 LPA',
          currentLocation: raw.screening?.currentLocation || 'Gurugram, Haryana',
          noticePeriodDays: raw.screening?.noticePeriodDays || 15,
          earliestJoiningDate: raw.screening?.earliestJoiningDate || 'Immediate',
        },
        callHistory: raw.callHistory || [],
        notesHistory: raw.notesHistory || [],
        alertDueDate: raw.alertDueDate || (status === 'Interview Scheduled' ? 'Tomorrow' : 'Upcoming'),
        alertReason: raw.alertReason || 'Screening & Qualification',
      };

      // Compute priority score
      calculateCandidatePriority(candidate);
      report.prioritiesComputed++;

      if (lookupPhoneKey) phoneMap.set(lookupPhoneKey, candidate);
      if (cleanEmail) emailMap.set(cleanEmail, candidate);

      results.push(candidate);
      report.validCandidatesImported++;
    } catch (err: any) {
      report.errors.push(`Row ${idx + 1}: ${err.message || 'Formatting error'}`);
    }
  });

  return { cleanedList: results, report };
}

/**
 * Converts candidate roster into an RFC 4180 compliant CSV string for Google Sheets / Excel
 */
export function exportCandidatesToCSV(candidates: Candidate[]): string {
  const headers = [
    'Candidate ID',
    'Candidate Name',
    'Phone Number',
    'Email Address',
    'Applied Role',
    'Status',
    'Priority Level',
    'Priority Score',
    'Total Experience (Yrs)',
    'Real Estate Exp (Yrs)',
    'Gurgaon Experience',
    'Dubai Experience',
    'Current Company',
    'Current CTC (LPA)',
    'Expected CTC (LPA)',
    'Notice Period (Days)',
    'Interview Status',
    'Interview Date',
    'Interview Time',
    'Interview Venue',
    'Calls Made',
    'Unanswered Attempts',
    'Last Call Date',
    'HR Screening Notes',
    'HR Strengths Summary',
    'HR Red Flags Summary',
  ];

  const escapeCSV = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = candidates.map((cand) => {
    const priority = calculateCandidatePriority(cand);
    const summary = generateCandidateHRAnalysisSummary(cand);

    return [
      escapeCSV(cand.id),
      escapeCSV(cand.name),
      escapeCSV(cand.phone),
      escapeCSV(cand.email),
      escapeCSV(cand.appliedRole),
      escapeCSV(cand.status),
      escapeCSV(priority.level),
      escapeCSV(priority.score),
      escapeCSV(cand.screening?.totalExperienceYears || 0),
      escapeCSV(cand.screening?.realEstateExperienceYears || 0),
      escapeCSV(cand.screening?.gurgaonDubaiExperience?.gurgaon ? 'YES' : 'NO'),
      escapeCSV(cand.screening?.gurgaonDubaiExperience?.dubai ? 'YES' : 'NO'),
      escapeCSV(cand.screening?.currentCompany || 'N/A'),
      escapeCSV(cand.screening?.currentSalaryLPA || 'N/A'),
      escapeCSV(cand.screening?.expectedSalaryLPA || 'N/A'),
      escapeCSV(cand.screening?.noticePeriodDays || 'N/A'),
      escapeCSV(cand.interviewStatus || 'Not Scheduled'),
      escapeCSV(cand.interviewDate || 'N/A'),
      escapeCSV(cand.interviewTime || 'N/A'),
      escapeCSV(cand.interviewVenue || 'M3M Urbana HQ Gurugram'),
      escapeCSV(cand.callCount || 0),
      escapeCSV(cand.unansweredAttempts || 0),
      escapeCSV(cand.lastCallDate || 'N/A'),
      escapeCSV(cand.notes || ''),
      escapeCSV(summary.strengths.join('; ')),
      escapeCSV(summary.redFlags.join('; ')),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Parses raw CSV text into Candidate objects with auto-header mapping
 */
export function parseCSVToCandidates(csvText: string): Partial<Candidate>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse CSV row respecting quotes
  const parseRow = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headerRow = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const findIdx = (...keywords: string[]): number => {
    for (const kw of keywords) {
      const idx = headerRow.findIndex((h) => h.includes(kw));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameIdx = findIdx('name', 'candidate');
  const phoneIdx = findIdx('phone', 'mobile', 'contact', 'number');
  const emailIdx = findIdx('email', 'mail');
  const roleIdx = findIdx('role', 'designation', 'position', 'applied');
  const companyIdx = findIdx('company', 'employer', 'org');
  const expIdx = findIdx('totalexp', 'exp', 'experience');
  const reExpIdx = findIdx('realestate', 'reexp', 'realty');
  const ctcIdx = findIdx('currentctc', 'salary', 'currctc', 'ctc');
  const expCtcIdx = findIdx('expectedctc', 'expctc', 'expectation');
  const noticeIdx = findIdx('notice', 'joining');
  const statusIdx = findIdx('status', 'stage');
  const notesIdx = findIdx('note', 'remark', 'summary', 'comment');
  const dateIdx = findIdx('interviewdate', 'date', 'scheduledate');
  const timeIdx = findIdx('interviewtime', 'time', 'scheduletime');

  const parsedCandidates: Partial<Candidate>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseRow(lines[i]);
    if (cols.length === 0 || cols.every((c) => !c)) continue;

    const name = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx] : `Candidate ${i}`;
    const phone = phoneIdx >= 0 && cols[phoneIdx] ? cols[phoneIdx] : `+91 98000 ${String(i).padStart(5, '0')}`;
    const email = emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx] : `applicant.${i}@wcr-portal.in`;
    const role = roleIdx >= 0 && cols[roleIdx] ? cols[roleIdx] : 'Senior Property Consultant';
    const company = companyIdx >= 0 && cols[companyIdx] ? cols[companyIdx] : 'Real Estate Consultant';
    const totalExp = expIdx >= 0 ? parseFloat(cols[expIdx]) || 3 : 3;
    const reExp = reExpIdx >= 0 ? parseFloat(cols[reExpIdx]) || 2 : 2;
    const ctc = ctcIdx >= 0 && cols[ctcIdx] ? cols[ctcIdx] : '8 LPA';
    const expCtc = expCtcIdx >= 0 && cols[expCtcIdx] ? cols[expCtcIdx] : '14 LPA';
    const notice = noticeIdx >= 0 ? parseInt(cols[noticeIdx]) || 15 : 15;
    const statusVal = statusIdx >= 0 && cols[statusIdx] ? cols[statusIdx] : 'Screening Pending';
    const notes = notesIdx >= 0 && cols[notesIdx] ? cols[notesIdx] : 'Imported via CSV Data Hub.';
    const interviewDate = dateIdx >= 0 && cols[dateIdx] && cols[dateIdx] !== 'N/A' ? cols[dateIdx] : undefined;
    const interviewTime = timeIdx >= 0 && cols[timeIdx] && cols[timeIdx] !== 'N/A' ? cols[timeIdx] : undefined;

    parsedCandidates.push({
      name,
      phone,
      email,
      appliedRole: role,
      status: statusVal as CandidateStatus,
      interviewDate,
      interviewTime,
      notes,
      screening: {
        currentCompany: company,
        currentDesignation: role,
        totalExperienceYears: totalExp,
        realEstateExperienceYears: reExp,
        currentSalaryLPA: ctc,
        expectedSalaryLPA: expCtc,
        noticePeriodDays: notice,
        gurgaonDubaiExperience: {
          gurgaon: true,
          dubai: role.toLowerCase().includes('dubai'),
        },
      },
    });
  }

  return parsedCandidates;
}
