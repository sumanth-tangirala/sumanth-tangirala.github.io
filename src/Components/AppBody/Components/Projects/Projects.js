import React from 'react';
import cx from "classnames";

import _map from "lodash/map";

import text from 'text/text.json';

import CardToPopover from "../../../CardToModal";

import styles from './Projects.module.scss';

function Projects({className, sectionRef}) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            {_map(text.projects, (projectDetails, index) => (
                <CardToPopover
                    title={projectDetails.title}
                    description={projectDetails.description}
                    imgPath={projectDetails.imgPath}
                    key={index}
                />
            ))}
        </div>
    );
}

Projects.propTypes = {};

export default Projects;