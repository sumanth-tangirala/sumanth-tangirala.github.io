import React, { memo } from "react";
import cx from "classnames";
import styles from "./Timeline.module.scss";
import { parse } from "../../../../helpers";

function formatDate(dateStr) {
    if (dateStr === "present") {
        return "Present";
    }
    const date = new Date(dateStr);
    return date.toLocaleString("default", { month: "short", year: "numeric" });
}

function TimelineCard({ item, activeId, onHover }) {
    return (
        <article
            className={cx(styles.card, { [styles.isHighlighted]: activeId === item.id })}
            onMouseEnter={() => onHover(item.id)}
            onMouseLeave={() => onHover(null)}
            style={{ "--item-color": item.color }}
            data-id={item.id}
            id={item.id}
        >
            <div
                className={styles.cardImageContainer}
            >
                <img
                    src={item.imgPath}
                    alt={item.title}
                    className={styles.cardImage}
                    // Optical size: tall wordmarks read heavier than others at equal width
                    style={item.logoScale ? { "--logo-scale": item.logoScale } : undefined}
                />
            </div>
            <div className={styles.cardDetails}>
                <div className={styles.cardHeader}>
                    {/* Title and role together, so phones stack title → role → dates */}
                    <div>
                        <h3 className={styles.cardTitle}>{item.title}</h3>
                        {item.role && <div className={styles.cardRole}>{item.role}</div>}
                    </div>
                    <span className={styles.cardDates}>
                        {/* dateLabel: when only the years are known */}
                        {item.dateLabel || `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`}
                    </span>
                </div>
                <ul className={styles.cardBody}>
                    {item.points.map((point) => (
                        <li key={point}>{parse(point)}</li>
                    ))}
                </ul>
            </div>
        </article>
    );
}

export default memo(TimelineCard); 