import React, {useState} from 'react';
import cx from 'classnames';
import {Modal, Button} from 'antd'

import _isList from 'lodash/isArray';

import styles from './ProjectCard.module.scss';
import _map from "lodash/map";
import {GithubOutlined, SearchOutlined} from "@ant-design/icons";


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