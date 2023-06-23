import React, {useCallback} from 'react';

import {FilePdfOutlined, GithubFilled, LinkedinFilled} from '@ant-design/icons';
import {Button} from "antd";

import text from 'text/text.json';

import styles from './ContactMe.module.scss';
import cx from "classnames";


function ContactMe({className, sectionRef}) {
    const openLinkedin = useCallback(() => {
        window.open(text.linkedinURL, '_blank');
    },[]);

    const openGithub = useCallback(() => {
        window.open(text.githubURL, '_blank');
    },[]);

    return (
        <div className={cx(styles.container, className)} ref={sectionRef}>
            <span className={styles.sectionHeading}>
                Contact Me
            </span>
            <div className={styles.emailsContainer}>
                <span className={styles.emailText}>
                    Email:
                </span>
                <a
                    href = "mailto: tangiralasumanth@gmail.com"
                    className={styles.emailId}
                >
                    tangiralasumanth@gmail.com
                </a>
                <span className={styles.emailDivider}>
                    ||
                </span>
                <a
                    href = "mailto: sumanth.t@rutgers.edu"
                    className={styles.emailId}
                >
                    sumanth.t@rutgers.edu
                </a>
            </div>
            <div className={styles.socialMediaLinks}>
                <Button
                    shape="circle"
                    icon={<LinkedinFilled />}
                    className={styles.socialMediaImg}
                    onClick={openLinkedin}
                />
                 <Button
                    shape="circle"
                    icon={<GithubFilled />}
                    className={styles.socialMediaImg}
                    onClick={openGithub}
                />
                <Button
                    icon={<FilePdfOutlined />}
                    className={styles.resume}
                >
                    Resume
                </Button>
            </div>
        </div>
    );
}

ContactMe.propTypes = {};

export default ContactMe;