import { JobDescription } from '../types';

export const WHITE_COLLAR_JOB_DESCRIPTIONS: Record<string, JobDescription> = {
  'sales_manager': {
    id: 'jd-sm',
    title: 'Sales Manager (Luxury Real Estate)',
    department: 'Luxury Residential & Commercial Advisory',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    minExperienceYears: 4,
    maxExperienceYears: 8,
    minRealEstateExpYears: 3,
    budgetBand: '14 - 22 LPA Fixed',
    oteBand: '25 - 35 LPA OTE with team closing incentives',
    marketFocus: 'Gurugram Luxury Corridors (Golf Course Ext, SPR, Dwarka Expressway) & Dubai Freehold',
    noticePeriodExpectation: 'Immediate to 30 days max',
    keyResponsibilities: [
      'Lead and mentor a high-performing squad of 8 to 15 Property Consultants',
      'Drive monthly gross booking targets of ₹15–30 Cr across premier developer inventories (DLF, M3M, Godrej, Emaar, Sobha)',
      'Conduct high-ticket negotiations and closing meetings with HNIs and NRI investors',
      'Manage pipeline health in CRM and ensure SLA adherence for site visit conversions',
      'Execute client roadshows for Dubai off-plan luxury projects'
    ],
    requiredSkills: [
      'Team Leadership & Squad Target Accountability',
      'High-Ticket Real Estate Negotiation & Closing',
      'In-depth Knowledge of Gurugram Circle Rates, RERA & Dubai Freehold Policies',
      'HNI & Corporate Network in Delhi NCR'
    ],
    roleSpecificQuestions: [
      'How large was the sales team you were managing in your last role?',
      'Were you personally accountable for the monthly squad target, and what was your team run-rate?',
      'Which Gurgaon developer projects (e.g. DLF, M3M, Godrej) or Dubai portfolios have you actively closed?',
      'What has been your average ticket size and closing conversion ratio?'
    ]
  },
  'property_consultant': {
    id: 'jd-pc',
    title: 'Property Consultant / Senior Property Consultant',
    department: 'Direct Sales & HNI Client Advisory',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    minExperienceYears: 2,
    maxExperienceYears: 5,
    minRealEstateExpYears: 1.5,
    budgetBand: '8 - 15 LPA Fixed',
    oteBand: '18 - 25 LPA OTE with direct transaction commissions',
    marketFocus: 'Gurugram Primary Luxury & High-Growth Corridors',
    noticePeriodExpectation: 'Immediate to 30 days',
    keyResponsibilities: [
      'Manage end-to-end buyer journey from qualified lead engagement to site visit and booking',
      'Present luxury residential layouts (₹2 Cr – ₹15 Cr+) and commercial retail assets to clients',
      'Coordinate site visits at M3M, DLF, SmartWorld, and Elan sites',
      'Negotiate terms and facilitate booking documentation per developer guidelines'
    ],
    requiredSkills: [
      'Consultative Property Selling & Lead Conversion',
      'Gurugram Micro-Market & Infrastructure Understanding',
      'Relationship Building with HNI Buyers',
      'Fluent Spoken English & Corporate Communication'
    ],
    roleSpecificQuestions: [
      'How many years have you been handling direct real estate property sales in Gurgaon?',
      'What category of properties (Luxury Residential, Plots, or Commercial) have you primarily closed?',
      'What has been your typical monthly lead-to-site-visit and booking conversion rate?',
      'Have you closed any deals in Golf Course Extension Road or SPR in the last 6 months?'
    ]
  },
  'business_development': {
    id: 'jd-bdm',
    title: 'Business Development Manager / Corporate Sales',
    department: 'Institutional & Channel Partner Sales',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    minExperienceYears: 3,
    maxExperienceYears: 6,
    minRealEstateExpYears: 2,
    budgetBand: '10 - 18 LPA Fixed',
    oteBand: '20 - 30 LPA OTE with CP overrides',
    marketFocus: 'Delhi NCR Corporate Alliances & Channel Partner Network',
    noticePeriodExpectation: 'Immediate to 30 days',
    keyResponsibilities: [
      'Onboard and activate tier-1 Channel Partners and independent wealth brokers across NCR',
      'Structure joint customer engagement sessions and project launch briefings',
      'Drive corporate tie-ups with MNCs across Cyber City, Golf Course Road, and Udyog Vihar'
    ],
    requiredSkills: [
      'Channel Partner Network Development',
      'B2B Corporate Real Estate Presentation',
      'Revenue Forecasting and Pipeline Review'
    ],
    roleSpecificQuestions: [
      'How many active Channel Partners did you manage in your network in Gurgaon?',
      'Have you handled corporate desk activations or NRI roadshows?',
      'What was your average monthly revenue generated through broker networks?'
    ]
  },
  'hr_recruiter': {
    id: 'jd-hr',
    title: 'HR Recruiter / Talent Acquisition Specialist',
    department: 'Human Resources & Talent Acquisition',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    minExperienceYears: 2,
    maxExperienceYears: 5,
    minRealEstateExpYears: 1,
    budgetBand: '6 - 10 LPA Fixed',
    oteBand: '8 - 14 LPA with recruitment hiring incentives',
    marketFocus: 'Real Estate Talent Sourcing across Gurugram & Delhi NCR',
    noticePeriodExpectation: 'Immediate to 30 days',
    keyResponsibilities: [
      'Source, screen, and headhunt top-performing real estate sales professionals across Delhi NCR',
      'Manage end-to-end recruitment lifecycle from initial telephonic screening to offer rollout',
      'Coordinate interview schedules with Sales Directors and Department Heads',
      'Maintain candidate pipeline, ATS tracking, and recruitment SLA metrics'
    ],
    requiredSkills: [
      'Real Estate Talent Sourcing & Headhunting',
      'Candidate Telephonic & Voice Screening',
      'Offer Negotiation & Onboarding SLAs',
      'Portal Sourcing (Naukri, LinkedIn, Referrals)'
    ],
    roleSpecificQuestions: [
      'How many years of candidate sourcing and recruitment experience do you have in real estate?',
      'What is your monthly closure run-rate for sales consultant and managerial profiles?',
      'Which sourcing channels have yielded your highest quality hires?'
    ]
  }
};

export function getWhiteCollarJobDescription(roleName?: string): JobDescription {
  const r = (roleName || '').toLowerCase();
  if (r.includes('hr') || r.includes('recruit') || r.includes('talent') || r.includes('acquisition') || r.includes('people')) {
    return WHITE_COLLAR_JOB_DESCRIPTIONS['hr_recruiter'];
  }
  if (r.includes('lead') || r.includes('manager') || r.includes('head') || r.includes('vp') || r.includes('director')) {
    return WHITE_COLLAR_JOB_DESCRIPTIONS['sales_manager'];
  }
  if (r.includes('business') || r.includes('bd') || r.includes('channel') || r.includes('corporate') || r.includes('alliance')) {
    return WHITE_COLLAR_JOB_DESCRIPTIONS['business_development'];
  }
  return WHITE_COLLAR_JOB_DESCRIPTIONS['property_consultant'];
}
