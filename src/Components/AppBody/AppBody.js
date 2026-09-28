import React, { memo } from "react";

import Landing from "./Components/Landing";
import Skills from "./Components/Skills";
import Timeline from "./Components/Timeline";
import Projects from "./Components/Projects";
import About from "./Components/About";
import ContactMe from "./Components/ContactMe";
import HistoryBanner from "./Components/HistoryBanner";
import text from "text";

import styles from "./appBody.module.scss";
import { SECTION_TYPES, SECTION_ORDER, SECTION_TYPE_VS_ID, SECTION_TYPE_VS_NAME } from "../../constants";
import _map from "lodash/map";
import Publications from "./Components/Publications";
import Education from "./Components/Education";
import Expertise from "./Components/Expertise";

const SECTION_TYPE_VS_COMPONENT = {
  [SECTION_TYPES.LANDING]: Landing,
  [SECTION_TYPES.HISTORY]: HistoryBanner,
  [SECTION_TYPES.ABOUT]: About,
  [SECTION_TYPES.SKILLS]: Skills,
  [SECTION_TYPES.PUBLICATIONS]: Publications,
  [SECTION_TYPES.TIMELINE]: Timeline,
  [SECTION_TYPES.PROJECTS]: Projects,
  [SECTION_TYPES.EDUCATION]: Education,
  [SECTION_TYPES.EXPERTISE]: Expertise,
  [SECTION_TYPES.CONTACT]: ContactMe,
};

// Determine visible sections at runtime based on `text.hiddenSections`
const getVisibleSections = () => {
  const hidden = text.hiddenSections || [];
  return SECTION_ORDER.filter((sectionType) => !hidden.includes(sectionType));
};

const sections = _map(getVisibleSections(), (sectionType) => ({
  Component: SECTION_TYPE_VS_COMPONENT[sectionType],
  sectionType,
}));

// Each section is a labelled region, at its own address (#publications)
const SECTION_LABELS = {
  ...SECTION_TYPE_VS_NAME,
  [SECTION_TYPES.LANDING]: "Introduction",
  [SECTION_TYPES.HISTORY]: "Affiliations",
};
const sectionPropsOf = (sectionType) => ({
  id: SECTION_TYPE_VS_ID[sectionType],
  role: "region",
  "aria-label": SECTION_LABELS[sectionType],
});

const AppBody = memo(({ sectionRefs, landingNameRef, handleNavigation }) => {
  return (
    // The skip link's target (focusable so focus lands in it)
    <main id="main" tabIndex={-1} className={styles.main}>
      {_map(sections, ({ Component, sectionType }) => (
        <Component
          key={sectionType}
          className={styles.childSection}
          sectionRef={sectionRefs[sectionType]}
          sectionProps={sectionPropsOf(sectionType)}
          sectionHeadingClassName={styles.sectionHeading}
          {
          ...(sectionType === SECTION_TYPES.LANDING
            ? { nameRef: landingNameRef, handleNavigation }
            : {})
          }
        />
      ))}
    </main>
  );
});

export default AppBody;
