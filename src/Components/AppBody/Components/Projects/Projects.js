import React, { memo, useCallback, useMemo, useState } from "react";
import cx from "classnames";

import _keyBy from "lodash/keyBy";
import _curry from "lodash/curry";

import text from "text";

import ProjectModal from "./Components/ProjectModal/ProjectModal";

import styles from "./Projects.module.scss";
import _size from "lodash/size";
import ProjectSubSection from "./ProjectsSubSection";
import { SECTION_TYPES } from "../../../../constants";
import ItemGrid from "../../../ItemGrid/ItemGrid";
import ProjectCard from "./Components/ProjectCard";
import ProjectDetailsPanel from "./Components/ProjectDetailsPanel";

function Projects({ className, sectionRef, sectionHeadingClassName }) {
  return (
    <>
      <ItemGrid
        containerRef={sectionRef}
        items={text.projects}
        itemCardComponent={ProjectCard}
        itemDetailsContentComponent={ProjectDetailsPanel}
        sectionName={SECTION_TYPES.PROJECTS}
        sectionHeadingClassName={sectionHeadingClassName}
      />
    </>
  );
}

Projects.propTypes = {};

export default memo(Projects);
