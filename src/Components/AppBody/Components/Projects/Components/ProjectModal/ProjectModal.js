import React from "react";

import {Button, Modal} from "antd";
import {GithubOutlined, LeftOutlined, RightOutlined} from "@ant-design/icons";
import cx from "classnames";

import _get from "lodash/get";
import _size from "lodash/size";
import _isList from "lodash/isArray";
import _map from "lodash/map";

import styles from "./ProjectModal.module.scss";

import text from 'text';

class ProjectModal extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isDescriptionOverflowing: false,
            isDownScrollable: false,
            isUpScrollable: false,
        };
        this.descriptionRef = React.createRef();

    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const {openKey, openProjectIdx} = this.props;
        const { openKey: prevOpenKey, openProjectIdx: prevOpenProjectIdx } = prevProps;
        if ((openKey !== prevOpenKey || openProjectIdx !== prevOpenProjectIdx)) {
            setTimeout(() => {
                if (this.descriptionRef.current) {
                    this.handleScrollDisplayBehavior();
                }
            }, 1);
        }
    }

    handleScrollDisplayBehavior = () => {
        const isDescriptionOverflowingState = this.descriptionRef.current.scrollHeight > this.descriptionRef.current.clientHeight

        this.setState({
            isDescriptionOverflowing: isDescriptionOverflowingState,
            isDownScrollable: isDescriptionOverflowingState,
            isUpScrollable: false,
        });
    }

    handleScroll = (e) => {
        if (!this.state.isDescriptionOverflowing) return;

        const {scrollTop, scrollHeight, clientHeight} = e.target;
        this.setState({
            isDownScrollable: scrollTop + clientHeight < scrollHeight,
            isUpScrollable: scrollTop > 0,
        });
    }

    renderContent = () => {
        const {
            openKey,
            openProjectIdx,
        } = this.props;

        const {
            isDownScrollable,
            isUpScrollable,
        } = this.state

        const { techStack, longDesc, details} = _get(text, [openKey, openProjectIdx], {});
        return (
            <div className={styles.modalContent}>
                <div className={styles.extraProjectDetails}>{details}</div>
                <div className={styles.descriptionContainer}>
                    <div
                        className={cx(styles.description, {
                            [styles.downScrollable]: isDownScrollable,
                            [styles.upScrollable]: isUpScrollable,
                        })}
                        ref={this.descriptionRef}
                        onScroll={this.handleScroll}
                    >
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
        );
    }
    render() {

        const {
            isModalOpen,
            toggleModal,
            openKey,
            openProjectIdx,
            handleLeft,
            handleRight
        } = this.props;

        const {title, githubURL } = _get(text, [openKey, openProjectIdx], {});


        const hasLeft = openKey === 'otherProjects' || openProjectIdx > 0;
        const hasRight = openKey === 'keyProjects' || openProjectIdx < _size(text[openKey])- 1;

        return (
            <>
                <Modal
                    open={isModalOpen}
                    onCancel={() => toggleModal()}
                    footer={null}
                    title={title}
                    destroyOnClose
                >
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
                        {this.renderContent()}
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
}
export default ProjectModal;
