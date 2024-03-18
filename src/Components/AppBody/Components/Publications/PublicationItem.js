import React from "react";
import cx from "classnames";
import styles from "./Publications.module.scss";
import { parse } from "../../../../helpers";

function PublicationItem({ publication, idx, color = "black", smallFont }) {
  return (
    <div
      key={idx}
      className={cx(styles.publication, { [styles.smallFont]: smallFont })}
      style={{ color }}
    >
      <div className={styles.publicationTitle}>{parse(publication.title)}</div>
      <div className={styles.publicationAuthors}>
        {parse(publication.authors)}
      </div>
      {publication.venue && (
        <div className={styles.publicationVenue}>
          {parse(publication.venue)}
        </div>
      )}
      <div className={styles.publicationLinks}>
        {publication.link && (
          <div className={styles.publicationArXiv}>
            [
            <a
              href={publication.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              link
            </a>
            ]
          </div>
        )}
        {publication.arXiv && (
          <div className={styles.publicationArXiv}>
            [
            <a
              href={publication.arXiv}
              target="_blank"
              rel="noopener noreferrer"
            >
              arXiv
            </a>
            ]
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicationItem;
