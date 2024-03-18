import React from "react";
import PropTypes from "prop-types";

import styles from "./ProjectDetailsPanel.module.scss";
import cx from "classnames";
import _isList from "lodash/isArray";
import _map from "lodash/map";
import { GithubOutlined } from "@ant-design/icons";
import { Button } from "antd";

function ProjectDetailsPanel({ item }) {
  const { techStack, longDesc, details, githubURL } = item;

  return (
    <div className={styles.container}>
      {/*<div className={styles.extraProjectDetails}>{details}</div>*/}
      {githubURL && (
        <Button
          icon={<GithubOutlined />}
          size="large"
          onClick={(e) => {
            e.stopPropagation();
            window.open(githubURL, "_blank");
          }}
          className={styles.githubButton}
        >
          View on GitHub
        </Button>
      )}
      {techStack && (
        <div className={styles.techStackSection}>
          <b>Skills: </b>
          <ul className={styles.techStack}>
            {_map(techStack, (tech, idx) => (
              <li key={idx}>{tech}</li>
            ))}
          </ul>
        </div>
      )}
      <div className={styles.description}>
        {!_isList(longDesc) ? (
          longDesc
        ) : (
          <ul className={styles.projectDetails}>
            {_map(longDesc, (desc, idx) => (
              <li key={idx}>{desc}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

ProjectDetailsPanel.propTypes = {};

export default ProjectDetailsPanel;
