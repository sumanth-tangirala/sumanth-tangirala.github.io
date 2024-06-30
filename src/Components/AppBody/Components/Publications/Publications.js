import React, { memo, useCallback } from "react";

import cx from "classnames";

import styles from "./Publications.module.scss";
import _map from "lodash/map";
import text from "text";
import { SECTION_TYPE_VS_NAME } from "../../../../constants";
import PublicationItem from "./PublicationItem";
import _size from "lodash/size";

function Publications({ className, sectionRef, sectionHeadingClassName }) {
  const shouldRenderPrePrints =  _size(text.publications.prePrints) > 0;
  const renderPublications = useCallback(
    (publications) => (
      <div>
        {_map(publications, (publication, idx) => (
          <PublicationItem key={idx} idx={idx} publication={publication} />
        ))}
      </div>
    ),
    [],
  );
  

  const prePrintsTitle =
    _size(text.publications.prePrints) > 1 ? "Preprints" : "Preprint";
  const confPapersTitle =
    _size(text.publications.conferencePapers) > 1
      ? "Conference Papers"
      : "Conference Paper";

  return (
    <div className={cx(className, styles.sectionContainer)} ref={sectionRef}>
      <div className={cx(sectionHeadingClassName, styles.sectionTitle)}>
        {SECTION_TYPE_VS_NAME["PUBLICATIONS"]}
      </div>
      <div className={styles.content}>
        {shouldRenderPrePrints && (
          <div className={styles.subSectionTitle}>{`${prePrintsTitle}:`}</div>
          {renderPublications(text.publications.prePrints)}
        )}
        <div className={styles.subSectionTitle}>{`${confPapersTitle}:`}</div>
        {renderPublications(text.publications.conferencePapers)}
      </div>
    </div>
  );
}

Publications.propTypes = {};

export default memo(Publications);
