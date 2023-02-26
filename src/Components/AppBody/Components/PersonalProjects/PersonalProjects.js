import React from 'react';
import PropTypes from 'prop-types';

import styles from './PersonalProjects.module.scss';
import cx from "classnames";

function PersonalProjects({className}) {
    return (
        <div className={cx(styles.container, className)}>Personal Projects</div>
    );
}

PersonalProjects.propTypes = {};

export default PersonalProjects;