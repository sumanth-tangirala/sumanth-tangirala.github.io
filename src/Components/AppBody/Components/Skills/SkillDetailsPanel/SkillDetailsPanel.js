import React from "react";

import styles from "./SkillDetailsPanel.module.scss";

function SkillDetailsPanel({ projectsById, publicationsById, item: skill }) {
  // const {
  //   title,
  //   description,
  //   imgPath,
  //   imgStyle,
  //   projects,
  //   publications,
  // } = skill;
  //
  // const skillProjects = useMemo(
  //   () => _map(projects, (projectId) => projectsById[projectId]),
  //   [projects, projectsById],
  // );
  // const skillPublications = useMemo(
  //   () =>
  //     _map(publications, (publicationId) => publicationsById[publicationId]),
  //   [publications, publicationsById],
  // );
  //
  // const handleLeftRightState = useCallback(
  //   (projectIdx) => {
  //     setHasLeft(projectIdx > 0);
  //     setHasRight(projectIdx < _size(skillProjects) - 1);
  //   },
  //   [setHasLeft, setHasRight, skillProjects],
  // );
  //
  // const toggleModal = useCallback(
  //   (projectIdx) => {
  //     setIsModalOpen(!isModalOpen);
  //
  //     if (!isModalOpen) {
  //       setOpenProjectIdx([skillProjects[projectIdx].key, projectIdx]);
  //       handleLeftRightState(projectIdx);
  //     }
  //   },
  //   [isModalOpen, handleLeftRightState, skillProjects],
  // );
  //
  // const handleLeft = useCallback(() => {
  //   const newProjectIdx = openProjectIdx - 1;
  //   const newKey = skillProjects[newProjectIdx].key;
  //
  //   setOpenProjectIdx([newKey, newProjectIdx]);
  //   handleLeftRightState(newProjectIdx);
  // }, [openProjectIdx, handleLeftRightState, skillProjects]);
  //
  // const handleRight = useCallback(() => {
  //   const newProjectIdx = openProjectIdx + 1;
  //   const newKey = skillProjects[newProjectIdx].key;
  //   setOpenProjectIdx([newKey, newProjectIdx]);
  //   handleLeftRightState(newProjectIdx);
  // }, [openProjectIdx, handleLeftRightState, skillProjects]);

  const renderPublications = () => {
    // if (_size(skillPublications) === 0) return;
    // return (
    //   <div className={styles.subSection}>
    //     <div className={styles.subSectionHeading}>Publications</div>
    //     <div>
    //       {_map(skillPublications, (publication, idx) => (
    //         <PublicationItem
    //           key={idx}
    //           color="white"
    //           publication={publication}
    //           smallFont
    //         />
    //       ))}
    //     </div>
    //   </div>
    // );
  };

  const renderProjects = () => {
    // if (_size(skillProjects) === 0) return;
    //
    // return (
    //   <div className={styles.subSection}>
    //     <div className={styles.subSectionHeading}>Projects</div>
    //
    //     <div className={styles.projectsSubGrid}>
    //       {_map(skillProjects, (projectDetails, index) => (
    //         <ProjectCard
    //           key={index}
    //           toggleModal={() => toggleModal(index)}
    //           isVerySmall
    //           isModalOpen={isModalOpen && openProjectIdx === index}
    //           {...projectDetails}
    //         />
    //       ))}
    //     </div>
    //
    //     <ProjectModal
    //       isModalOpen={isModalOpen}
    //       toggleModal={toggleModal}
    //       openKey={openKey}
    //       openProjectIdx={openProjectIdx}
    //       handleLeft={handleLeft}
    //       handleRight={handleRight}
    //       hasLeft={hasLeft}
    //       hasRight={hasRight}
    //     />
    //   </div>
    // );
  };

  return (
    <div className={styles.content}>
      {renderPublications()}
      {renderProjects()}
    </div>
  );
}

export default SkillDetailsPanel;
