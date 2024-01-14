import React, {memo, useCallback, useMemo, useState} from 'react';
import cx from "classnames";

import _map from "lodash/map";
import _for from "lodash/forEach";
import _curry from 'lodash/curry';

import text from 'text';

import ProjectCard from "./Components/ProjectCard";
import ProjectModal from './Components/ProjectModal/ProjectModal';

import styles from './Projects.module.scss';
import _size from "lodash/size";

function ProjectSubSection({title, projects, isKey, toggleModal, openProjectIdx, skillsById}) {
    return (
        <div className={styles.subSection}>
            <span className={styles.sectionHeading}>
                {title}
            </span>
            <div className={styles.projectsSubGrid}>
                {_map(projects, (projectDetails, index) => (
                <ProjectCard
                    key={index}
                    toggleModal={() => toggleModal(index)}
                    isSmall={!isKey}
                    isModalOpen={openProjectIdx === index}
                    skillsById={skillsById}
                    {...projectDetails}
                />
            ))}
            </div>
        </div>
    );
}


function Projects({className, sectionRef}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [[openKey, openProjectIdx], setOpenProjectIdx] = useState([]);

    const toggleModal = useCallback((key, projectIdx) => {
        setIsModalOpen(!isModalOpen);
        setOpenProjectIdx([key, projectIdx]);
    }, [isModalOpen]);

    const handleLeft = useCallback(() => {
        if (openKey === 'otherProjects' && openProjectIdx === 0) {
            setOpenProjectIdx(['keyProjects', _size(text['keyProjects']) - 1]);
        }
        else {
            setOpenProjectIdx([openKey, openProjectIdx - 1]);
        }
    }, [openKey, openProjectIdx])

    const handleRight = useCallback(() => {
        if (openKey === 'keyProjects' && openProjectIdx === _size(text['keyProjects']) - 1) {
            setOpenProjectIdx(['otherProjects', 0]);
        }
        else {
            setOpenProjectIdx([openKey, openProjectIdx + 1]);
        }
    }, [openKey, openProjectIdx])

    const skillsById = useMemo(() => {
        const skillsById = {};
        _for(text.skills, skill => {
            skillsById[skill.id] = skill;
        });
        return skillsById;
    }, [])

    return (
        <>
            <div className={cx(styles.container, className)} ref={sectionRef}>
            <div className={styles.projects}>
                <ProjectSubSection
                    title={"Key Projects"}
                    projects={text.keyProjects}
                    isKey
                    toggleModal={_curry(toggleModal)('keyProjects')}
                    openProjectIdx={openKey === 'keyProjects' && openProjectIdx}
                    skillsById={skillsById}
                />
                <ProjectSubSection
                    title={"Hobby Projects"}
                    projects={text.otherProjects}
                    toggleModal={_curry(toggleModal)('otherProjects')}
                    openProjectIdx={openKey === 'otherProjects' && openProjectIdx}
                    skillsById={skillsById}
                />
            </div>
            <ProjectModal
                isModalOpen={isModalOpen}
                toggleModal={toggleModal}
                openKey={openKey}
                openProjectIdx={openProjectIdx}
                handleLeft={handleLeft}
                handleRight={handleRight}
            />
        </div>
        </>
    );
}

Projects.propTypes = {};

export default memo(Projects);