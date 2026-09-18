export interface MarketNewsItem {
  id: string;
  title: string;
  region: 'Gurgaon / NCR' | 'Dubai / UAE' | 'Regulatory & HRERA' | 'Salary & Market Trends';
  category: 'Infrastructure' | 'Luxury Launch' | 'Policy & Visa' | 'Hiring Trends' | 'Micro-market';
  summary: string;
  impactOnHiring: string;
  suggestedScreeningQuestions: string[];
  source: string;
  publishedAt: string;
  isHot: boolean;
  tags: string[];
}

export const REAL_ESTATE_MARKET_NEWS: MarketNewsItem[] = [
  {
    id: 'news-1',
    title: 'Golf Course Extension & SPR Emerge as Ultra-Luxury Epicenters (₹18,000–₹32,000/sq.ft)',
    region: 'Gurgaon / NCR',
    category: 'Luxury Launch',
    summary: 'Sectors 65, 66, and 67 around M3M Urbana and Golf Course Extension Road recorded a 34% year-on-year capital appreciation, driven by premium 4BHK+ luxury residences and high-ticket HNIs.',
    impactOnHiring: 'High demand for consultants with existing networks in DLF Camellias, Magnolias, Trump Tower, and M3M Golfestate. Candidates must demonstrate luxury client handling rather than low-ticket retail volume.',
    suggestedScreeningQuestions: [
      'What is your average ticket size closed along the Golf Course Extension / SPR corridor?',
      'How do you source ultra-HNI buyers for properties priced above ₹7–15 Crores?',
      'Which luxury developers have you directly empanelled with in Gurgaon Sector 65–70?'
    ],
    source: 'NCR Real Estate Intelligence Hub',
    publishedAt: '2 hours ago',
    isHot: true,
    tags: ['Golf Course Ext', 'SPR', 'Ultra-Luxury', 'HNI Sales', 'M3M Urbana'],
  },
  {
    id: 'news-2',
    title: 'Dubai Golden Visa Real Estate Threshold Simplified: 2M AED Freehold Investment',
    region: 'Dubai / UAE',
    category: 'Policy & Visa',
    summary: 'The UAE government has streamlined the 10-Year Golden Visa for Indian and international investors purchasing off-plan or secondary real estate properties valued at AED 2,000,000 (~₹4.5 Cr) or more.',
    impactOnHiring: 'Crucial talking point for White Collar Realty Dubai Advisory Desk. Candidates for Dubai Advisory must understand off-plan payment plans, DLD (Dubai Land Department) 4% transfer fees, and escrow mechanics.',
    suggestedScreeningQuestions: [
      'How do you explain the 2M AED Golden Visa qualification criteria to Indian NRI investors?',
      'What are the key differences between Dubai off-plan developer payment plans and Gurgaon construction-linked plans (CLP)?',
      'Which Dubai developer master-plans (Emaar, DAMAC, Sobha, Binghatti) have you marketed to Indian buyers?'
    ],
    source: 'Dubai Land Department & Gulf Property Monitor',
    publishedAt: '4 hours ago',
    isHot: true,
    tags: ['Dubai Freehold', 'Golden Visa', 'Emaar', 'DAMAC', 'NRI Investors'],
  },
  {
    id: 'news-3',
    title: 'Dwarka Expressway & Global City Infrastructure Trigger Massive Commercial & High-End Inflow',
    region: 'Gurgaon / NCR',
    category: 'Infrastructure',
    summary: 'With full operational connectivity to IGI Airport Terminal 3 and the 1000-acre Haryana Global City project in Sectors 36B/37B, institutional developers are aggressively launching signature luxury towers.',
    impactOnHiring: 'Assess if candidates have ground-level knowledge of toll access, cloverleaf interchanges, and upcoming Grade-A commercial office supply along the Expressway.',
    suggestedScreeningQuestions: [
      'Have you closed primary builder sales along Dwarka Expressway Sectors 102–113?',
      'How do you pitch connectivity advantages to Gurgaon corporate buyers considering Delhi vs Gurgaon?'
    ],
    source: 'Haryana Urban Development Bulletin',
    publishedAt: 'Yesterday',
    isHot: false,
    tags: ['Dwarka Expressway', 'Global City', 'Airport Corridor', 'Sectors 102-113'],
  },
  {
    id: 'news-4',
    title: 'HRERA Gurugram Tightens Agent Licencing & Transparent Broker Commission Norms',
    region: 'Regulatory & HRERA',
    category: 'Policy & Visa',
    summary: 'Haryana Real Estate Regulatory Authority mandates all property advisors to quote individual or agency HRERA registration numbers on all investor collaterals and client agreements.',
    impactOnHiring: 'Candidates holding active HRERA agent certificates or understanding compliance protocols represent zero regulatory risk and faster onboarding.',
    suggestedScreeningQuestions: [
      'Do you hold an individual HRERA certificate or have you worked under an agency RERA number?',
      'How do you ensure RERA compliance when drafting buyer expression of interest (EOI) forms?'
    ],
    source: 'HRERA Gurugram Official Registry',
    publishedAt: '1 day ago',
    isHot: false,
    tags: ['HRERA', 'Compliance', 'Broker Licencing', 'RERA Gurgaon'],
  },
  {
    id: 'news-5',
    title: 'Top Real Estate Talent Compensation Index: Base CTC ₹8–18 LPA + 1.5% Direct Brokerage Splits',
    region: 'Salary & Market Trends',
    category: 'Hiring Trends',
    summary: 'Leading Gurgaon IPCs and luxury advisory firms report a 25% surge in fixed compensation packages for proven closers who bring repeat HNI investor portfolios and high conversion velocity.',
    impactOnHiring: 'Use to evaluate candidate salary expectations against our White Collar Realty pay bands (e.g., ₹10–16 LPA base + uncapped incentives for Senior Consultants).',
    suggestedScreeningQuestions: [
      'What was your individual gross sales value (GSV) closed over the last 12 months?',
      'What proportion of your current annual income was base salary vs performance-linked variable incentive?'
    ],
    source: 'NCR Real Estate Talent & Salary Benchmark Report 2026',
    publishedAt: '2 days ago',
    isHot: true,
    tags: ['Compensation', 'Brokerage OTE', 'Luxury Closers', 'Sales Inflow'],
  },
  {
    id: 'news-6',
    title: 'Dubai Waterfront & Island Projects (Palm Jebel Ali, Dubai Islands) See Record NRI Inflows',
    region: 'Dubai / UAE',
    category: 'Luxury Launch',
    summary: 'Over 42% of recent off-plan bookings in prime Dubai waterfront master communities were driven by high-net-worth investors from Delhi-NCR, Mumbai, and Bengaluru.',
    impactOnHiring: 'Test candidates on cross-border transactions, tax implications (LRS limits under RBI), and remote digital booking workflows.',
    suggestedScreeningQuestions: [
      'How do you guide Indian HNIs through RBI Liberalised Remittance Scheme (LRS) $250k annual limits for Dubai property purchases?',
      'What is your experience in conducting digital presentations and virtual walkthroughs for off-plan international properties?'
    ],
    source: 'International Property Advisor Weekly',
    publishedAt: '3 days ago',
    isHot: false,
    tags: ['Palm Jebel Ali', 'LRS Tax Guide', 'NRI Luxury', 'Cross-Border'],
  }
];
