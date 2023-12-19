import React, {useMemo} from 'react';
import cx from 'classnames';
import {Button} from 'antd'


import styles from './ProjectCard.module.scss';
import {GithubOutlined} from "@ant-design/icons";
import _includes from "lodash/includes";


function ProjectCard({
        title,
        backgroundColor,
        imgPath,
        isSmall,
        textColor,
        githubURL,
        toggleModal,
        isModalOpen,
        contrast,
    }) {
    const isBackgroundVideo = useMemo(() => _includes(imgPath, 'mp4'), [imgPath]);

    const style = useMemo(() => {
        const backgroundImage =  isBackgroundVideo ? undefined : `url(${imgPath})`;
        return ({
            backgroundImage,
            backgroundColor,
            filter: contrast ? `contrast(${contrast})` : 'none',
        })
    }, [imgPath, backgroundColor, contrast, isBackgroundVideo]);

    return (
        <div
            className={cx(styles.container, {[styles.openCard]: isModalOpen, [styles.smallCard]: isSmall})}
            style={style}
            onClick={toggleModal}
        >
            {isBackgroundVideo && (
                <div className={styles.videoContainer}>
                    <video autoPlay muted loop>
                        <source src={imgPath} type="video/mp4"/>
                    </video>
                </div>
            )}
            <div className={styles.cardContent}>
                <div className={styles.title} style={{color: textColor}}>{title}</div>
                {githubURL &&
                    <Button
                        icon={<GithubOutlined/>}
                        size="large"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(githubURL, '_blank');
                        }}
                        className={styles.githubButton}
                    />
                }
            </div>
        </div>
    );
}

ProjectCard.propTypes = {};

export default ProjectCard;