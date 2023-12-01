import React from 'react';

import text from 'text';
import styles from './About.module.scss';
import cx from "classnames";
import _map from "lodash/map";

function About({ className, sectionRef }) {
    return (
        <div className={cx(styles.container)} ref={sectionRef}>
            <div className={styles.about}>
                <img
                    src={text.aboutPicturePath}
                    className={styles.image}
                    alt=""
                />
                <div className={styles.text}>
                    <span className={styles.name}>{text.name}</span>
                    <div className={styles.qualifications}>{
                          _map(text.qualifications, (qual, idx) => (
                              <div key={idx}>
                                  {qual}
                              </div>
                          )
                        )

                    }</div>
                    <div className={styles.aboutParagraphs}>
                        {_map(text.about, (paragraph, idx) => (
                            <span className={styles.aboutParagraphItem} key={idx}>
                                {paragraph}
                            </span>
                        ))}
                    </div>
                    <div className={styles.qualificationDetails}>
                        {_map(text.qualificationDetails, (qualificationDetail, idx) => (
                            <span className={styles.qualificationDetailItem} key={idx}>
                                {qualificationDetail}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

About.propTypes = {};

export default About;