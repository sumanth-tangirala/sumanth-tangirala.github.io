import React from 'react';

import styles from './landing.module.scss';
import cx from "classnames";

function Landing({className, sectionRef}) {
    return (
        <div className={cx(styles.landing, className)} ref={sectionRef}></div>
    );
}

export default Landing;