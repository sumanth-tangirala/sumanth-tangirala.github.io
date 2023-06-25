import React from 'react';
import cx from "classnames";

import text from 'text/text.json';

import styles from './Timeline.module.scss';
import _map from "lodash/map";

function Timeline({className, sectionRef}) {
    const timelineText = text.timeline;
    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            <div className={styles.sectionTitle}>
                Timeline
            </div>
            <ul className={styles.timeline}>
                {_map(timelineText, (event, idx) => (
                    <li className={styles.event} key={idx}>
                        <time className={styles.date}>
                            <span className={styles.largeDate}>
                                {event.date}
                            </span>
                            <span className={styles.miniDate}>
                                {event.miniDate}
                            </span>
                        </time>
                        <img src={event.imgPath} className={styles.eventImg} alt=""/>
                        <div className={styles.eventDetails}>
                            <span className={styles.eventTitle}>{event.title}</span>
                            <span className={styles.eventDescription}>{event.desc}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

Timeline.propTypes = {};

export default Timeline;