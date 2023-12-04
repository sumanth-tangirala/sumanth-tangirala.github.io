import React, {useMemo} from 'react';
import cx from 'classnames';
import {Button} from 'antd'


import styles from './ProjectCard.module.scss';
import {GithubOutlined} from "@ant-design/icons";


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

    const style = useMemo(() => ({
        backgroundImage: `url(${imgPath})`,
        backgroundColor,
        filter: contrast ? `contrast(${contrast})` : 'none',
    }), [imgPath, backgroundColor, contrast]);

    return (
        <div
             className={cx(styles.container, {[styles.openCard]: isModalOpen, [styles.smallCard]: isSmall})}
             style={style}
             onClick={toggleModal}
        >
            <div className={styles.cardInfo}>
                <div className={styles.title} style={{color: textColor}}>{title}</div>
            </div>
            {githubURL &&
                <Button
                    icon={<GithubOutlined />}
                    size="large"
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(githubURL, '_blank');
                    }}
                    className={styles.githubButton}
                />
            }
        </div>
    );
}

ProjectCard.propTypes = {};

export default ProjectCard;