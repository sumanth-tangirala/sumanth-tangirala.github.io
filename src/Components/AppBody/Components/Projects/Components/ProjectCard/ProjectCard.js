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
        skills,
        toggleModal,
        isModalOpen,
        contrast,
        skillsById
    }) {
    const style = useMemo(() => {
        return ({
            backgroundImage: `url(${imgPath})`,
            backgroundColor,
            filter: contrast ? `contrast(${contrast})` : 'none',
        })
    }, [imgPath, backgroundColor, contrast]);

    return (
        <div
            className={cx(styles.container, {[styles.openCard]: isModalOpen, [styles.smallCard]: isSmall})}
            style={style}
            onClick={toggleModal}
        >
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
                {/*{*/}
                {/*    skills && skills.length > 0 &&*/}
                {/*    <div className={styles.skills}>*/}
                {/*        {skills.map((skill, idx) => (*/}
                {/*            <div key={idx} className={styles.skill}>{skill}</div>*/}
                {/*        ))}*/}
                {/*    </div>*/}
                {/*}*/}

            </div>
        </div>
    );
}

ProjectCard.propTypes = {};

export default ProjectCard;