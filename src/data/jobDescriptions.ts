import { JobDescription } from '../types';

export const WHITE_COLLAR_JOB_DESCRIPTIONS: Record<string, JobDescription> = {
  // 1. Tech: Full Stack Engineer
  'full_stack_developer': {
    id: 'jd-fsd',
    title: 'Senior Full Stack Software Engineer (React / Node / TypeScript)',
    department: 'Engineering & PropTech Innovation',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Job',
    category: 'Tech',
    isTechRole: true,
    isInternship: false,
    minExperienceYears: 2,
    maxExperienceYears: 6,
    minRealEstateExpYears: 0,
    budgetBand: '₹14,00,000 - ₹24,00,000 PA Fixed',
    oteBand: '₹18,00,000 - ₹28,00,000 OTE with tech performance bonuses',
    educationRequirement: 'B.Tech / B.E. / MCA in Computer Science, IT, or related engineering discipline',
    techStack: ['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Tailwind CSS', 'Docker', 'REST/GraphQL'],
    marketFocus: 'PropTech CRM, Real-Time Voice Screening Pipelines, and Luxury Property Portals',
    noticePeriodExpectation: 'Immediate to 30 days max',
    keyResponsibilities: [
      'Architect and scale the White Collar Realty PropTech ecosystem, CRM integrations, and AI calling platforms',
      'Build performant, responsive web applications using React, TypeScript, and Tailwind CSS',
      'Design resilient backend RESTful microservices with Node.js / Express and PostgreSQL databases',
      'Integrate third-party APIs (Google Workspace OAuth, Vapi, Gemini Live Audio WebSockets, WhatsApp)',
    ],
    requiredSkills: [
      'Full Stack Web Development (TypeScript, React, Node.js)',
      'Database Architecture (PostgreSQL, Redis, schema optimization)',
      'WebSockets, Web Audio API, and real-time event streaming',
      'Git workflows, CI/CD, and Docker containerization',
    ],
    roleSpecificQuestions: [
      'What core programming languages and frameworks did you use in your recent production projects?',
      'Can you describe the most complex full-stack web project you designed and deployed recently?',
      'How have you handled real-time communication (e.g. WebSockets, WebRTC, or Server-Sent Events) in your architecture?',
      'Which relational or NoSQL databases do you feel most proficient designing schemas and queries for?',
    ],
  },

  // 2. Tech: AI / ML & Conversational Voice Engineer
  'ai_ml_engineer': {
    id: 'jd-aiml',
    title: 'AI / ML Engineer (Conversational Voice Agents & LLMs)',
    department: 'AI Lab & Conversational Systems',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Job',
    category: 'Tech',
    isTechRole: true,
    isInternship: false,
    minExperienceYears: 2,
    maxExperienceYears: 6,
    minRealEstateExpYears: 0,
    budgetBand: '₹16,00,000 - ₹28,00,000 PA Fixed',
    oteBand: '₹22,00,000 - ₹34,00,000 OTE + AI Innovation Grants',
    educationRequirement: 'B.Tech / M.Tech / MS in Computer Science, AI/ML, Data Science, or Mathematics',
    techStack: ['Python', 'PyTorch', 'FastAPI', 'Gemini Live Multimodal API', 'Vapi AI', 'OpenAI', 'LangChain', 'WebSockets'],
    marketFocus: 'Real-Time Voice AI Recruiter, Sentiment Intelligence, and Autonomous HNI Outreach Bots',
    noticePeriodExpectation: 'Immediate to 30 days max',
    keyResponsibilities: [
      'Build low-latency bidirectional voice screening agents with Gemini Live and Vapi WebRTC audio pipelines',
      'Fine-tune prompt chains, function-calling tools, and conversation state guards to eliminate hallucination',
      'Implement voice sentiment analysis, speech pace tracking, and candidate classification models',
      'Deploy scalable Python FastAPI microservices on Google Cloud Run and Kubernetes',
    ],
    requiredSkills: [
      'Python, LLM Prompt Engineering, RAG architectures, and Function Calling',
      'Streaming Audio Processing (PCM 16kHz/24kHz, WebSockets, AudioContext)',
      'Vector Databases, Semantic Search, and Voice Pipeline Optimization',
    ],
    roleSpecificQuestions: [
      'What LLMs and voice frameworks (such as Gemini Live, OpenAI, or Vapi) have you built practical applications with?',
      'Can you walk me through an AI project where you implemented low-latency streaming or function calling?',
      'What programming languages and backend frameworks did you choose for deploying that AI system?',
      'How do you manage conversation memory and guard against AI prompt repetition or hallucination?',
    ],
  },

  // 3. Tech: Backend Software Engineer
  'backend_engineer': {
    id: 'jd-be',
    title: 'Backend Software Engineer (Python / Node.js / PostgreSQL)',
    department: 'Core Infrastructure & Microservices',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Job',
    category: 'Tech',
    isTechRole: true,
    isInternship: false,
    minExperienceYears: 2,
    maxExperienceYears: 5,
    minRealEstateExpYears: 0,
    budgetBand: '₹12,00,000 - ₹20,00,000 PA Fixed',
    oteBand: '₹16,00,000 - ₹24,00,000 OTE',
    educationRequirement: 'B.Tech / B.E. / BCA / MCA in Computer Science or Software Engineering',
    techStack: ['Python', 'Node.js', 'FastAPI', 'Express', 'PostgreSQL', 'Redis', 'Docker', 'Google Cloud'],
    marketFocus: 'Enterprise Real Estate CRM Backend, Lead Distribution Engine, Google API Sync Services',
    noticePeriodExpectation: 'Immediate to 30 days',
    keyResponsibilities: [
      'Develop robust REST APIs and background job queues for high-volume lead routing and candidate tracking',
      'Optimize database queries, indexing, and connection pools in PostgreSQL',
      'Build background sync workers for Google Calendar, Sheets, and Gmail integrations',
    ],
    requiredSkills: [
      'Python / Node.js backend development',
      'Relational Database Modeling & SQL optimization (PostgreSQL)',
      'OAuth 2.0 flows, rate limiting, and security compliance',
    ],
    roleSpecificQuestions: [
      'What programming languages and frameworks do you use for backend API development?',
      'Can you explain a database-heavy project you built and how you structured the tables and queries?',
      'How do you handle background cron jobs, async worker queues, and external API error recovery?',
    ],
  },

  // 4. Tech Internship: Software Engineering Intern
  'software_engineering_intern': {
    id: 'jd-se-intern',
    title: 'Software Engineering Intern (Web & Full-Stack Tech)',
    department: 'Engineering & PropTech Innovation',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Internship',
    category: 'Tech',
    isTechRole: true,
    isInternship: true,
    minExperienceYears: 0,
    maxExperienceYears: 1,
    minRealEstateExpYears: 0,
    budgetBand: '₹25,000 - ₹40,000 / Month Stipend (PPO Available: 8 - 14 LPA)',
    oteBand: 'Performance Stipend Bonus + Full-Time Pre-Placement Offer (PPO)',
    educationRequirement: 'Pursuing or Completed B.Tech / BCA / MCA / B.Sc CS (Final Year or Recent Graduate)',
    techStack: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'HTML/CSS', 'Git', 'Tailwind'],
    marketFocus: 'PropTech UI Development, Real-Time Candidate Hub, and ATS Automation Tools',
    noticePeriodExpectation: 'Immediate / Available for 3 to 6 months full-time internship in Gurugram',
    keyResponsibilities: [
      'Collaborate with senior engineers to build interactive React frontend features and dashboards',
      'Write clean, modular TypeScript code and unit tests',
      'Assist in building REST API endpoints and data synchronization utilities',
      'Participate in daily engineering stand-ups, code reviews, and product sprint demos',
    ],
    requiredSkills: [
      'Proficiency in JavaScript/TypeScript, React, and modern CSS/Tailwind',
      'Basic understanding of backend APIs (Node.js or Python) and relational databases',
      'Strong problem-solving fundamentals, data structures, and eagerness to build real products',
    ],
    roleSpecificQuestions: [
      'Which programming languages and web technologies have you learned and used in your college or personal projects?',
      'Tell me about a project you have built from scratch—what was its objective and how did you build it?',
      'What were the main technical challenges you encountered in that project and how did you resolve them?',
      'Are you available for a full-time 3 to 6-month in-office internship at our Sector 67 Gurugram HQ?',
    ],
  },

  // 5. Tech Internship: AI/ML & Voice Prompt Engineering Intern
  'ai_ml_intern': {
    id: 'jd-aiml-intern',
    title: 'AI/ML & Voice Prompt Engineering Intern',
    department: 'AI Lab & Conversational Systems',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Internship',
    category: 'Tech',
    isTechRole: true,
    isInternship: true,
    minExperienceYears: 0,
    maxExperienceYears: 1,
    minRealEstateExpYears: 0,
    budgetBand: '₹30,000 - ₹45,000 / Month Stipend (PPO Available: 10 - 16 LPA)',
    oteBand: 'High Performance Bonus + Fast-Track PPO Conversion',
    educationRequirement: 'Pursuing or Completed B.Tech / M.Tech in CS/AI/Data Science / Mathematics',
    techStack: ['Python', 'OpenAI API', 'Gemini API', 'LangChain', 'FastAPI', 'Pandas', 'Prompt Engineering'],
    marketFocus: 'AI Voice Recruiter Optimization, Transcript Sentiment Scoring, and Real Estate Knowledge Graphs',
    noticePeriodExpectation: 'Immediate / Available for 3 to 6 months in Gurugram',
    keyResponsibilities: [
      'Craft, test, and benchmark AI system prompts for real-time telephonic HR screening interactions',
      'Analyze call transcripts using Python to extract sentiment, candidate talk-time, and intent markers',
      'Assist in fine-tuning conversational workflows and multi-language Hinglish translation pipelines',
    ],
    requiredSkills: [
      'Python programming, familiarity with GenAI/LLM APIs (OpenAI, Gemini, Anthropic)',
      'Prompt engineering, few-shot conditioning, and structured JSON generation',
      'Analytical mindset and passion for cutting-edge generative AI',
    ],
    roleSpecificQuestions: [
      'What programming languages do you use for AI and data manipulation?',
      'Can you share an AI project or script you created that utilized an LLM or machine learning model?',
      'What methods do you use to evaluate and improve the accuracy of an LLM prompt?',
      'Are you comfortable working full-time on-site at M3M Urbana Gurugram for this internship?',
    ],
  },

  // 6. Tech/Analytics Internship: Data Analytics & Market Intelligence Intern
  'data_analytics_intern': {
    id: 'jd-da-intern',
    title: 'Data Analytics & Real Estate Intelligence Intern',
    department: 'Business Intelligence & Market Research',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Internship',
    category: 'Tech',
    isTechRole: true,
    isInternship: true,
    minExperienceYears: 0,
    maxExperienceYears: 1,
    minRealEstateExpYears: 0,
    budgetBand: '₹22,000 - ₹35,000 / Month Stipend (PPO: 7 - 12 LPA)',
    oteBand: 'Research Incentive + PPO Conversion Opportunity',
    educationRequirement: 'Degree in Engineering, Statistics, Mathematics, Economics, or Data Analytics',
    techStack: ['Python', 'SQL', 'Excel / Google Sheets', 'Power BI / Tableau', 'Pandas', 'NumPy'],
    marketFocus: 'Gurgaon & Dubai Real Estate Micro-Market Trends, Pricing Indices, and Sales Conversion Analytics',
    noticePeriodExpectation: 'Immediate / Available for 3 to 6 months',
    keyResponsibilities: [
      'Analyze NCR luxury residential price trends across Golf Course Extension, SPR, and Dwarka Expressway',
      'Build automated Google Sheets and PowerBI dashboards tracking recruiter calling volume and conversions',
      'Cleanse and normalize candidate and CRM buyer data pipelines',
    ],
    requiredSkills: [
      'SQL, Python (Pandas/NumPy), Advanced Excel, and data visualization tools',
      'Attention to detail, statistical reasoning, and commercial curiosity',
    ],
    roleSpecificQuestions: [
      'What tools and programming languages (e.g. Python, SQL, Excel) have you used in data analysis projects?',
      'Can you describe a dataset or project you analyzed and what key insights you derived?',
      'How proficient are you in writing SQL queries involving joins, aggregations, and subqueries?',
    ],
  },

  // 7. Real Estate: Senior Property Consultant
  'property_consultant': {
    id: 'jd-pc',
    title: 'Senior Property Consultant / Luxury Advisory Specialist',
    department: 'Luxury Residential & Commercial Advisory',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Job',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: false,
    minExperienceYears: 2,
    maxExperienceYears: 6,
    minRealEstateExpYears: 1.5,
    budgetBand: '₹8,00,000 - ₹15,00,000 PA Fixed',
    oteBand: '₹18,00,000 - ₹28,00,000 OTE with high tier transaction incentives',
    educationRequirement: 'Graduate or Post Graduate in any discipline (BBA, B.Com, MBA, etc.)',
    marketFocus: 'Gurugram Luxury Corridors (Golf Course Ext, SPR, Dwarka Expressway) & Dubai Projects',
    noticePeriodExpectation: 'Immediate to 30 days',
    keyResponsibilities: [
      'Manage end-to-end buyer journey from qualified lead engagement to site visit and booking',
      'Present luxury residential layouts (₹2 Cr – ₹15 Cr+) from DLF, M3M, Godrej, Sobha, SmartWorld, and Elan',
      'Coordinate site visits at M3M Urbana, DLF Crest/Camellias zone, and Golf Course Extension sites',
      'Negotiate terms and facilitate booking documentation per developer guidelines',
    ],
    requiredSkills: [
      'Consultative Property Selling & High-Ticket Lead Conversion',
      'Gurugram Micro-Market & Infrastructure Understanding',
      'Relationship Building with HNI & NRI Buyers',
      'Fluent Spoken English & Corporate Communication Etiquette',
    ],
    roleSpecificQuestions: [
      'How many years have you been handling direct real estate property sales in Gurgaon?',
      'What category of properties (Luxury Residential, Plots, or Commercial) have you primarily closed?',
      'What has been your typical monthly lead-to-site-visit and booking conversion rate?',
      'Have you closed any deals in Golf Course Extension Road, SPR, or Dwarka Expressway in the last 6 months?',
    ],
  },

  // 8. Real Estate: Sales Manager
  'sales_manager': {
    id: 'jd-sm',
    title: 'Sales Manager / Team Lead (Luxury Real Estate)',
    department: 'Direct Advisory & Sales Squad Leadership',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Job',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: false,
    minExperienceYears: 4,
    maxExperienceYears: 9,
    minRealEstateExpYears: 3,
    budgetBand: '₹14,00,000 - ₹24,00,000 PA Fixed',
    oteBand: '₹28,00,000 - ₹45,00,000 OTE + Squad Override Commissions',
    educationRequirement: 'Graduate / MBA in Marketing / Sales Management',
    marketFocus: 'Gurugram Luxury Corridors & Dubai Freehold Inventories',
    noticePeriodExpectation: 'Immediate to 30 days max',
    keyResponsibilities: [
      'Lead and mentor a high-performing squad of 8 to 15 Property Consultants',
      'Drive monthly gross booking targets of ₹20–40 Cr across premier developer inventories (DLF, M3M, Godrej, Emaar, Sobha)',
      'Conduct high-ticket negotiations and closing meetings with HNIs and NRI investors',
      'Manage pipeline health in CRM and ensure SLA adherence for site visit conversions',
    ],
    requiredSkills: [
      'Team Leadership & Squad Target Accountability',
      'High-Ticket Real Estate Negotiation & Closing',
      'In-depth Knowledge of Gurugram Circle Rates, RERA & Dubai Freehold Policies',
      'HNI & Corporate Network in Delhi NCR',
    ],
    roleSpecificQuestions: [
      'How large was the sales team you were managing in your last role?',
      'Were you personally accountable for the monthly squad target, and what was your team run-rate?',
      'Which Gurgaon developer projects (e.g. DLF, M3M, Godrej) or Dubai portfolios have you actively closed?',
      'What has been your average ticket size and closing conversion ratio?',
    ],
  },

  // 9. Real Estate: Dubai & International Investment Advisor
  'dubai_advisor': {
    id: 'jd-dxb',
    title: 'Investment Advisor - Dubai & International Real Estate',
    department: 'International & Cross-Border Wealth Advisory',
    location: 'Gurugram HQ (Sector 67 M3M Urbana) / Dubai Downtown Office',
    roleType: 'Job',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: false,
    minExperienceYears: 3,
    maxExperienceYears: 8,
    minRealEstateExpYears: 2,
    budgetBand: '₹12,00,000 - ₹22,00,000 PA Fixed + Tax-Free AED Incentives',
    oteBand: '₹30,00,000 - ₹60,00,000 OTE with Dubai Direct Commissions',
    educationRequirement: 'Graduate / Post Graduate in Business, Commerce, or Finance',
    marketFocus: 'Downtown Dubai, Dubai Marina, Palm Jumeirah, Dubai Hills Estate, Business Bay',
    noticePeriodExpectation: 'Immediate to 30 days',
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
    roleSpecificQuestions: [
      'Have you previously sold Dubai off-plan projects, and with which developers (e.g. Emaar, DAMAC, Sobha)?',
      'What proportion of your current clientele consists of high-net-worth investors looking for international diversification?',
      'Are you familiar with the UAE 10-year Golden Visa property investment thresholds and payment plans?',
    ],
  },

  // 10. Real Estate: Business Development Manager
  'business_development': {
    id: 'jd-bdm',
    title: 'Business Development Manager (Channel Partner Alliances)',
    department: 'Channel Partner & Institutional Alliances',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Job',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: false,
    minExperienceYears: 3,
    maxExperienceYears: 7,
    minRealEstateExpYears: 2,
    budgetBand: '₹10,00,000 - ₹18,00,000 PA Fixed',
    oteBand: '₹20,00,000 - ₹32,00,000 OTE + Alliance Incentives',
    educationRequirement: 'Graduate / MBA in Sales & Marketing',
    marketFocus: 'Delhi NCR Corporate Alliances & Channel Partner Network',
    noticePeriodExpectation: 'Immediate to 30 days',
    keyResponsibilities: [
      'Onboard and activate tier-1 Channel Partners and independent wealth brokers across NCR',
      'Structure joint customer engagement sessions and project launch briefings',
      'Drive corporate tie-ups with MNCs across Cyber City, Golf Course Road, and Udyog Vihar',
    ],
    requiredSkills: [
      'Channel Partner Network Development in Delhi NCR',
      'Broker Engagement, Event Hosting & Relationship Management',
      'Commercial Understanding of Real Estate Alliances',
    ],
    roleSpecificQuestions: [
      'How many active Channel Partners did you manage in your network across Gurgaon and Delhi?',
      'Have you handled corporate desk activations or NRI broker roadshows?',
      'What was your average monthly gross booking value generated through broker networks?',
    ],
  },

  // 11. Presales: Tele-Calling Specialist
  'presales_specialist': {
    id: 'jd-pre',
    title: 'Presales & Tele-Calling Specialist',
    department: 'Inside Sales & Lead Qualification',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Job',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: false,
    minExperienceYears: 1,
    maxExperienceYears: 4,
    minRealEstateExpYears: 1,
    budgetBand: '₹4,50,000 - ₹8,00,000 PA Fixed',
    oteBand: '₹9,00,000 - ₹14,00,000 OTE with Site Visit Incentives',
    educationRequirement: 'Graduate in any discipline',
    marketFocus: 'Gurgaon Luxury Residential Digital Inbound Leads',
    noticePeriodExpectation: 'Immediate to 15 days',
    keyResponsibilities: [
      'Engage fresh inbound digital leads from Google, Meta, and property portals within 5-minute SLAs',
      'Screen buyer requirements (budget, location preference, 2BHK/3BHK/4BHK/Penthouse, timeline)',
      'Fix confirmed site visits for the Direct Sales squad at developer experience centers',
    ],
    requiredSkills: [
      'High-Energy Telephonic Communication in Hindi & English',
      'Objection Handling & Value Pitching for Gurgaon luxury projects',
      'CRM Telephony & Fast Typing / Disposition Logging',
    ],
    roleSpecificQuestions: [
      'What was your average daily call volume and site visit confirmation rate in your previous presales role?',
      'How do you handle a client who says they are just browsing and not ready for an immediate site visit?',
    ],
  },

  // 12. HR: Recruiter / Talent Acquisition Specialist
  'hr_recruiter': {
    id: 'jd-hr',
    title: 'HR Recruiter / Talent Acquisition Specialist',
    department: 'Human Resources & Talent Acquisition',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Job',
    category: 'HR',
    isTechRole: false,
    isInternship: false,
    minExperienceYears: 2,
    maxExperienceYears: 5,
    minRealEstateExpYears: 1,
    budgetBand: '₹6,00,000 - ₹11,00,000 PA Fixed',
    oteBand: '₹9,00,000 - ₹15,00,000 OTE + Hiring Incentives',
    educationRequirement: 'Graduate / MBA in HR / Post Graduate Diploma in Human Resources',
    marketFocus: 'Real Estate & Tech Talent Sourcing across Gurugram & Delhi NCR',
    noticePeriodExpectation: 'Immediate to 30 days',
    keyResponsibilities: [
      'Headhunt, source, and attract top-performing sales consultants and tech talent',
      'Manage ATS, schedule interviews with Business Heads, and coordinate face-to-face evaluation rounds at HQ',
      'Drive campus hiring and experienced lateral recruitment drives across Delhi-NCR',
      'Oversee offer rollout, compensation benchmarking, and smooth day-1 onboarding',
    ],
    requiredSkills: [
      'Headhunting in Delhi-NCR Real Estate & Banking/Financial Sectors',
      'Telephonic Candidate Pre-Screening & Profile Assessment',
      'Salary Negotiation & Notice Period Buyout Evaluation',
    ],
    roleSpecificQuestions: [
      'How many lateral recruitment closures per month did you achieve in your previous recruitment role?',
      'Which sourcing channels (e.g. LinkedIn Recruiter, Naukri, Direct Headhunting) are most effective for you?',
    ],
  },

  // 13. HR Internship
  'hr_intern': {
    id: 'jd-hr-intern',
    title: 'HR & Talent Acquisition Intern',
    department: 'Human Resources & People Operations',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Internship',
    category: 'HR',
    isTechRole: false,
    isInternship: true,
    minExperienceYears: 0,
    maxExperienceYears: 1,
    minRealEstateExpYears: 0,
    budgetBand: '₹18,000 - ₹28,000 / Month Stipend (PPO: 5 - 8 LPA)',
    oteBand: 'Hiring Bonus + PPO Conversion',
    educationRequirement: 'Pursuing / Completed BBA / MBA HR / Psychology / Social Sciences',
    marketFocus: 'Talent Sourcing, Interview Scheduling, and Campus Recruitment Drives',
    noticePeriodExpectation: 'Immediate / Available for 3 to 6 months in Gurugram',
    keyResponsibilities: [
      'Screen incoming candidate resumes against job descriptions for sales and tech openings',
      'Coordinate telephonic screening schedules and manage Google Calendar interview invites',
      'Maintain candidate databases and follow-up communication logs',
    ],
    requiredSkills: [
      'Excellent verbal and written communication in English & Hindi',
      'Proficiency in Google Workspace (Sheets, Gmail, Calendar) and MS Office',
    ],
    roleSpecificQuestions: [
      'What interested you in pursuing Human Resources and Talent Acquisition as your career focus?',
      'How would you handle an urgent requirement to schedule 10 candidate interviews in a single day?',
    ],
  },

  // 14. Real Estate Advisory Internship
  'real_estate_intern': {
    id: 'jd-re-intern',
    title: 'Luxury Real Estate Advisory Intern',
    department: 'Luxury Residential Sales & Market Research',
    location: '6th floor, TOWER-A, M3M Urbana Business Park, Sector 67, Gurugram, Haryana 122101',
    roleType: 'Internship',
    category: 'Real Estate & Sales',
    isTechRole: false,
    isInternship: true,
    minExperienceYears: 0,
    maxExperienceYears: 1,
    minRealEstateExpYears: 0,
    budgetBand: '₹20,000 - ₹30,000 / Month Stipend (PPO: 6 - 12 LPA)',
    oteBand: 'Site Visit Commissions + Fast-Track PPO as Property Consultant',
    educationRequirement: 'Pursuing / Completed Graduate Degree (BBA / B.Com / BA / MBA)',
    marketFocus: 'Gurugram Luxury Real Estate Developer Sites & Investor Walkthroughs',
    noticePeriodExpectation: 'Immediate availability in Sector 67 Gurugram',
    keyResponsibilities: [
      'Accompany senior property consultants on developer project site visits (M3M, DLF, Godrej)',
      'Learn micro-market pricing models and luxury layout configurations',
      'Engage prospective buyers and assist in property presentation prep',
    ],
    requiredSkills: [
      'High enthusiasm for luxury real estate, strong communication, and presentable corporate demeanour',
    ],
    roleSpecificQuestions: [
      'What excites you about entering the luxury real estate sector in Gurugram?',
      'Are you comfortable travelling for client site visits across Golf Course Extension Road and SPR?',
    ],
  },
};

/**
 * Intelligent role lookup that handles tech, internship, sales, hr, and international roles
 */
export function getWhiteCollarJobDescription(roleName?: string): JobDescription {
  const r = (roleName || '').toLowerCase();

  // Tech internships
  if (r.includes('intern')) {
    if (r.includes('software') || r.includes('developer') || r.includes('tech') || r.includes('web') || r.includes('react') || r.includes('full stack') || r.includes('frontend') || r.includes('backend') || r.includes('code')) {
      return WHITE_COLLAR_JOB_DESCRIPTIONS['software_engineering_intern'];
    }
    if (r.includes('ai') || r.includes('ml') || r.includes('prompt') || r.includes('machine learning') || r.includes('voice') || r.includes('llm')) {
      return WHITE_COLLAR_JOB_DESCRIPTIONS['ai_ml_intern'];
    }
    if (r.includes('data') || r.includes('analytic') || r.includes('research') || r.includes('bi')) {
      return WHITE_COLLAR_JOB_DESCRIPTIONS['data_analytics_intern'];
    }
    if (r.includes('hr') || r.includes('recruit') || r.includes('people') || r.includes('talent')) {
      return WHITE_COLLAR_JOB_DESCRIPTIONS['hr_intern'];
    }
    return WHITE_COLLAR_JOB_DESCRIPTIONS['real_estate_intern'];
  }

  // Full-time Tech Roles
  if (r.includes('ai') || r.includes('ml') || r.includes('voice engineer') || r.includes('machine learning') || r.includes('llm') || r.includes('conversational')) {
    return WHITE_COLLAR_JOB_DESCRIPTIONS['ai_ml_engineer'];
  }
  if (r.includes('backend') || r.includes('python') || r.includes('fastapi') || r.includes('database') || r.includes('microservice')) {
    return WHITE_COLLAR_JOB_DESCRIPTIONS['backend_engineer'];
  }
  if (r.includes('full stack') || r.includes('software engineer') || r.includes('developer') || r.includes('frontend') || r.includes('react') || r.includes('node') || r.includes('engineer') || r.includes('tech')) {
    return WHITE_COLLAR_JOB_DESCRIPTIONS['full_stack_developer'];
  }

  // HR & Talent Acquisition
  if (r.includes('hr') || r.includes('recruit') || r.includes('talent') || r.includes('acquisition') || r.includes('people') || r.includes('ta')) {
    return WHITE_COLLAR_JOB_DESCRIPTIONS['hr_recruiter'];
  }

  // Dubai & International
  if (r.includes('dubai') || r.includes('international') || r.includes('cross-border') || r.includes('nri') || r.includes('foreign') || r.includes('uae')) {
    return WHITE_COLLAR_JOB_DESCRIPTIONS['dubai_advisor'];
  }

  // Sales Management / Team Lead
  if (r.includes('lead') || r.includes('manager') || r.includes('head') || r.includes('vp') || r.includes('director') || r.includes('tl') || r.includes('sm')) {
    return WHITE_COLLAR_JOB_DESCRIPTIONS['sales_manager'];
  }

  // Business Development & CP Alliances
  if (r.includes('business') || r.includes('bd') || r.includes('channel') || r.includes('corporate') || r.includes('alliance') || r.includes('partner') || r.includes('broker')) {
    return WHITE_COLLAR_JOB_DESCRIPTIONS['business_development'];
  }

  // Presales & Tele-Calling
  if (r.includes('presales') || r.includes('tele') || r.includes('calling') || r.includes('inside sales') || r.includes('inbound') || r.includes('telecalling')) {
    return WHITE_COLLAR_JOB_DESCRIPTIONS['presales_specialist'];
  }

  // Default: Senior Luxury Property Consultant
  return WHITE_COLLAR_JOB_DESCRIPTIONS['property_consultant'];
}
