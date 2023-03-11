import React from 'react';

import styles from './historyBanner.module.scss';
import cx from "classnames";

function HistoryBanner(props) {
    return (
        <div className={cx(styles.container)}>
            <div>DAIICT</div>
            <div>ISRO</div>
            <div>Center of WIMS2 UMich</div>
            <div>TEKION</div>
            <div>RUTGERS</div>
        </div>
    );
}

HistoryBanner.propTypes = {};

export default HistoryBanner;