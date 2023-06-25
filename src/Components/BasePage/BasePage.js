import React, {useCallback, useMemo, useRef} from 'react';

import NavBar from "../NavBar";
import AppBody from "../AppBody";

import {SECTION_TYPES} from "../../constants";

import styles from './basePage.module.scss';

BasePage.propTypes = {

};


function BasePage() {
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
        console.log(section);
        const sectionRef = sectionRefs[section];
        sectionRef.current.scrollIntoView({ behavior: 'smooth'});
    }, [sectionRefs])

    return (
        <div className={styles.app}>
            <NavBar
                className={styles.navBar}
                navBarRef={navBarRef}
                handleNavigation={onNavigation}
            />
            <AppBody
                sectionRefs={sectionRefs}
            />
        </div>
    );
}

export default BasePage;