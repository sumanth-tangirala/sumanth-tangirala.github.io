import React, {memo} from 'react';

import cx from 'classnames';

import styles from './Publications.module.scss';
import _map from "lodash/map";
import text from 'text';
import {SECTION_TYPE_VS_NAME} from "../../../../constants";
import {parse} from "helpers";
import _size from "lodash/size";

function Publications({className, sectionRef, sectionHeadingClassName}) {
    const renderPublications = (publications) => (
        <div>
            {
                _map(publications, (publication, idx) => (
                    <div key={idx} className={styles.publication}>
                        <div className={styles.publicationTitle}>
                            {parse(publication.title)}
                        </div>
                        <div className={styles.publicationAuthors}>
                            {parse(publication.authors)}
                        </div>
                        {publication.venue && (<div className={styles.publicationVenue}>
                            {parse(publication.venue)}
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

    const prePrintsTitle = _size(text.publications.prePrints) > 1 ? 'Preprints' : 'Preprint';
    const confPapersTitle = _size(text.publications.conferencePapers) > 1 ? 'Conference Papers' : 'Conference Paper';

    return (
        <div className={cx(className, styles.sectionContainer)} ref={sectionRef}>
            <div className={cx(sectionHeadingClassName, styles.sectionTitle)}>
                {SECTION_TYPE_VS_NAME['PUBLICATIONS']}
            </div>
            <div className={styles.content}>
                <div className={styles.subSectionTitle}>
                    {`${prePrintsTitle}:`}
                </div>
                {renderPublications(text.publications.prePrints)}
                <div className={styles.subSectionTitle}>
                    {`${confPapersTitle}:`}
                </div>
                {renderPublications(text.publications.conferencePapers)}
            </div>


        </div>
    );
}

Publications.propTypes = {};

export default memo(Publications);