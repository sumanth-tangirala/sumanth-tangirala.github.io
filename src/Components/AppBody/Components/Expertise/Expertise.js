import React, { memo } from "react";
import cx from "classnames";
import text from "text";
import { SECTION_TYPES, SECTION_TYPE_VS_NAME } from "../../../../constants";
import styles from "./Expertise.module.scss";

// Methods and tools he has worked with, by area (each traces to a paper or a role)
function Expertise({ className, sectionRef, sectionProps, sectionHeadingClassName }) {
  return (
    <div className={cx(styles.container, className)} ref={sectionRef} {...sectionProps}>
      <h2 className={sectionHeadingClassName}>{SECTION_TYPE_VS_NAME[SECTION_TYPES.EXPERTISE]}</h2>
      <dl className={styles.card}>
        {text.expertise.map(({ label, items }) => (
          <div className={styles.row} key={label}>
            <dt className={styles.label}>{label}</dt>
            <dd className={styles.items}>
              {/* Lines break between items (after the dot), and inside one only
                  if it is wider than the column */}
              {items.map((item, i) => (
                <React.Fragment key={item}>
                  <span className={styles.item}>
                    {item}
                    {i < items.length - 1 && "\u00a0·"}
                  </span>{" "}
                </React.Fragment>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default memo(Expertise);
