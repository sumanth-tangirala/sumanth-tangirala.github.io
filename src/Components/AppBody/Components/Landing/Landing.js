import React from 'react';
import text from 'text/text.json';
import styles from './landing.module.scss';
import cx from "classnames";
import basicData from "../../../../text/text.json";

function Landing({className, sectionRef}) {
    return (
        <div className={cx(styles.landing, className)} ref={sectionRef}>
            <div className={styles.container}>
                <img src={text.landingPicturePath} className={styles.image} alt=""/>
                <div
                    className={styles.name}
                >
                    {basicData.name}
                </div>
                <div className={styles.tagline}>{text.tagline}</div>
            </div>
        </div>
    );
}

export default Landing;