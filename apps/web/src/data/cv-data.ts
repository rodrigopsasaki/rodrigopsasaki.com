// CV Data Configuration
// Update the start dates here and the CV will automatically calculate years of experience

export const personalInfo = {
  name: "Rodrigo Sasaki",
  location: "São Paulo, Brazil",
  email: "rodrigopsasaki@gmail.com",
  phone: "+5511999484555",
  linkedin: "https://www.linkedin.com/in/rodrigopsasaki",
  github: "https://github.com/rodrigopsasaki",
};

export const summary = `Senior Software Engineer with 15 years of experience delivering scalable systems, improving software performance, and contributing across product, infrastructure, and CI/CD pipelines. Experienced in early-stage environments, end-to-end architecture, and production ownership. Pragmatic, fast-moving, and focused on product impact.`;

export const experience = [
  {
    company: "Clipboard Health",
    role: "Senior Software Engineer",
    startDate: "2022-06-01",
    endDate: null, // null means current
    location: "Remote",
    achievements: [
      "Introduced the use of structured canonical logs, authoring one of the company's first open-source library and redefining how engineers think about observability",
      "Refactored key components of the marketplace to allow other teams to quickly build experiments, greatly reducing the time needed to vet a new idea",
      "Took ownership of production services, optimizing reliability, security, and developer experience",
      "Led internal efforts on CI/CD practices and operational monitoring"
    ]
  },
  {
    company: "Caura",
    role: "Senior Software Engineer", 
    startDate: "2019-07-01",
    endDate: "2022-06-01",
    location: "Remote",
    achievements: [
      "Helped build the product from the ground up, participating in every major architectural decision",
      "Contributed to infrastructure, security, API design, and backend product development",
      "Collaborated closely with cross-functional teams in a fully remote, startup environment",
      "Collaborated with insurance providers to create a seamless integration based on a composable rules engine"
    ]
  },
  {
    company: "OWLR Technologies",
    role: "Lead Server Engineer",
    startDate: "2017-06-01", 
    endDate: "2020-02-01",
    location: "Remote",
    achievements: [
      "Rebuilt the server-side architecture from the ground up to modernize and improve system maintainability and reduced the server costs by 82%",
      "Authored the company's best practices and rehauled the hiring and onboarding process for new engineers"
    ]
  },
  {
    company: "99",
    role: "Software Developer",
    startDate: "2016-07-01",
    endDate: "2017-06-01", 
    location: "São Paulo, Brazil",
    achievements: [
      "Improved real-time location tracking with a new data pipeline using Elasticsearch",
      "Refactored sections of the matching system to improve performance, increase observability and enable future experimentation"
    ]
  },
  {
    company: "iCarros", 
    role: "Programmer Analyst",
    startDate: "2013-01-01",
    endDate: "2015-12-31",
    location: "São Paulo, Brazil", 
    achievements: [
      "Introduced early adoption of AWS, using Lambda functions to pre-render images in multiple resolutions",
      "Contributed to platform modernization efforts and internal security practices",
      "Developed foundational backend components for ad platform features"
    ]
  }
];

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
  "Languages & Runtime": ["JavaScript", "TypeScript", "Node.js", "Java", "Python"],
  "Databases": ["PostgreSQL", "MongoDB", "Redis", "Elasticsearch"],
  "Infrastructure & Cloud": ["AWS", "Docker", "Terraform", "Kubernetes"],
  "Architecture & Practices": ["REST APIs", "Event-driven architectures", "Microservices", "OAuth"],
  "DevOps & Tools": ["CI/CD", "GitHub Actions", "Observability"]
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