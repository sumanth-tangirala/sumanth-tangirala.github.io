import React, { useCallback, useMemo, useRef, useEffect, useState } from "react";

import NavBar from "../NavBar";
import AppBody from "../AppBody";

import { SECTION_TYPES } from "../../constants";

BasePage.propTypes = {};

const SECTION_TYPE_VS_SECTION_TYPE_TO_SCROLL_TO = {
  [SECTION_TYPES.ABOUT]: SECTION_TYPES.HISTORY,
};

function BasePage() {
  const navBarRef = useRef();
  const landingNameRef = useRef();

  const landingSectionRef = useRef();
  const historySectionRef = useRef();
  const aboutSectionRef = useRef();
  const skillsSectionRef = useRef();
  const timelineSectionRef = useRef();
  const projectsSectionRef = useRef();
  const contactSectionRef = useRef();
  const publicationsSectionRef = useRef();

  const [showName, setShowName] = useState(false);

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
    }),
    [],
  );

  const onNavigation = useCallback(
    (section) => {
      const sectionToScrollTo =
        SECTION_TYPE_VS_SECTION_TYPE_TO_SCROLL_TO[section] || section;
      const sectionRef = sectionRefs[sectionToScrollTo];
      sectionRef.current.scrollIntoView({ behavior: "smooth" });
    },
    [sectionRefs],
  );

  /* Observe the landing name visibility to toggle nav title */
  useEffect(() => {
    const target = landingNameRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowName(!entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [landingNameRef]);

  return (
    <>
      <NavBar
        navBarRef={navBarRef}
        handleNavigation={onNavigation}
        showName={showName}
      />
      <AppBody sectionRefs={sectionRefs} landingNameRef={landingNameRef} />
    </>
  );
}

export default BasePage;
