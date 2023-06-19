import React from 'react';

import styles from './About.module.scss';
import cx from "classnames";
import HistoryBanner from "./HistoryBanner";
import text from "../../../../text/text.json";

function About({ className, sectionRef }) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            <HistoryBanner />
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