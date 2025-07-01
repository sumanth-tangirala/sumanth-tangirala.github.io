import React, { memo } from "react";
import styles from "./landing.module.scss";
import cx from "classnames";
import basicData from "text";
import { mobileDesktopSwitcher, parse } from "../../../../helpers";

function Landing({ className, sectionRef, nameRef }) {
  return (
    <div className={cx(styles.landing, className)} ref={sectionRef}>
      <div className={styles.container}>
        {mobileDesktopSwitcher({
          mobile: (
            <img
              src={basicData.landingMobilePicturePath}
              className={styles.image}
              alt={basicData.name}
            />
          ),
          desktop: (
            <img
              src={basicData.landingPicturePath}
              className={styles.image}
              alt={basicData.name}
            />
          ),
        })}

        <div className={cx(styles.name)} ref={nameRef}>{basicData.name}</div>
        <div className={styles.tagline}>{parse(basicData.tagline)}</div>
      </div>
    </div>
  );
}

export default memo(Landing);
