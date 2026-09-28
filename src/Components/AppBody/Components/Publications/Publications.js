import React, { memo } from "react";
import cx from "classnames";
import _map from "lodash/map";
import _isEmpty from "lodash/isEmpty";
import text from "text";
import styles from "./Publications.module.scss";
import { SECTION_TYPE_VS_NAME } from "../../../../constants";
import PublicationItem from "./PublicationItem";

function Publications({ className, sectionRef, sectionProps, sectionHeadingClassName }) {
  const { items, earlier } = text.publications;
  return (
    <div className={cx(className, styles.sectionContainer)} ref={sectionRef} {...sectionProps}>
      <h2 className={cx(sectionHeadingClassName, styles.sectionTitle)}>
        {SECTION_TYPE_VS_NAME["PUBLICATIONS"]}
      </h2>
      <div className={styles.content}>
        {_map(items, (publication) => (
          <PublicationItem key={publication.id} publication={publication} />
        ))}
        {!_isEmpty(earlier) && (
          <>
            <h3 className={styles.subSectionTitle}>Earlier work</h3>
            {_map(earlier, (publication) => (
              <PublicationItem key={publication.id} publication={publication} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default memo(Publications);
