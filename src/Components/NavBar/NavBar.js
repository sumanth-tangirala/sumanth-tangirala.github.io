import React, {useCallback} from 'react';
import cx from 'classnames';
import { Button } from 'antd';

import styles from './navBar.module.scss';
import {SECTION_TYPES} from "../../constants";


function NavBar({className, navBarRef, handleNavigation}) {
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
            <Button type="link" onClick={onNavigateToAbout}>About</Button>
            <Button type="link" onClick={onNavigateToSkills}>Skills</Button>
            <Button type="link" onClick={onNavigateToTimeline}>Timeline</Button>
            <Button type="link" onClick={onNavigateToProjects}>Projects</Button>
            <Button type="link" onClick={onNavigateToContact}>Contact</Button>
            Resume
        </div>
    );
}

NavBar.propTypes = {

};

NavBar.defaultProps = {
    handleNavigation: () => {},
};



export default NavBar;