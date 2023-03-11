import React from 'react';

import styles from './Projects.module.scss';
import cx from "classnames";
import CardToModal from "../../../CardToModal";

function Projects({className, sectionRef}) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            <CardToModal />
            <CardToModal />
            <CardToModal />
            <CardToModal />
            <CardToModal />
            <CardToModal />
            <CardToModal />
            <CardToModal />
        </div>
    );
}

Projects.propTypes = {};

export default Projects;