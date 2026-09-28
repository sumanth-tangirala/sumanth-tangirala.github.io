import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import NavBar from "../NavBar";
import NameFlight from "../NameFlight";
import AppBody from "../AppBody";
import PageRobot from "../PageRobot";

import { SECTION_TYPES, SECTION_TYPE_VS_ID } from "../../constants";
import styles from "./basePage.module.scss";

BasePage.propTypes = {};

function BasePage() {
  const navBarRef = useRef();
  const landingNameRef = useRef();
  const navNameRef = useRef();

  const landingSectionRef = useRef();
  const historySectionRef = useRef();
  const aboutSectionRef = useRef();
  const skillsSectionRef = useRef();
  const timelineSectionRef = useRef();
  const projectsSectionRef = useRef();
  const contactSectionRef = useRef();
  const publicationsSectionRef = useRef();
  const educationSectionRef = useRef();
  const expertiseSectionRef = useRef();

  // The nav pill, and the nav's own name (shown once the flying name lands)
  const [navState, setNavState] = useState({ pill: false, name: false });

  const sectionRefs = useMemo(
    () => ({
      [SECTION_TYPES.LANDING]: landingSectionRef,
      [SECTION_TYPES.HISTORY]: historySectionRef,
      [SECTION_TYPES.ABOUT]: aboutSectionRef,
      [SECTION_TYPES.SKILLS]: skillsSectionRef,
      [SECTION_TYPES.TIMELINE]: timelineSectionRef,
      [SECTION_TYPES.PROJECTS]: projectsSectionRef,
      [SECTION_TYPES.CONTACT]: contactSectionRef,
      [SECTION_TYPES.PUBLICATIONS]: publicationsSectionRef,
      [SECTION_TYPES.EDUCATION]: educationSectionRef,
      [SECTION_TYPES.EXPERTISE]: expertiseSectionRef,
    }),
    [],
  );

  // Scroll to a section, and put its address in the URL so the place can be
  // shared (the top keeps a clean URL)
  const onNavigation = useCallback(
    (section) => {
      const sectionRef = sectionRefs[section];
      sectionRef.current.scrollIntoView({ behavior: "smooth" });
      const hash = section === SECTION_TYPES.LANDING ? "" : `#${SECTION_TYPE_VS_ID[section]}`;
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
    },
    [sectionRefs],
  );

  // Opened at a section's address (#publications): start there
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const section = id && Object.keys(SECTION_TYPE_VS_ID).find((type) => SECTION_TYPE_VS_ID[type] === id);
    if (section && sectionRefs[section].current) sectionRefs[section].current.scrollIntoView();
  }, [sectionRefs]);

  return (
    <>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <NavBar
        navBarRef={navBarRef}
        navNameRef={navNameRef}
        handleNavigation={onNavigation}
        showPill={navState.pill}
        showName={navState.name}
      />
      <NameFlight
        heroNameRef={landingNameRef}
        navNameRef={navNameRef}
        navBarRef={navBarRef}
        onStateChange={setNavState}
      />
      {/* Before the sections, which rely on :last-child for the page's end */}
      <PageRobot sectionRefs={sectionRefs} />
      <AppBody
        sectionRefs={sectionRefs}
        landingNameRef={landingNameRef}
        handleNavigation={onNavigation}
      />
    </>
  );
}

export default BasePage;
