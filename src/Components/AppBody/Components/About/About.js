import React from 'react';

import text from "text/text.json";
import styles from './About.module.scss';
import cx from "classnames";
import _map from "lodash/map";

function About({ className, sectionRef }) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            <div className={styles.about}>
                <img
                    src={text.picturePath}
                    className={styles.image}
                    alt=""
                />
                <div className={styles.text}>
                    <span className={styles.name}>{text.name}</span>
                    <span className={styles.qualifications}>{text.qualifications}</span>
                    <div className={styles.aboutParagraphs}>
                        {_map(text.about, paragraph => (
                            <span className={styles.aboutParagraphItem}>
                                {paragraph}
                            </span>
                        ))}
                    </div>
                    <div className={styles.qualificationDetails}>
                        {_map(text.qualificationDetails, qualificationDetail => (
                            <span className={styles.qualificationDetailItem}>
                                {qualificationDetail}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

About.propTypes = {};

export default About;