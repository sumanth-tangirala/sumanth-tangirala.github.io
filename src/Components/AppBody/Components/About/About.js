import React, { memo } from "react";
import { parse } from "helpers";

import text from "text";
import styles from "./About.module.scss";
import cx from "classnames";
import _map from "lodash/map";
import _isEmpty from "lodash/isEmpty";
import { SECTION_TYPES, SECTION_TYPE_VS_NAME } from "../../../../constants";

function About({ className, sectionRef, sectionProps, sectionHeadingClassName }) {
  return (
    <div className={cx(styles.container, className)} ref={sectionRef} {...sectionProps}>
      <h2 className={sectionHeadingClassName}>{SECTION_TYPE_VS_NAME[SECTION_TYPES.ABOUT]}</h2>
      <div className={styles.topSection}>
        <div className={styles.text}>
          {!_isEmpty(text.qualifications) && (
            <div className={styles.qualifications}>
              {_map(text.qualifications, (qual, idx) => (
                <div key={idx}>{parse(qual)}</div>
              ))}
            </div>
          )}
          <div className={styles.aboutParagraphs}>
            {_map(text.about, (paragraph, idx) => (
              <p className={styles.aboutParagraphItem} key={idx}>
                {parse(paragraph)}
              </p>
            ))}
          </div>
          {text.currently && (
            <div className={styles.currently}>
              <span className={styles.currentlyLabel}>Currently</span>
              {/* One line each, so a wrap never leaves a separator dangling */}
              <div>
                {text.currently.map((line) => (
                  <p key={line} className={styles.currentlyLine}>
                    {parse(line)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

About.propTypes = {};

export default memo(About);
