import React, { memo } from "react";

import text from "text";

import styles from "./Projects.module.scss";
import { SECTION_TYPES } from "../../../../constants";
import ItemGrid from "../../../ItemGrid/ItemGrid";
import ProjectCard from "./Components/ProjectCard";
import ProjectDetailsPanel from "./Components/ProjectDetailsPanel";

function Projects({ className, sectionRef, sectionHeadingClassName }) {
  if (text.hideProjects) {
    return null;
  }

  return (
    <>
      <ItemGrid
        containerRef={sectionRef}
        items={text.projects}
        itemCardComponent={ProjectCard}
        itemDetailsContentComponent={ProjectDetailsPanel}
        sectionName={SECTION_TYPES.PROJECTS}
        sectionHeadingClassName={sectionHeadingClassName}
        className={className}
        itemsGridClassName={styles.itemsGrid}
      />
    </>
  );
}

Projects.propTypes = {};

export default memo(Projects);
