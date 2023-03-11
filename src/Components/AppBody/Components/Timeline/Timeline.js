import React from 'react';
import styles from './Timeline.module.scss';
import cx from "classnames";

function Timeline({className, sectionRef}) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>Timeline</div>
    );
}

Timeline.propTypes = {};

export default Timeline;