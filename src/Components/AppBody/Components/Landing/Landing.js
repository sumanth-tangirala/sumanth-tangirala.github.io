import React from 'react';
import text from 'text/text.json';
import styles from './landing.module.scss';
import cx from "classnames";
import Name from "../../../Name";

function Landing({className, sectionRef}) {
    return (
        <div className={cx(styles.landing, className)} ref={sectionRef}>
            <div className={styles.container}>
                <img src={text.picturePath} className={styles.image}/>
                <Name />
                <div className={styles.tagline}>{text.tagline}</div>
            </div>
        </div>
    );
}

export default Landing;