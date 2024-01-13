import React, {memo} from 'react';

import cx from "classnames";
import _map from "lodash/map";

import text from 'text';

import styles from './Skills.module.scss';
import {SECTION_TYPE_VS_NAME} from "constants.js";
import SkillCard from "./SkillCard";

function Skills({className, sectionRef, sectionHeadingClassName}) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            <div className={cx(sectionHeadingClassName, styles.sectionHeading)}>
                {SECTION_TYPE_VS_NAME['SKILLS']}
            </div>
            <div className={styles.skillsGrid}>
                {_map(text.skills, (skill, idx) => (
                <SkillCard
                    key={idx}
                    idx={idx}
                    {...skill}
                />
            ))}
            </div>
        </div>
    );
}

Skills.propTypes = {};

export default memo(Skills);