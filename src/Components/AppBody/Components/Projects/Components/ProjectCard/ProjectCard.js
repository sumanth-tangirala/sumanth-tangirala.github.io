import React from 'react';
import cx from 'classnames';
import {Button} from 'antd'


import styles from './ProjectCard.module.scss';
import {GithubOutlined} from "@ant-design/icons";


function ProjectCard({title, backgroundColor, imgPath, isSmall, textColor, githubURL, toggleModal, isModalOpen }) {

    return (
        <div
             className={cx(styles.container, {[styles.openCard]: isModalOpen, [styles.smallCard]: isSmall})}
             style={{backgroundImage: `url(${imgPath})`, backgroundColor}}
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