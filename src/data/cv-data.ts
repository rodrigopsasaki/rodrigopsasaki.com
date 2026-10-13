// CV Data Configuration
// Update the start dates here and the CV will automatically calculate years of experience

export const personalInfo = {
  name: "Rodrigo Sasaki",
  location: "São Paulo, Brazil",
  linkedin: "https://www.linkedin.com/in/rodrigopsasaki",
  github: "https://github.com/rodrigopsasaki",
  preston: "https://preston.bot/",
};

// Career start; drives every "N years" figure on the site
export const careerStartDate = "2009-12-01";

export const headline = "AI Tech Lead at Deel. Developer workflows for the AI era: searchable engineering context, less PR overhead.";

export const summary = `Engineer with ${calculateYearsOfExperience(careerStartDate)} years building backend systems, from high-throughput dispatch at 99 to marketplace infrastructure at Clipboard Health. I now work on how engineering teams build with AI. Agents made code cheap to write, so the cost moved to finding the right context and reviewing what gets produced. At Deel I lead work on making engineering context searchable for people and agents. I write about how AI is changing the way software gets built.`;

export const experience = [
  {
    company: "Deel",
    role: "AI Tech Lead",
    startDate: "2026-09-01",
    endDate: null, // null means current
    location: "São Paulo, Brazil",
    achievements: [
      "Leading work on engineering context for AI-assisted development: making what the organization knows findable by both engineers and AI agents",
      "Building a knowledge layer that captures what is learned during everyday work and keeps it current as things change, so people and agents start from context that is still true"
    ]
  },
  {
    company: "SFR3",
    role: "Senior Software Engineer",
    startDate: "2026-04-01",
    endDate: "2026-06-30",
    location: "Remote",
    achievements: [
      "Made production agent harnesses deterministic: replayable runs, narrow typed LLM calls, and input-hash caching to keep model spend predictable",
      "Designed evaluation and observability for live agents, with audit envelopes that line up with existing ops logs and tunables that change behavior without re-prompting"
    ]
  },
  {
    company: "Clipboard Health",
    role: "Senior Software Engineer",
    startDate: "2022-06-01",
    endDate: "2026-04-01",
    location: "Remote",
    achievements: [
      "Introduced structured canonical logging and wrote one of the company's first open-source libraries, changing how engineers approached observability",
      "Refactored core marketplace components so other teams could ship experiments quickly, cutting the time to test a new idea",
      "Owned production services end to end: reliability, security, and developer experience",
      "Led internal work on CI/CD practices and operational monitoring"
    ]
  },
  {
    company: "Caura",
    role: "Senior Software Engineer",
    startDate: "2019-07-01",
    endDate: "2022-06-01",
    location: "Remote",
    achievements: [
      "Built the product from the ground up and took part in every major architecture decision",
      "Designed a composable rules engine for integrating with insurance providers",
      "Worked across infrastructure, security, API design, and backend product development"
    ]
  },
  {
    company: "OWLR Technologies",
    role: "Lead Server Engineer",
    startDate: "2017-06-01",
    endDate: "2020-02-01",
    location: "Remote",
    achievements: [
      "Rebuilt the server architecture, moving from Java to Node.js and a hybrid container and serverless setup, and cut server costs by 82%",
      "Owned uptime and the full path from code to deploy, including a new CI/CD workflow",
      "Wrote the engineering best practices and reworked hiring and onboarding",
      "Kept the servers running part-time through the company's wind-down, after moving to Caura"
    ]
  },
  {
    company: "99",
    role: "Software Developer",
    startDate: "2016-07-01",
    endDate: "2017-06-01",
    location: "São Paulo, Brazil",
    achievements: [
      "Worked on dispatch at Brazil's largest ride-hailing platform: matching each passenger to the best driver, fast and safely, at millions of requests",
      "Built a new Elasticsearch pipeline for real-time location tracking and made the matching system faster and easier to observe"
    ]
  }
];

// Roles before 99, summarized rather than listed
export const earlierExperience = "2009 – 2016: backend engineering at WalletHub, iCarros, VEMAC IT Consultants and CPM Braxis Capgemini.";

export const education = [
  {
    institution: "Pontifícia Universidade Católica de São Paulo",
    degree: "Postgraduate in Software Engineering",
    startYear: 2014,
    endYear: 2015
  },
  {
    institution: "Centro Universitário Nove de Julho", 
    degree: "Information Systems Technology Degree",
    startYear: 2009,
    endYear: 2011
  }
];

// Technology start dates - update these to automatically calculate experience
export const techExperience = {
  // Programming Languages
  "JavaScript": "2016-01-01",
  "TypeScript": "2018-01-01", 
  "Node.js": "2016-01-01",
  "Java": "2013-01-01",
  "Python": "2015-01-01",
  
  // Databases
  "PostgreSQL": "2014-01-01",
  "MongoDB": "2016-01-01", 
  "Redis": "2017-01-01",
  "Elasticsearch": "2016-01-01",
  
  // Infrastructure & Cloud
  "AWS": "2013-01-01",
  "Docker": "2016-01-01",
  "Terraform": "2022-01-01",
  "Kubernetes": "2019-01-01",
  
  // Tools & Practices
  "CI/CD": "2015-01-01",
  "GitHub Actions": "2019-01-01",
  "REST APIs": "2013-01-01",
  "OAuth": "2014-01-01",
  "Event-driven architectures": "2017-01-01",
  "Microservices": "2017-01-01",
  "Observability": "2018-01-01"
};

// Skill categories for organization
export const skillCategories = {
  "AI Systems": ["LLM agents", "Developer workflows", "Code review", "Evaluation", "MCP"],
  "Languages & Runtime": ["TypeScript", "Node.js", "Java", "Scala", "Python"],
  "Data": ["PostgreSQL", "Redis", "Elasticsearch"],
  "Infrastructure & Cloud": ["AWS", "Docker", "Kubernetes", "Terraform"],
  "Architecture & Practices": ["Distributed systems", "Event-driven architectures", "Observability", "CI/CD"]
};

// Helper function to calculate years of experience
export function calculateYearsOfExperience(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(diffYears);
}

// Helper function to get experience text
export function getExperienceText(startDate: string): string {
  const years = calculateYearsOfExperience(startDate);
  if (years === 0) return "< 1 year";
  if (years === 1) return "1 year";
  return `${years} years`;
}

// Helper function to format date range
export function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };
  
  if (end) {
    return `${formatDate(start)} – ${formatDate(end)}`;
  } else {
    return `${formatDate(start)} – Present`;
  }
}
