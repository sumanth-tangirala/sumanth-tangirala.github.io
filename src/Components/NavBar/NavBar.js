import React, {useCallback} from 'react';
import cx from 'classnames';
import { Button } from 'antd';

import basicData from 'text/text.json';

import styles from './navBar.module.scss';
import {SECTION_TYPES} from "../../constants";


function NavBar({className, navBarRef, handleNavigation}) {
    const onNavigateToLanding = useCallback(() => {
        handleNavigation(SECTION_TYPES.LANDING)
    }, [handleNavigation]);

    const onNavigateToAbout = useCallback(() => {
        handleNavigation(SECTION_TYPES.ABOUT)
    }, [handleNavigation]);

    const onNavigateToSkills = useCallback(() => {
        handleNavigation(SECTION_TYPES.SKILLS)
    }, [handleNavigation]);

    const onNavigateToTimeline = useCallback(() => {
        handleNavigation(SECTION_TYPES.TIMELINE)
    }, [handleNavigation]);

    const onNavigateToProjects = useCallback(() => {
        handleNavigation(SECTION_TYPES.PROJECTS)
    }, [handleNavigation]);

    const onNavigateToContact = useCallback(() => {
        handleNavigation(SECTION_TYPES.CONTACT)
    }, [handleNavigation]);

    return (
        <div className={cx(styles.container, className)} ref={navBarRef}>
            <div className={styles.name} onClick={onNavigateToLanding}>
                {basicData.name}
            </div>
            <div className={styles.actions}>
                <Button type="link" onClick={onNavigateToAbout} className={styles.navBarItem}>About</Button>
                <Button type="link" onClick={onNavigateToSkills} className={styles.navBarItem}>Skills</Button>
                <Button type="link" onClick={onNavigateToTimeline} className={styles.navBarItem}>Timeline</Button>
                <Button type="link" onClick={onNavigateToProjects} className={styles.navBarItem}>Projects</Button>
                <Button type="link" onClick={onNavigateToContact} className={styles.navBarItem}>Contact</Button>
                <Button type="link" className={styles.navBarItem}>Resume</Button>
            </div>
        </div>
    );
}

NavBar.propTypes = {

};

NavBar.defaultProps = {
    handleNavigation: () => {},
};



export default NavBar;