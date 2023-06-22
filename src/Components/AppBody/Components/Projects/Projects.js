import React from 'react';
import cx from "classnames";

import _map from "lodash/map";

import text from 'text/text.json';

import CardToModal from "../../../CardToModal";

import styles from './Projects.module.scss';

function Projects({className, sectionRef}) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            <span className={styles.sectionHeading}>
                Projects
            </span>
            <div className={styles.projectsGrid}>
                {_map(text.projects, (projectDetails, index) => (
                <CardToModal
                    title={projectDetails.title}
                    shortDesc={projectDetails.shortDesc}
                    longDesc={projectDetails.longDesc}
                    imgPath={projectDetails.imgPath}
                    key={index}
                />
            ))}
            </div>
        </div>
    );
}

Projects.propTypes = {};

export default Projects;