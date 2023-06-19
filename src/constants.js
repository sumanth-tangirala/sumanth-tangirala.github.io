import Landing from "./Components/AppBody/Components/Landing";
import About from "./Components/AppBody/Components/About";
import Skills from "./Components/AppBody/Components/Skills";
import Timeline from "./Components/AppBody/Components/Timeline";
import Projects from "./Components/AppBody/Components/Projects";
import ContactMe from "./Components/AppBody/Components/ContactMe";

export const SECTION_TYPES = {
    LANDING: 'LANDING',
    ABOUT: 'ABOUT',
    SKILLS: 'SKILLS',
    TIMELINE: 'TIMELINE',
    PROJECTS: 'PROJECTS',
    CONTACT: 'CONTACT',
}

export const SECTION_ORDER = [
    SECTION_TYPES.LANDING,
    SECTION_TYPES.ABOUT,
    SECTION_TYPES.SKILLS,
    SECTION_TYPES.TIMELINE,
    SECTION_TYPES.PROJECTS,
    SECTION_TYPES.CONTACT,
]

export const SECTION_TYPE_VS_NAME = {
    [SECTION_TYPES.ABOUT]: 'About',
    [SECTION_TYPES.SKILLS]: 'Skills',
    [SECTION_TYPES.TIMELINE]: 'Timeline',
    [SECTION_TYPES.PROJECTS]: 'Projects',
    [SECTION_TYPES.CONTACT]: 'Contact',
}