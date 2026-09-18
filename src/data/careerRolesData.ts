import { CareerJobOpening } from '../types';

export const INITIAL_WHITE_COLLAR_CAREER_ROLES: CareerJobOpening[] = [
  // ==========================================
  // SECTION 1: FULL-TIME TECH & ENGINEERING JOBS
  // ==========================================
  {
    id: 'wcr-role-tech-1',
    title: 'Senior Full Stack Software Engineer (React / Node / TypeScript)',
    code: 'WCR-TECH-FS-2026',
    department: 'Engineering & PropTech Innovation',
    roleType: 'Job',
    category: 'Tech',
    isTechRole: true,
    isInternship: false,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 4,
    minExpYears: 2,
    maxExpYears: 6,
    budgetBand: '₹14,00,000 - ₹24,00,000 PA Fixed',
    oteBand: '₹18,00,000 - ₹28,00,000 OTE with performance equity',
    status: 'Urgent',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Senior',
    educationRequirement: 'B.Tech / B.E. / MCA in Computer Science, IT, or related engineering discipline',
    techStack: ['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Tailwind CSS', 'Docker', 'WebSockets'],
    keyResponsibilities: [
      'Architect and build real-time CRM telephony and candidate matching systems for White Collar Realty',
      'Develop scalable React web frontends with responsive interfaces and real-time state management',
      'Build robust Node.js / Express microservices backed by PostgreSQL databases',
      'Integrate Google Workspace APIs (Calendar, Sheets, Gmail OAuth) and AI Voice WebSockets',
    ],
    requiredSkills: [
      'TypeScript, React 18+, Node.js, and modern CSS/Tailwind',
      'Relational Database Modeling (PostgreSQL) and RESTful API architecture',
      'WebSockets, WebRTC, and real-time audio pipeline handling',
    ],
    mustHaveQualifications: [
      '2+ years of full-time professional experience building production web applications in React and Node.js',
      'Demonstrated GitHub portfolio or deployed web projects',
    ],
    screeningQuestions: [
      'Which degree and college did you complete your education from, and which year did you graduate?',
      'Can you tell me about the key full-stack web projects you have built recently and what problems they solved?',
      'What core programming languages and frameworks did you use (e.g. TypeScript, React, Node.js, Python, PostgreSQL)?',
      'Are you comfortable working full-time on-site from our M3M Urbana Sector 67 Gurugram HQ?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'wcr-role-tech-2',
    title: 'AI / ML Engineer (Conversational Voice Agents & LLMs)',
    code: 'WCR-TECH-AI-2026',
    department: 'AI Lab & Conversational Systems',
    roleType: 'Job',
    category: 'Tech',
    isTechRole: true,
    isInternship: false,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 3,
    minExpYears: 2,
    maxExpYears: 6,
    budgetBand: '₹16,00,000 - ₹28,00,000 PA Fixed',
    oteBand: '₹22,00,000 - ₹34,00,000 OTE + AI Innovation Grants',
    status: 'Urgent',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Senior',
    educationRequirement: 'B.Tech / M.Tech in CS, AI/ML, Data Science, or Mathematics',
    techStack: ['Python', 'FastAPI', 'Gemini Live Multimodal API', 'Vapi AI', 'OpenAI', 'PyTorch', 'WebSockets'],
    keyResponsibilities: [
      'Build ultra low-latency conversational voice bots for real-time outbound candidate screening and HNI qualification',
      'Optimize AI prompt chains, state guardrails, and real-time barge-in audio interruption algorithms',
      'Extract candidate sentiment, speech pace metrics, and structured CRM fields from live voice streams',
    ],
    requiredSkills: [
      'Python, LLM Prompt Engineering, RAG architectures, and Structured Function Calling',
      'Streaming Audio Processing (PCM 16kHz/24kHz, WebSockets, AudioContext)',
    ],
    mustHaveQualifications: [
      '2+ years experience in Python and practical deployment of LLM / AI conversational pipelines',
    ],
    screeningQuestions: [
      'Could you share your educational background—which degree, university, and year of graduation?',
      'What AI or machine learning projects have you developed, specifically around voice agents, LLMs, or NLP?',
      'What programming languages and backend libraries did you use (e.g. Python, FastAPI, PyTorch, LangChain)?',
      'What is your notice period and current vs expected CTC?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'wcr-role-tech-3',
    title: 'Backend Software Engineer (Python / FastAPI / PostgreSQL)',
    code: 'WCR-TECH-BE-2026',
    department: 'Core Infrastructure & Microservices',
    roleType: 'Job',
    category: 'Tech',
    isTechRole: true,
    isInternship: false,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 3,
    minExpYears: 2,
    maxExpYears: 5,
    budgetBand: '₹12,00,000 - ₹20,00,000 PA Fixed',
    oteBand: '₹16,00,000 - ₹24,00,000 OTE',
    status: 'Active',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Mid',
    educationRequirement: 'B.Tech / BCA / MCA in Computer Science or Software Engineering',
    techStack: ['Python', 'FastAPI', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'GCP'],
    keyResponsibilities: [
      'Design high-throughput backend APIs for lead routing, call tracking, and applicant workflows',
      'Maintain PostgreSQL database performance, migrations, and automated backup routines',
      'Build resilient event listeners and queue consumers for asynchronous background tasks',
    ],
    requiredSkills: [
      'Python / Node.js backend development, FastAPI / Express',
      'PostgreSQL query optimization, schema indexing, and Redis caching',
    ],
    mustHaveQualifications: [
      '2+ years in backend API engineering with SQL database architecture experience',
    ],
    screeningQuestions: [
      'What degree and college did you graduate from, and what was your graduation year?',
      'Can you walk me through a backend system or API project you engineered from scratch?',
      'Which programming languages and database technologies did you rely on for that project?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },

  // ==========================================
  // SECTION 2: TECH & PRODUCT INTERNSHIPS
  // ==========================================
  {
    id: 'wcr-role-intern-1',
    title: 'Software Engineering Intern (Full Stack Web Tech)',
    code: 'WCR-INT-SWE-2026',
    department: 'Engineering & PropTech Innovation',
    roleType: 'Internship',
    category: 'Tech',
    isTechRole: true,
    isInternship: true,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 6,
    minExpYears: 0,
    maxExpYears: 1,
    budgetBand: '₹25,000 - ₹40,000 / Month Stipend',
    oteBand: 'Performance Stipend Bonus + Fast-Track PPO (8 - 14 LPA)',
    status: 'Urgent',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Intern',
    educationRequirement: 'Pursuing or Completed B.Tech / BCA / MCA / B.Sc CS (Final Year / Recent Graduate)',
    techStack: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'HTML/CSS', 'Tailwind', 'Git'],
    keyResponsibilities: [
      'Build modern UI components, candidate management dashboards, and filters using React and Tailwind',
      'Collaborate with senior developers on REST API endpoints and data synchronization utilities',
      'Write clean, maintainable TypeScript code and participate in sprint code reviews',
    ],
    requiredSkills: [
      'Solid command of JavaScript/TypeScript, HTML, and CSS/Tailwind',
      'Basic knowledge of React hooks, component lifecycle, and state management',
      'Eagerness to learn production engineering best practices in a fast-paced environment',
    ],
    mustHaveQualifications: [
      'Computer Science or Engineering background with hands-on coding experience',
      'Available for a 3 to 6-month in-office internship in Sector 67 Gurugram',
    ],
    screeningQuestions: [
      'Which degree and college are you currently pursuing or recently graduated from, and in which year?',
      'Can you tell me about the major coding projects you have created in college or independently?',
      'What programming languages (like JavaScript, TypeScript, React, Python) did you use to build them?',
      'Are you available to join immediately for a 3 to 6-month full-time internship at M3M Urbana Gurugram?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'wcr-role-intern-2',
    title: 'AI/ML & Prompt Engineering Intern (Voice AI Agents)',
    code: 'WCR-INT-AI-2026',
    department: 'AI Lab & Conversational Systems',
    roleType: 'Internship',
    category: 'Tech',
    isTechRole: true,
    isInternship: true,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 4,
    minExpYears: 0,
    maxExpYears: 1,
    budgetBand: '₹30,000 - ₹45,000 / Month Stipend',
    oteBand: 'Performance Incentive + Fast-Track PPO (10 - 16 LPA)',
    status: 'Urgent',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Intern',
    educationRequirement: 'Pursuing / Completed B.Tech / M.Tech in CS/AI/Data Science / Mathematics',
    techStack: ['Python', 'OpenAI API', 'Gemini API', 'FastAPI', 'Pandas', 'Prompt Engineering'],
    keyResponsibilities: [
      'Develop and benchmark system prompts for live voice screening workflows and multi-language Hinglish translation',
      'Run transcript sentiment analysis scripts in Python to evaluate candidate communication markers',
      'Assist in testing WebRTC and WebSocket audio connections for automated recruiter calls',
    ],
    requiredSkills: [
      'Python programming, familiarity with GenAI/LLM APIs (OpenAI, Gemini)',
      'Understanding of prompt engineering techniques and structured JSON outputs',
    ],
    mustHaveQualifications: [
      'Strong analytical mindset and practical project exposure to Python and Generative AI',
    ],
    screeningQuestions: [
      'What is your educational background—which degree, college, and passing year?',
      'What AI or LLM projects have you worked on, and what was your role in developing them?',
      'What programming languages and AI frameworks did you utilize for those projects?',
      'Can you commit to a full-time in-office internship at our Sector 67 Gurugram HQ?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'wcr-role-intern-3',
    title: 'Data Analytics & Market Intelligence Intern',
    code: 'WCR-INT-DA-2026',
    department: 'Business Intelligence & Market Research',
    roleType: 'Internship',
    category: 'Tech',
    isTechRole: true,
    isInternship: true,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 3,
    minExpYears: 0,
    maxExpYears: 1,
    budgetBand: '₹22,000 - ₹35,000 / Month Stipend',
    oteBand: 'Research Incentive + PPO Conversion Opportunity',
    status: 'Active',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Intern',
    educationRequirement: 'Degree in Engineering, Statistics, Mathematics, Economics, or Data Analytics',
    techStack: ['Python', 'SQL', 'Google Sheets / Excel', 'Power BI', 'Pandas', 'NumPy'],
    keyResponsibilities: [
      'Gather and clean luxury real estate transaction data across Gurugram corridors and Dubai projects',
      'Build automated analytics dashboards tracking recruitment funnel velocity and call conversion metrics',
    ],
    requiredSkills: [
      'SQL, Python (Pandas/NumPy), Advanced Excel formulas, and data visualization',
    ],
    mustHaveQualifications: [
      'Passion for data manipulation, clean numbers, and business insights',
    ],
    screeningQuestions: [
      'Could you share your academic credentials—degree, college, and year of completion?',
      'Tell me about a data analysis project you worked on—what dataset did you examine and what programming tools did you use?',
      'How comfortable are you writing SQL queries and Python data scripts?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },

  // ==========================================
  // SECTION 3: REAL ESTATE & LUXURY SALES JOBS
  // ==========================================
  {
    id: 'wcr-role-re-1',
    title: 'Senior Property Consultant (Luxury Residential & Commercial)',
    code: 'WCR-SPC-2026',
    department: 'Luxury Residential & Commercial Sales',
    roleType: 'Job',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: false,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 12,
    minExpYears: 2,
    maxExpYears: 6,
    budgetBand: '₹8,00,000 - ₹15,00,000 PA Fixed',
    oteBand: '₹18,00,000 - ₹28,00,000 OTE + High Tier Incentives',
    status: 'Urgent',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Mid',
    educationRequirement: 'Graduate or Post Graduate in any discipline (BBA, B.Com, MBA, etc.)',
    keyResponsibilities: [
      'Manage high-ticket buyer inquiries for premier Gurugram luxury projects (DLF, M3M, Godrej, Sobha, Smartworld, Elan)',
      'Conduct personalized property presentations, project walk-throughs, and client site inspections',
      'Structure high-value deal negotiations and facilitate developer booking documentation',
      'Maintain CRM pipeline and follow-up SLAs with prospective HNI and NRI investors',
    ],
    requiredSkills: [
      'Gurugram Micro-Market & Infrastructure Knowledge (Golf Course Ext., SPR, Dwarka Expressway)',
      'High-Ticket Consultative Selling & Customer Relationship Building',
      'Fluent Spoken English & Professional Business Etiquette',
      'Strong Closing & Negotiation Capability',
    ],
    mustHaveQualifications: [
      'Minimum 1.5+ years of direct real estate property advisory experience in Delhi-NCR',
      'Proven track record in closing residential units > ₹2 Cr ticket size',
      'Graduate or Post Graduate in any discipline',
    ],
    screeningQuestions: [
      'Could you share your educational background—which degree, college, and year of graduation?',
      'How many years have you been closing residential real estate transactions in Gurugram?',
      'Which micro-markets and developer projects (e.g. DLF, M3M, Godrej) have you primarily focused on?',
      'What was your individual closed gross booking value in the last quarter, and what is your notice period?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'wcr-role-re-2',
    title: 'Sales Manager / Team Lead (Luxury Real Estate)',
    code: 'WCR-SM-2026',
    department: 'Direct Advisory & Sales Squad Leadership',
    roleType: 'Job',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: false,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 5,
    minExpYears: 4,
    maxExpYears: 9,
    budgetBand: '₹14,00,000 - ₹24,00,000 PA Fixed',
    oteBand: '₹28,00,000 - ₹45,00,000 OTE + Squad Override Commissions',
    status: 'Urgent',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Senior',
    educationRequirement: 'Graduate / MBA in Marketing or Sales',
    keyResponsibilities: [
      'Lead, coach, and drive performance for a squad of 8 to 15 Property Consultants',
      'Deliver monthly team gross sales targets of ₹20 Cr to ₹40 Cr in Tier-1 projects',
      'Step in for critical HNI closing discussions, price structures, and developer allotment coordination',
      'Conduct daily pipeline reviews, lead audit checks, and site visit scheduling oversight',
    ],
    requiredSkills: [
      'Team Leadership, Motivation & Squad Revenue Target Accountability',
      'HNI / NRI Client Handling & High-Stakes Negotiation',
      'Developer Relations (M3M, DLF, Godrej, Central Park, Signature Global)',
      'CRM Pipeline Velocity Management',
    ],
    mustHaveQualifications: [
      '3+ years in Real Estate Sales with at least 1.5 years managing a productive sales team in Delhi-NCR',
    ],
    screeningQuestions: [
      'What is your educational background and graduation year?',
      'How many consultants are currently in your team, and what is your monthly team closing run-rate?',
      'What is your personal closing conversion percentage when joining team site visits in Gurgaon?',
      'What is your notice period and current vs expected CTC package?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'wcr-role-re-3',
    title: 'Investment Advisor - Dubai & International Real Estate',
    code: 'WCR-DXB-2026',
    department: 'International & Cross-Border Wealth Advisory',
    roleType: 'Job',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: false,
    location: 'Gurugram HQ / Dubai Downtown Office',
    openingsCount: 6,
    minExpYears: 3,
    maxExpYears: 8,
    budgetBand: '₹12,00,000 - ₹22,00,000 PA Fixed + Tax-Free AED Incentives',
    oteBand: '₹30,00,000 - ₹60,00,000 OTE with Dubai Direct Commissions',
    status: 'Active',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Senior',
    educationRequirement: 'Graduate / Post Graduate in Business, Commerce, or Finance',
    keyResponsibilities: [
      'Advise Indian HNIs, Family Offices, and NRI investors on Dubai Freehold property investments',
      'Present off-plan and ready luxury inventory from Emaar, DAMAC, Sobha, Danube, and Nakheel',
      'Organize Dubai property roadshows, investor dinners, and virtual launch sessions',
      'Guide clients on UAE Golden Visa rules, payment plans, and rental yield structures',
    ],
    requiredSkills: [
      'Dubai Freehold Regulations, RERA UAE & Golden Visa Framework Knowledge',
      'Cross-Border Wealth Advisory & HNI Presentation',
      'Knowledge of Downtown Dubai, Dubai Marina, Palm Jumeirah, and Dubai Hills Estate',
    ],
    mustHaveQualifications: [
      'Prior exposure selling Dubai or international properties, or top-tier Indian luxury real estate',
      'Valid Passport & willingness to travel for Dubai developer events',
    ],
    screeningQuestions: [
      'What is your degree and educational background?',
      'Have you previously sold Dubai off-plan projects, and with which developers (e.g. Emaar, DAMAC, Sobha)?',
      'What proportion of your current clientele consists of high-net-worth investors looking for international diversification?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'wcr-role-re-4',
    title: 'Business Development Manager (Channel Partner Alliances)',
    code: 'WCR-BDM-2026',
    department: 'Channel Partner & Institutional Alliances',
    roleType: 'Job',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: false,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 4,
    minExpYears: 3,
    maxExpYears: 7,
    budgetBand: '₹10,00,000 - ₹18,00,000 PA Fixed',
    oteBand: '₹20,00,000 - ₹32,00,000 OTE + Alliance Incentives',
    status: 'Active',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Mid',
    educationRequirement: 'Graduate / MBA in Sales & Marketing',
    keyResponsibilities: [
      'Empanel, activate, and manage a network of 100+ active Channel Partners and wealth brokers in Delhi-NCR',
      'Structure broker meets, incentive launches, and new project briefings',
      'Facilitate channel partner site visits and ensure transparent brokerage disbursement coordination',
    ],
    requiredSkills: [
      'Channel Partner Network Development in Delhi NCR',
      'Broker Engagement, Event Hosting & Relationship Management',
      'Commercial Understanding of Real Estate Alliances',
    ],
    mustHaveQualifications: [
      '2+ years in real estate channel partner sales / corporate alliances in Gurgaon',
    ],
    screeningQuestions: [
      'What is your academic qualification and college background?',
      'How large is your active channel partner network across Gurgaon, Delhi, and Faridabad?',
      'How many CP site visits do you typically generate in a month?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'wcr-role-re-5',
    title: 'Presales & Tele-Calling Specialist',
    code: 'WCR-PRE-2026',
    department: 'Inside Sales & Lead Qualification',
    roleType: 'Job',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: false,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 15,
    minExpYears: 1,
    maxExpYears: 4,
    budgetBand: '₹4,50,000 - ₹8,00,000 PA Fixed',
    oteBand: '₹9,00,000 - ₹14,00,000 OTE with Site Visit Incentives',
    status: 'Urgent',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Entry',
    educationRequirement: 'Graduate in any discipline',
    keyResponsibilities: [
      'Engage fresh inbound digital leads from Google, Meta, and property portals within 5-minute SLAs',
      'Screen buyer requirements (budget, location preference, 2BHK/3BHK/4BHK/Penthouse, timeline)',
      'Fix confirmed site visits for the Direct Sales squad at developer experience centers',
      'Maintain CRM lead status, follow-up logs, and call dispositions',
    ],
    requiredSkills: [
      'High-Energy Telephonic Communication in Hindi & English',
      'Objection Handling & Value Pitching for Gurgaon luxury projects',
      'CRM Telephony & Fast Typing / Disposition Logging',
    ],
    mustHaveQualifications: [
      'Minimum 1 year in outbound/inbound real estate or high-ticket presales telecalling',
    ],
    screeningQuestions: [
      'What is your educational background and graduation year?',
      'What was your average daily call volume and site visit confirmation rate in your previous presales role?',
      'How do you handle a client who says they are just browsing and not ready for a site visit?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },

  // ==========================================
  // SECTION 4: HR, MARKETING & NON-TECH INTERNSHIPS
  // ==========================================
  {
    id: 'wcr-role-hr-1',
    title: 'HR Recruiter / Talent Acquisition Specialist',
    code: 'WCR-HR-2026',
    department: 'Human Resources & Talent Acquisition',
    roleType: 'Job',
    category: 'HR',
    isTechRole: false,
    isInternship: false,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 3,
    minExpYears: 2,
    maxExpYears: 5,
    budgetBand: '₹6,00,000 - ₹11,00,000 PA Fixed',
    oteBand: '₹9,00,000 - ₹15,00,000 OTE + Hiring Incentives',
    status: 'Active',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Mid',
    educationRequirement: 'Graduate / MBA in HR / Post Graduate Diploma in Human Resources',
    keyResponsibilities: [
      'Headhunt, source, and attract top-performing sales consultants and managerial talent',
      'Manage ATS, schedule interviews with Business Heads, and coordinate face-to-face evaluation rounds at HQ',
      'Drive campus hiring and experienced lateral recruitment drives across Delhi-NCR',
      'Oversee offer rollout, compensation benchmarking, and smooth day-1 onboarding',
    ],
    requiredSkills: [
      'Headhunting in Delhi-NCR Real Estate & Banking/Financial Sectors',
      'Telephonic Candidate Pre-Screening & Profile Assessment',
      'Salary Negotiation & Notice Period Buyout Evaluation',
    ],
    mustHaveQualifications: [
      '2+ years of HR talent acquisition experience, ideally in real estate, insurance, or wealth management',
    ],
    screeningQuestions: [
      'What degree and college did you complete your education from?',
      'How many sales closures per month did you achieve in your previous recruitment role?',
      'Which sourcing channels (e.g. LinkedIn Recruiter, Naukri, Headhunting) are most effective for you?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'wcr-role-intern-4',
    title: 'Luxury Real Estate Advisory Intern',
    code: 'WCR-INT-RE-2026',
    department: 'Luxury Residential Sales & Market Research',
    roleType: 'Internship',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: true,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 8,
    minExpYears: 0,
    maxExpYears: 1,
    budgetBand: '₹20,000 - ₹30,000 / Month Stipend',
    oteBand: 'Site Visit Commissions + Fast-Track PPO as Property Consultant',
    status: 'Active',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Intern',
    educationRequirement: 'Pursuing / Completed Graduate Degree (BBA / B.Com / BA / MBA)',
    keyResponsibilities: [
      'Shadow senior property consultants during client meetings and developer site walkthroughs',
      'Learn micro-market valuation, floor plans, and investment pitch frameworks',
      'Assist in managing client registrations at developer experience centers',
    ],
    requiredSkills: [
      'High enthusiasm for luxury real estate, strong spoken communication, and confident presentation',
    ],
    mustHaveQualifications: [
      'Graduate or final-year student willing to work full-time from Sector 67 Gurugram HQ',
    ],
    screeningQuestions: [
      'What degree and college are you studying at, and what is your graduation year?',
      'What interests you most about building a career in luxury real estate advisory with White Collar Realty?',
      'Are you comfortable travelling for client site visits across Golf Course Extension Road and SPR?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'wcr-role-intern-5',
    title: 'HR & Talent Acquisition Intern',
    code: 'WCR-INT-HR-2026',
    department: 'Human Resources & People Operations',
    roleType: 'Internship',
    category: 'HR',
    isTechRole: false,
    isInternship: true,
    location: '6th Floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram',
    openingsCount: 4,
    minExpYears: 0,
    maxExpYears: 1,
    budgetBand: '₹18,000 - ₹28,000 / Month Stipend',
    oteBand: 'Hiring Bonus + PPO Conversion',
    status: 'Active',
    careerUrl: 'https://whitecollarrealty.com/career',
    experienceLevel: 'Intern',
    educationRequirement: 'Pursuing / Completed BBA / MBA HR / Psychology / Social Sciences',
    keyResponsibilities: [
      'Screen candidate resumes against White Collar Realty job specifications',
      'Coordinate interview schedules between candidates and hiring managers',
      'Maintain candidate databases and follow-up communication logs',
    ],
    requiredSkills: [
      'Warm telephone etiquette and strong written English communication',
      'Proficiency in Google Sheets, Gmail, and Google Calendar',
    ],
    mustHaveQualifications: [
      'Available for full-time 3 to 6 months internship in Gurugram',
    ],
    screeningQuestions: [
      'Could you share your educational degree, college, and passing year?',
      'What inspired you to explore human resources and recruitment?',
      'Are you available to join immediately on-site at our M3M Urbana Gurugram office?',
    ],
    lastSyncedAt: new Date().toISOString(),
  },
];

const CAREER_STORAGE_KEY = 'wcr_career_job_openings_v3';

export function getSavedCareerOpenings(): CareerJobOpening[] {
  try {
    const raw = localStorage.getItem(CAREER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load career openings from localStorage', e);
  }
  return INITIAL_WHITE_COLLAR_CAREER_ROLES;
}

export function saveCareerOpenings(openings: CareerJobOpening[]): void {
  try {
    localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(openings));
  } catch (e) {
    console.error('Failed to save career openings', e);
  }
}

/**
 * Real-time fetcher from https://whitecollarrealty.com/career (via server API endpoint with live sync)
 */
export async function fetchRealTimeCareerOpenings(): Promise<{
  roles: CareerJobOpening[];
  source: 'live_api' | 'cached_catalog';
  lastSyncedAt: string;
  totalJobs: number;
  totalInternships: number;
}> {
  try {
    const res = await fetch('/api/career/fetch-live');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.roles) && data.roles.length > 0) {
        saveCareerOpenings(data.roles);
        return {
          roles: data.roles,
          source: 'live_api',
          lastSyncedAt: data.lastSyncedAt || new Date().toISOString(),
          totalJobs: data.roles.filter((r: CareerJobOpening) => r.roleType === 'Job').length,
          totalInternships: data.roles.filter((r: CareerJobOpening) => r.roleType === 'Internship').length,
        };
      }
    }
  } catch (e) {
    console.warn('Real-time API fetch failed, falling back to cached catalog', e);
  }

  const existing = getSavedCareerOpenings();
  const updated = existing.map((r) => ({ ...r, lastSyncedAt: new Date().toISOString() }));
  saveCareerOpenings(updated);
  return {
    roles: updated,
    source: 'cached_catalog',
    lastSyncedAt: new Date().toISOString(),
    totalJobs: updated.filter((r) => r.roleType === 'Job').length,
    totalInternships: updated.filter((r) => r.roleType === 'Internship').length,
  };
}
