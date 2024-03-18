import styles from "./Projects.module.scss";
import _map from "lodash/map";
import ProjectCard from "./Components/ProjectCard";
import React from "react";

function ProjectSubSection({
  title,
  projects,
  isKey,
  toggleModal,
  openProjectIdx,
  skillsById,
  isVerySmall,
}) {
  return (
    <div className={styles.subSection}>
      <div className={styles.projectsSubGrid}>
        {_map(projects, (projectDetails, index) => (
          <ProjectCard
            key={index}
            toggleModal={() => toggleModal(index)}
            isSmall={!isKey}
            isVerySmall={isVerySmall}
            isModalOpen={openProjectIdx === index}
            skillsById={skillsById}
            {...projectDetails}
          />
        ))}
      </div>
    </div>
  );
}

export default ProjectSubSection;
