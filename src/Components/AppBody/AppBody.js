import React, {useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import createScrollSnap from 'scroll-snap'

import Landing from "./Components/Landing";
import Skills from "./Components/Skills";
import Timeline from "./Components/Timeline";
import PersonalProjects from "./Components/PersonalProjects";
import ShortBio from "./Components/ShortBio";
import ContactMe from "./Components/ContactMe";

import styles from "./appBody.module.scss";

AppBody.propTypes = {

};

function AppBody({className, handleScroll, appBodyRef}) {
    return (
        <div
            className={cx(styles.appBody, className)}
            onScroll={handleScroll}
            ref={appBodyRef}
        >
            <Landing className={styles.childSection}/>
            <ShortBio className={styles.childSection}/>
            <Skills className={styles.childSection}/>
            <Timeline className={styles.childSection}/>
            <PersonalProjects className={styles.childSection}/>
            <ContactMe className={styles.childSection}/>
        </div>
    );
}

export default AppBody;