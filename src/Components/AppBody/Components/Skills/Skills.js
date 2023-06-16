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
            <img src={imgPath} className={styles.skillImg}/>
            <span>{title}</span>
            <span>{desc}</span>
        </div>
    )
}

function Skills({className, sectionRef, sectionHeadingClassName}) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            <div className={sectionHeadingClassName}>
                Skills
            </div>
            {_map(text.skills, skill => (
                <Skill
                    title={skill.title}
                    desc={skill.description}
                    imgPath={skill.imgPath}
                />
            ))}
        </div>
    );
}

Skills.propTypes = {};

export default Skills;