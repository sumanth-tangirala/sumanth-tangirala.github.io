import React from 'react';

import text from "text/text.json";
import styles from './About.module.scss';
import cx from "classnames";

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
                    Short Bio
                </div>
            </div>
        </div>
    );
}

About.propTypes = {};

export default About;