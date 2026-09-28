import React, { memo } from "react";

import text from "text";
import ProfileLinks from "../../../ProfileLinks";

import styles from "./ContactMe.module.scss";
import { SECTION_TYPES, SECTION_TYPE_VS_NAME } from "../../../../constants";
import cx from "classnames";

function ContactMe({ className, sectionRef, sectionProps }) {
  return (
    <div className={cx(styles.container, className)} ref={sectionRef} {...sectionProps}>
      <div
        className={cx(styles.contentWrapper, {
          [styles.skillsBackground]: (text.hiddenSections || []).includes(
            SECTION_TYPES.PROJECTS,
          ),
        })}
      >
        <h2 className={styles.sectionHeading}>{SECTION_TYPE_VS_NAME[SECTION_TYPES.CONTACT]}</h2>
        {text.availability && <p className={styles.availability}>{text.availability}</p>}
        <div className={styles.emailsContainer}>
          <a href="mailto:tangiralasumanth@gmail.com" className={styles.emailId}>
            tangiralasumanth@gmail.com
          </a>
          <span className={styles.emailDivider} aria-hidden>
            ·
          </span>
          <a href="mailto:sumanth.t@rutgers.edu" className={styles.emailId}>
            sumanth.t@rutgers.edu
          </a>
        </div>
        <ProfileLinks links={["scholar", "linkedin", "github", "resume"]} />
      </div>
    </div>
  );
}

ContactMe.propTypes = {};

export default memo(ContactMe);
