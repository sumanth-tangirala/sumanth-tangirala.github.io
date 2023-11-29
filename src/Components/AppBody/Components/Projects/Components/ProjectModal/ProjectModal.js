import React, {useLayoutEffect, useRef, useState} from "react";

import {Button, Modal} from "antd";
import {GithubOutlined, LeftOutlined, RightOutlined} from "@ant-design/icons";
import cx from "classnames";

import _get from "lodash/get";
import _size from "lodash/size";
import _isList from "lodash/isArray";
import _map from "lodash/map";

import styles from "./ProjectModal.module.scss";

import text from "text/text.json";

function ProjectModal({isModalOpen, toggleModal, openKey, openProjectIdx, handleLeft, handleRight}) {
    const descriptionRef = useRef(null);
    const [isDescriptionOverflowing, setIsDescriptionOverflowing] = useState(false);
    const [isDownScrollable, setIsDownScrollable] = useState(false);
    const [isUpScrollable, setIsUpScrollable] = useState(false);

    const {title, techStack, longDesc, githubURL, details} = _get(text, [openKey, openProjectIdx], {});


    const hasLeft = openKey === 'otherProjects' || openProjectIdx > 0;
    const hasRight = openKey === 'keyProjects' || openProjectIdx < _size(text[openKey])- 1;

    useLayoutEffect(() => {
        if (descriptionRef.current) {
            const isDescriptionOverflowingState = descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight
            setIsDescriptionOverflowing(isDescriptionOverflowingState);
            setIsDownScrollable(isDescriptionOverflowingState);
            setIsUpScrollable(false);
        }
    }, [openKey, openProjectIdx]);

    const handleScroll = (e) => {
        const {scrollTop, scrollHeight, clientHeight} = e.target;
        setIsDownScrollable(scrollTop + clientHeight < scrollHeight);
        setIsUpScrollable(scrollTop > 0);
    }

    const renderContent = () => (
        <div className={styles.modalContent}>
            <div className={styles.extraProjectDetails}>{details}</div>
            <div className={styles.descriptionContainer}>
                <div
                    className={cx(styles.description, {
                        [styles.downScrollable]: isDownScrollable,
                        [styles.upScrollable]: isUpScrollable,
                    })}
                    ref={descriptionRef}
                    onScroll={isDescriptionOverflowing && handleScroll
                }>
                    {!_isList(longDesc) ? longDesc : (
                        <ul className={styles.projectDetails}>
                            {_map(longDesc, (desc, idx) => (
                                <li key={idx}>{desc}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            {techStack && (<div className={styles.techStackSection}>
                <b>Technologies Used: </b>
                <ul className={styles.techStack}>
                    {_map(techStack, (tech, idx) => (
                        <li key={idx}>{tech}</li>
                    ))}
                </ul>
            </div>)}
        </div>
    )

    return (
        <>
            <Modal open={isModalOpen} onCancel={() => toggleModal()} footer={null} title={title}>
                <div className={styles.modalContainer}>
                    <div className={styles.modalLeftPanel}>
                        <Button
                            icon={<LeftOutlined />}
                            disabled={!hasLeft}
                            className={cx(styles.modalLeftButton, {[styles.disabled]: !hasLeft})}
                            onClick={handleLeft}
                            size="large"
                        />
                    </div>
                    {renderContent()}
                    <div className={styles.modalRightPanel}>
                        <Button
                            icon={<RightOutlined />}
                            disabled={!hasRight}
                            className={cx(styles.modalRightButton, {[styles.disabled]: !hasRight})}
                            onClick={handleRight}
                            size="large"
                        />
                        {githubURL && (<Button
                            icon={<GithubOutlined/>}
                            size="large"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(githubURL, '_blank');
                            }}
                            className={styles.githubButton}
                        />)}
                    </div>

                </div>
            </Modal>
        </>
    )
}

export default ProjectModal;
