import React, {memo} from 'react';
import styles from './landing.module.scss';
import cx from "classnames";
import basicData from 'text';

function Landing({className, sectionRef}) {
    return (
        <div className={cx(styles.landing, className)} ref={sectionRef}>
            <div className={styles.container}>
                <img src={basicData.landingPicturePath} className={styles.image} alt={basicData.name}/>
                <div
                    className={cx(styles.name)}
                >
                    {basicData.name}
                </div>
                <div className={styles.tagline}>{basicData.tagline}</div>
            </div>
        </div>
    );
}

export default memo(Landing);