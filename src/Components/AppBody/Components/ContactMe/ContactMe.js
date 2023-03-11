import React from 'react';

import styles from './ContactMe.module.scss';
import cx from "classnames";

function ContactMe({className, sectionRef}) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>Contact Me</div>
    );
}

ContactMe.propTypes = {};

export default ContactMe;