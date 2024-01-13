import React from 'react';
import cx from "classnames";
import styles from "./skillCard.module.scss";
import {parse} from "../../../../../helpers";

function SkillCard({
    title,
    description,
    imgPath,
    imgStyle,
}) {
    return (
        <div className={cx(styles.skillContainer)}>
            <div className={styles.skillCard} >
                <div className={styles.skillImgContainer}>
                    <img src={imgPath} className={styles.skillImg} style={imgStyle} alt=""/>
                </div>
                <span className={styles.skillTitle}>{parse(title)}</span>
                <span className={styles.skillDescription}>{parse(description)}</span>
                <div className={styles.arrow_down}></div>
            </div>

        </div>
    )
}

export default SkillCard;