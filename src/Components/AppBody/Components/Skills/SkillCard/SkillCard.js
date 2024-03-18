import React, { useCallback } from "react";
import cx from "classnames";
import styles from "./skillCard.module.scss";
import { parse } from "../../../../../helpers";

function SkillCard({
  cardRef,
  title,
  description,
  imgPath,
  imgStyle,
  toggleCardDetails,
  idx,
  isDetailsVisible,
  selectedIdx,
}) {
  const handleClick = useCallback(() => {
    toggleCardDetails(idx);
  }, [toggleCardDetails, idx]);

  return (
    <div
      className={cx(styles.skillContainer, {
        [styles.transparent]: isDetailsVisible && idx !== selectedIdx,
      })}
      ref={cardRef}
    >
      <div className={styles.skillCard} onClick={handleClick}>
        <div className={styles.skillImgContainer}>
          <img
            src={imgPath}
            className={styles.skillImg}
            style={imgStyle}
            alt=""
          />
        </div>
        <span className={styles.skillTitle}>{parse(title)}</span>
        <span className={styles.skillDescription}>{parse(description)}</span>
      </div>
    </div>
  );
}

export default SkillCard;
