import React from 'react';

import styles from './Skills.module.scss';
import cx from "classnames";

function Skills({className, sectionRef}) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>Skills</div>
    );
}

Skills.propTypes = {};

export default Skills;