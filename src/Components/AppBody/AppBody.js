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
import _map from "lodash/map";

AppBody.propTypes = {

};

const sections = [
    {
        Component: Landing,
        sectionType: SECTION_TYPES.LANDING,
    },
    {
        Component: About,
        sectionType: SECTION_TYPES.ABOUT,
    },
    {
        Component: Skills,
        sectionType: SECTION_TYPES.SKILLS,
    },
    {
        Component: Timeline,
        sectionType: SECTION_TYPES.TIMELINE,
    },
    {
        Component: Projects,
        sectionType: SECTION_TYPES.PROJECTS,
    },
    {
        Component: ContactMe,
        sectionType: SECTION_TYPES.CONTACT,
    },
]

function AppBody({appBodyRef, sectionRefs}) {
    return (
        <div ref={appBodyRef} className={styles.appBodyContainer}>
            {_map(sections, ({Component, sectionType}) => (
                <Component
                    key={sectionType}
                    className={styles.childSection}
                    sectionRef={sectionRefs[sectionType]}
                    sectionHeadingClassName={styles.sectionHeading}
                />
            ))}
        </div>

    );
}

export default AppBody;