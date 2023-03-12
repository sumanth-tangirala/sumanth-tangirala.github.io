import React from 'react';
import cx from 'classnames';

import Landing from "./Components/Landing";
import Skills from "./Components/Skills";
import Timeline from "./Components/Timeline";
import Projects from "./Components/Projects";
import About from "./Components/About";
import ContactMe from "./Components/ContactMe";

import styles from "./appBody.module.scss";
import {SECTION_TYPES} from "../../constants";
import Name from "../Name";
import {ParallaxProvider} from "react-scroll-parallax";

AppBody.propTypes = {

};

function AppBody({className, handleScroll, appBodyRef, sectionRefs}) {
    return (
        <ParallaxProvider scrollContainer={appBodyRef.current}>
            <div
                className={cx(styles.appBody, className)}
                onScroll={handleScroll}
                ref={appBodyRef}
            >
                    <Name />
                    <Landing className={styles.childSection} sectionRef={sectionRefs[SECTION_TYPES.LANDING]}/>
                    <About className={styles.childSection} sectionRef={sectionRefs[SECTION_TYPES.ABOUT]}/>
                    <Skills className={styles.childSection} sectionRef={sectionRefs[SECTION_TYPES.SKILLS]}/>
                    <Timeline className={styles.childSection} sectionRef={sectionRefs[SECTION_TYPES.TIMELINE]}/>
                    <Projects className={styles.childSection} sectionRef={sectionRefs[SECTION_TYPES.PROJECTS]}/>
                    <ContactMe className={styles.childSection} sectionRef={sectionRefs[SECTION_TYPES.CONTACT]}/>
            </div>
        </ParallaxProvider>
    );
}

export default AppBody;