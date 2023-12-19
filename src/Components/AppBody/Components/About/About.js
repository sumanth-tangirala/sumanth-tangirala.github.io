import React, {memo} from 'react';
import {parse} from "helpers";

import text from 'text';
import styles from './About.module.scss';
import cx from "classnames";
import _map from "lodash/map";

function About({ className, sectionRef }) {
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            <img
                src={text.aboutPicturePath}
                className={styles.image}
                alt=""
            />
            <div className={styles.text}>
                <span className={styles.name}>{parse(text.name)}</span>
                <div className={styles.qualifications}>{
                      _map(text.qualifications, (qual, idx) => (
                          <div key={idx}>
                              {parse(qual)}
                          </div>
                      )
                    )

                }</div>
                <div className={styles.aboutParagraphs}>
                    {_map(text.about, (paragraph, idx) => (
                        <span className={styles.aboutParagraphItem} key={idx}>
                            {parse(paragraph)}
                        </span>
                    ))}
                </div>
                <div className={styles.qualificationDetails}>
                    {_map(text.qualificationDetails, (qualificationDetail, idx) => (
                        <span className={styles.qualificationDetailItem} key={idx}>
                            {parse(qualificationDetail)}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

About.propTypes = {};

export default memo(About);