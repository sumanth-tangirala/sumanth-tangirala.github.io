import React from 'react';

import cx from "classnames";

import text from 'text/text.json';

import _map from "lodash/map";

import styles from './Skills.module.scss';

function Skill({
    title,
    desc,
    imgPath,
}) {
    return (
        <div className={styles.skillContainer}>
            <img src={imgPath} className={styles.skillImg} alt=""/>
            <span className={styles.skillTitle}>{title}</span>
            <span className={styles.skillDescription}>{desc}</span>
        </div>
    )
}

function Skills({className, sectionRef, sectionHeadingClassName}) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            <div className={cx(sectionHeadingClassName, styles.sectionHeading)}>
                Skills
            </div>
            <div className={styles.skillsGrid}>
                {_map(text.skills, (skill, idx) => (
                <Skill
                    key={idx}
                    title={skill.title}
                    desc={skill.description}
                    imgPath={skill.imgPath}
                />
            ))}
            </div>
        </div>
    );
}

Skills.propTypes = {};

export default Skills;