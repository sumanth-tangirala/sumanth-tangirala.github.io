import React, { memo, useState, useCallback } from "react";
import cx from "classnames";
import styles from "./Timeline.module.scss";
import _map from "lodash/map";
import _sortBy from "lodash/sortBy";
import text from "text";
import { SECTION_TYPE_VS_NAME } from "../../../../constants";
import Track from "./Track";
import TimelineCard from "./TimelineCard";

function Timeline({ className, sectionRef, sectionHeadingClassName }) {
  const timelineItems = _sortBy(text.timeline, (item) => item.startDate).reverse();

  const [activeId, setActiveId] = useState(null);

  const handleHover = useCallback((id) => {
    setActiveId(id);
  }, []);

  return (
    <div className={cx(className, styles.sectionContainer)} ref={sectionRef}>
      <div className={sectionHeadingClassName}>
        {SECTION_TYPE_VS_NAME["TIMELINE"]}
      </div>
      <div className={styles.timelineGrid}>
        <Track items={timelineItems} activeId={activeId} onHover={handleHover} />
        <div className={styles.cardColumn}>
          {_map(timelineItems, (item) => (
            <TimelineCard
              key={item.id}
              item={item}
              activeId={activeId}
              onHover={handleHover}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(Timeline);
