export const SECTION_TYPES = {
  LANDING: "LANDING",
  HISTORY: "HISTORY",
  ABOUT: "ABOUT",
  SKILLS: "SKILLS",
  TIMELINE: "TIMELINE",
  PROJECTS: "PROJECTS",
  CONTACT: "CONTACT",
  PUBLICATIONS: "PUBLICATIONS",
  EDUCATION: "EDUCATION",
  EXPERTISE: "EXPERTISE",
};

export const SECTION_ORDER = [
  SECTION_TYPES.LANDING,
  SECTION_TYPES.ABOUT,
  SECTION_TYPES.HISTORY,
  SECTION_TYPES.PUBLICATIONS,
  SECTION_TYPES.SKILLS,
  SECTION_TYPES.TIMELINE,
  SECTION_TYPES.EXPERTISE,
  SECTION_TYPES.EDUCATION,
  SECTION_TYPES.PROJECTS,
  SECTION_TYPES.CONTACT,
];

export const SECTION_TYPE_VS_NAME = {
  [SECTION_TYPES.ABOUT]: "Research",
  [SECTION_TYPES.SKILLS]: "Skills",
  [SECTION_TYPES.TIMELINE]: "Experience",
  [SECTION_TYPES.PROJECTS]: "Projects",
  [SECTION_TYPES.CONTACT]: "Contact",
  [SECTION_TYPES.PUBLICATIONS]: "Publications",
  [SECTION_TYPES.EDUCATION]: "Education",
  [SECTION_TYPES.EXPERTISE]: "Methods & tools",
};

// Each section's address on the page (#publications): its name, lowercased
export const SECTION_TYPE_VS_ID = {
  ...Object.fromEntries(Object.entries(SECTION_TYPE_VS_NAME).map(([type, name]) => [type, name.toLowerCase()])),
  [SECTION_TYPES.LANDING]: "top",
  [SECTION_TYPES.HISTORY]: "affiliations",
  [SECTION_TYPES.EXPERTISE]: "methods",
};

export const PRIMARY_COLOR = "#fbb13c"

// Same family as body in index.css, so antd components don't bring their own
export const FONT_STACK = "'Newsreader', Georgia, serif";
