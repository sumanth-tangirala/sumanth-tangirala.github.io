import React from 'react';
import PropTypes from 'prop-types';

import styles from './Timeline.module.scss';
import cx from "classnames";

function Timeline({className}) {
    return (
        <div className={cx(styles.container, className)}>Timeline</div>
    );
}

Timeline.propTypes = {};

export default Timeline;