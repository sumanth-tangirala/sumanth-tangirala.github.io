import React, { memo } from "react";
import cx from "classnames";
import _map from "lodash/map";
import text from "text";
import { parse } from "helpers";
import { SECTION_TYPES, SECTION_TYPE_VS_NAME } from "../../../../constants";
import styles from "./Education.module.scss";

function Education({ className, sectionRef, sectionProps, sectionHeadingClassName }) {
  return (
    <div className={cx(styles.container, className)} ref={sectionRef} {...sectionProps}>
      <h2 className={sectionHeadingClassName}>{SECTION_TYPE_VS_NAME[SECTION_TYPES.EDUCATION]}</h2>
      <div className={styles.list}>
        {_map(text.educationDetails, (item) => (
          <div className={styles.item} key={item.degree}>
            {item.logo && (
              <div className={styles.logoBox}>
                <img src={item.logo} alt="" className={styles.logo} />
              </div>
            )}
            <div className={styles.body}>
              <div className={styles.header}>
                {/* Degree and school together, so phones stack degree → school → dates */}
                <div>
                  <h3 className={styles.degree}>{parse(item.degree)}</h3>
                  <div className={styles.school}>{parse(item.school)}</div>
                </div>
                <span className={styles.dates}>{item.dates}</span>
              </div>
              {_map(item.notes, (note) => (
                <p className={styles.note} key={note}>
                  {parse(note)}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(Education);
