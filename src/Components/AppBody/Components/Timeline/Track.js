import React, { memo } from "react";
import cx from "classnames";
import styles from "./Timeline.module.scss";
import _map from "lodash/map";
import range from "lodash/range";

function parseDate(dateStr) {
    if (dateStr === "present" || dateStr === "now" || dateStr === "Now") {
        return new Date();
    }
    // The string is expected in YYYY-MM-DD format
    return new Date(dateStr);
}

function Track({ items, activeId, onHover }) {
    const now = new Date();
    // Determine the earliest start date across all items
    const earliestStartDate = items.reduce((min, item) => {
        const start = parseDate(item.startDate);
        return start < min ? start : min;
    }, now);

    // Begin the timeline at the start of the earliest year to ensure the final label fits
    const timelineStartDate = new Date(earliestStartDate.getFullYear(), 0, 1);

    // Total duration is measured from the start of the earliest year to now
    const totalDurationMs = now.getTime() - timelineStartDate.getTime();

    const getYPercent = (date) => {
        const diff = now.getTime() - date.getTime();
        return (diff / totalDurationMs) * 100;
    };

    return (
        <div className={styles.trackWrapper}>
            <div className={styles.yearAxis} />

            {/* Year labels */}
            {_map(range(now.getFullYear(), timelineStartDate.getFullYear() - 1, -1), (year) => {
                const yDate = new Date(year, 0, 1);
                // Clamp the position so the last label does not overflow the container
                const top = Math.min(getYPercent(yDate), 99);
                return (
                    <div
                        key={`label-${year}`}
                        className={styles.yearLabel}
                        style={{ top: `${top}%` }}
                    >
                        {year}
                    </div>
                );
            })}

            {_map(items, (item, idx) => {
                const startDate = parseDate(item.startDate);
                const endDate = parseDate(item.endDate);
                const top = getYPercent(endDate);
                const bottom = getYPercent(startDate);
                const height = bottom - top;
                const gapPercent = 100 / (items.length + 1);
                const leftPercent = gapPercent * (items.length - idx);

                return (
                    <div
                        key={item.id}
                        className={cx(styles.bar, {
                            [styles.isHighlighted]: activeId === item.id,
                        })}
                        style={{
                            top: `${top}%`,
                            height: `${height}%`,
                            left: `${leftPercent}%`,
                            backgroundColor: item.color,
                        }}
                        onMouseEnter={() => onHover(item.id)}
                        onMouseLeave={() => onHover(null)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${item.title}: ${item.startDate} – ${item.endDate}`}
                    />
                );
            })}
        </div>
    );
}

export default memo(Track); 