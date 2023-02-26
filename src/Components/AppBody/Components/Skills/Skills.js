import React from 'react';
import PropTypes from 'prop-types';

import styles from './Skills.module.scss';
import cx from "classnames";

function Skills({className}) {
    return (
        <div className={cx(styles.container, className)}>Skills</div>
    );
}

Skills.propTypes = {};

export default Skills;