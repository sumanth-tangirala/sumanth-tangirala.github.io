import React from 'react';
import PropTypes from 'prop-types';

import cx from 'classnames';

import styles from './Publications.module.scss';
import _map from "lodash/map";
import text from 'text/text.json';
import {SECTION_TYPE_VS_NAME} from "../../../../constants";

function Publications({className, sectionRef, sectionHeadingClassName}) {
    const renderPublications = (publications) => (
        <div>
        {
            _map(publications, (publication, idx) => (
                <div key={idx} className={styles.publication}>
                    <div className={styles.publicationTitle}>
                        {publication.title}
                    </div>
                    <div className={styles.publicationAuthors}>
                        {publication.authors}
                    </div>
                    {publication.venue && (<div className={styles.publicationVenue}>
                        {publication.venue}
                    </div>)}
                    <div className={styles.publicationLinks}>
                        {publication.link && (
                            <div className={styles.publicationArXiv}>
                                [
                                <a href={publication.link} target="_blank" rel="noopener noreferrer">
                                    link
                                </a>
                                ]
                            </div>
                        )}
                        {publication.arXiv && (
                            <div className={styles.publicationArXiv}>
                                [
                                <a href={publication.arXiv} target="_blank" rel="noopener noreferrer">
                                    arXiv
                                </a>
                                ]
                            </div>
                        )}
                    </div>

                </div>
            ))
        }
        </div>
    );

    return (
        <div className={cx(className, styles.sectionContainer)} ref={sectionRef}>
            <div className={cx(sectionHeadingClassName, styles.sectionTitle)}>
                {SECTION_TYPE_VS_NAME['PUBLICATIONS']}
            </div>
            <div className={styles.content}>
                <div className={styles.subSectionTitle}>
                    Preprints:
                </div>
                {renderPublications(text.publications.prePrints)}
                <div className={styles.subSectionTitle}>
                    Conference Paper:
                </div>
                {renderPublications(text.publications.conferencePapers)}
            </div>


        </div>
    );
}

Publications.propTypes = {};

export default Publications;