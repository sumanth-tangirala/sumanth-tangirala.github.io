import React, { memo } from "react";
import cx from "classnames";
import styles from "./Timeline.module.scss";

function formatDate(dateStr) {
    if (dateStr === "present") {
        return "Present";
    }
    const date = new Date(dateStr);
    return date.toLocaleString("default", { month: "short", year: "numeric" });
}

function TimelineCard({ item, activeId, onHover }) {
    return (
        <div
            className={cx(styles.card, { [styles.isHighlighted]: activeId === item.id })}
            onMouseEnter={() => onHover(item.id)}
            onMouseLeave={() => onHover(null)}
            style={{ "--item-color": item.color }}
            role="button"
            tabIndex={0}
            aria-label={`${item.title} timeline card`}
        >
            <div
                className={styles.cardImageContainer}
            >
                <img
                    src={item.imgPath}
                    alt={item.title}
                    className={styles.cardImage}
                />
            </div>
            <div className={styles.cardDetails}>
                <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>{item.title}</span>
                    <span className={styles.cardDates}>
                        {formatDate(item.startDate)} – {formatDate(item.endDate)}
                    </span>
                </div>
                <div className={styles.cardBody}>
                    <p>{item.desc}</p>
                </div>
            </div>
        </div>
    );
}

export default memo(TimelineCard); 