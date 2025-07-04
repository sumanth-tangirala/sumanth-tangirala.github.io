import React, { memo, useCallback } from "react";

import {
  FilePdfOutlined,
  GithubFilled,
  LinkedinFilled,
} from "@ant-design/icons";
import { Button } from "antd";

import text from "text";

import styles from "./ContactMe.module.scss";
import { SECTION_TYPES } from "../../../../constants";
import cx from "classnames";

function ContactMe({ className, sectionRef }) {
  const openLinkedin = useCallback(() => {
    window.open(text.linkedinURL, "_blank");
  }, []);

  const openGithub = useCallback(() => {
    window.open(text.githubURL, "_blank");
  }, []);

  const openResume = useCallback(() => {
    window.open(text.resumeURL, "_blank");
  }, []);

  return (
    <div className={cx(styles.container, className)} ref={sectionRef}>
      <div
        className={cx(styles.contentWrapper, {
          [styles.skillsBackground]: (text.hiddenSections || []).includes(
            SECTION_TYPES.PROJECTS,
          ),
        })}
      >
        <span className={styles.sectionHeading}>Contact Me</span>
        <div className={styles.emailsContainer}>
          <span className={styles.emailText}>Email:</span>
          <a href="mailto: tangiralasumanth@gmail.com" className={styles.emailId}>
            tangiralasumanth@gmail.com
          </a>
          <span className={styles.emailDivider}>·</span>
          <a href="mailto: sumanth.t@rutgers.edu" className={styles.emailId}>
            sumanth.t@rutgers.edu
          </a>
        </div>
        <div className={styles.socialMediaLinks}>
          <Button
            shape="circle"
            icon={<LinkedinFilled />}
            className={styles.socialMediaImg}
            type="default"
            ghost
            onClick={openLinkedin}
          />
          <Button
            shape="circle"
            icon={<GithubFilled />}
            className={styles.socialMediaImg}
            type="default"
            ghost
            onClick={openGithub}
          />
          <Button
            icon={<FilePdfOutlined />}
            className={styles.resume}
            type="default"
            ghost
            onClick={openResume}
          >
            Resume
          </Button>
        </div>
      </div>
    </div>
  );
}

ContactMe.propTypes = {};

export default memo(ContactMe);
