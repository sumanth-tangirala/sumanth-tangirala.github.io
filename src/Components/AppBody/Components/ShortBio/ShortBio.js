import React from 'react';
import PropTypes from 'prop-types';

import styles from './ShortBio.module.scss';
import cx from "classnames";
import HistoryBanner from "./HistoryBanner";

function ShortBio({ className }) {
    return (
        <div className={cx(styles.container, className)}>
            <HistoryBanner />
            <div className={styles.text}>
                Short Bio
            </div>
        </div>
    );
}

ShortBio.propTypes = {};

export default ShortBio;