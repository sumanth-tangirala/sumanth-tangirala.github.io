import React from 'react';
import PropTypes from 'prop-types';

import styles from './ContactMe.module.scss';
import cx from "classnames";

function ContactMe({className}) {
    return (
        <div className={cx(styles.container, className)}>Contact Me</div>
    );
}

ContactMe.propTypes = {};

export default ContactMe;