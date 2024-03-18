import React, { memo } from "react";
import cx from "classnames";

import _map from "lodash/map";
import _size from "lodash/size";

import text from "text";

import styles from "./Timeline.module.scss";
import { SECTION_TYPE_VS_NAME } from "../../../../constants";
import { parse } from "helpers";

function Timeline({ className, sectionRef }) {
  const timelineText = text.timeline;
  const isEven = _size(timelineText) % 2 === 0;
  return (
    <div className={cx(styles.container, className)} ref={sectionRef}>
      <div className={styles.sectionTitle}>
        {SECTION_TYPE_VS_NAME["TIMELINE"]}
      </div>
      <ul
        className={cx(styles.timeline, {
          [styles.evenCount]: isEven,
          [styles.oddCount]: !isEven,
        })}
      >
        {_map(timelineText, (event, idx) => (
          <li className={styles.event} key={idx}>
            <time className={styles.date}>
              <span className={styles.largeDate}>{parse(event.date)}</span>
              <span className={styles.miniDate}>
                <span className={styles.partMiniDate}>
                  {parse(event.miniDate[0])}
                </span>
                <span>-</span>
                <span className={styles.partMiniDate}>
                  {parse(event.miniDate[1])}
                </span>
              </span>
            </time>
            <img src={event.imgPath} className={styles.eventImg} alt="" />
            <div className={styles.eventDetails}>
              <span className={styles.eventTitle}>{parse(event.title)}</span>
              <span className={styles.eventDescription}>
                {parse(event.desc)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

Timeline.propTypes = {};

export default memo(Timeline);
