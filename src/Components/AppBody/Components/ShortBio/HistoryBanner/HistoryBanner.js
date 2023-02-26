import React from 'react';
import PropTypes from 'prop-types';

import styles from './historyBanner.module.scss';
import cx from "classnames";

function HistoryBanner({}) {
    return (
        <div className={cx(styles.container)}>
            <div>DAIICT</div>
            <div>ISRO</div>
            <div>TEKION</div>
            <div>RUTGERS</div>
        </div>
    );
}

HistoryBanner.propTypes = {};

export default HistoryBanner;