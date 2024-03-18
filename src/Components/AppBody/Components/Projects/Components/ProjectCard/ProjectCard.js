import React, { useCallback, useEffect, useMemo, useState } from "react";
import cx from "classnames";
import { Button } from "antd";

import styles from "./ProjectCard.module.scss";
import { GithubOutlined } from "@ant-design/icons";
import { isMobile } from "../../../../../../helpers";

const DEFAULT_TEXT_COLOR = "#fbb13c";
// const DEFAULT_TEXT_COLOR = "black";

function ProjectCard({
  title,
  backgroundColor,
  imgPath,
  mobileImgPath,
  isSmall,
  isVerySmall,
  textColor: actualTextColor,
  githubURL,
  toggleCardDetails,
  selectedIdx,
  isDetailsVisible,
  contrast,
  cardRef,
  idx,
}) {
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);

  imgPath = mobileImgPath && isMobile() ? mobileImgPath : imgPath;

  const handleClick = useCallback(() => {
    toggleCardDetails(idx);
  }, [toggleCardDetails, idx]);

  const style = useMemo(() => {
    return {
      backgroundImage: `url(${imgPath})`,
      backgroundColor,
    };
  }, [imgPath, backgroundColor, contrast]);

  const handleMoveEnter = useCallback(() => {
    if (selectedIdx === idx) return;
    setTextColor(actualTextColor);
  }, [textColor, selectedIdx, idx]);

  const handleMoveLeave = useCallback(() => {
    if (selectedIdx === idx) return;
    setTextColor(DEFAULT_TEXT_COLOR);
  }, [textColor, selectedIdx, idx]);

  useEffect(() => {
    if (selectedIdx === idx) {
      setTextColor(actualTextColor);
    } else {
      setTextColor(DEFAULT_TEXT_COLOR);
    }
  }, [selectedIdx, idx]);

  return (
    <div
      className={cx(styles.container, {
        [styles.openCard]: isDetailsVisible && idx === selectedIdx,
        [styles.smallCard]: isSmall && !isVerySmall,
        [styles.verySmallCard]: isVerySmall,
      })}
      onClick={handleClick}
      onMouseEnter={handleMoveEnter}
      onMouseLeave={handleMoveLeave}
      ref={cardRef}
    >
      <div className={styles.backgroundImage} style={style} />
      <div className={styles.cardContent}>
        <div className={styles.title} style={{ color: textColor }}>
          {title}
        </div>
        {githubURL && (
          <Button
            icon={<GithubOutlined />}
            size="large"
            onClick={(e) => {
              if (isDetailsVisible) return;
              e.stopPropagation();
              window.open(githubURL, "_blank");
            }}
            className={cx(styles.githubButton, {
              [styles.hidden]: isDetailsVisible,
            })}
          />
        )}
      </div>
    </div>
  );
}

ProjectCard.propTypes = {};

export default ProjectCard;
