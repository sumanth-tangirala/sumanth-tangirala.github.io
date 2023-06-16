import React, {useCallback, useMemo, useRef} from 'react';

import NavBar from "../NavBar";
import AppBody from "../AppBody";

import {SECTION_TYPES} from "../../constants";


BasePage.propTypes = {

};


function BasePage({parallaxContainerRef:appBodyRef}) {
    const navBarRef = useRef();

    const landingSectionRef=useRef();
    const aboutSectionRef = useRef();
    const skillsSectionRef = useRef();
    const timelineSectionRef = useRef();
    const projectsSectionRef = useRef();
    const contactSectionRef = useRef();

    const sectionRefs = useMemo(() => ({
        [SECTION_TYPES.LANDING]: landingSectionRef,
        [SECTION_TYPES.ABOUT]: aboutSectionRef,
        [SECTION_TYPES.SKILLS]: skillsSectionRef,
        [SECTION_TYPES.TIMELINE]: timelineSectionRef,
        [SECTION_TYPES.PROJECTS]: projectsSectionRef,
        [SECTION_TYPES.CONTACT]: contactSectionRef,
    }), [])

    const onNavigation = useCallback((section) => {
        const sectionRef = sectionRefs[section];
        sectionRef.current.scrollIntoView({ behavior: 'smooth'});
    }, [sectionRefs])

    return (
        <>
            <NavBar
                navBarRef={navBarRef}
                handleNavigation={onNavigation}
            />
            <AppBody
                appBodyRef={appBodyRef}
                sectionRefs={sectionRefs}
            />
        </>
    );
}

export default BasePage;