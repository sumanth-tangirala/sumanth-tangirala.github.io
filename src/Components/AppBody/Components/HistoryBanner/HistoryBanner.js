import React, {memo, useMemo} from 'react';

import _map from 'lodash/map';

import text from 'text';

import styles from './historyBanner.module.scss';
import cx from "classnames";

function HistoryBanner({className, sectionRef}) {
    const images = text.historyBannerImages;

    const imagesComponents = useMemo(() => _map(images, (imageDetails) => {
        return (
            <img src={imageDetails.path} className={styles.image} alt={imageDetails.text} key={imageDetails.text}/>
        )
    }), [images]);

    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            {imagesComponents}
        </div>
    );
}

HistoryBanner.propTypes = {};

export default memo(HistoryBanner);