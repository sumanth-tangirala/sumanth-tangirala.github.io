import React from 'react';

import styles from './landing.module.scss';
import cx from "classnames";

function Landing({className}) {
    return (
        <div className={cx(styles.landing, className)}></div>
    );
}

export default Landing;