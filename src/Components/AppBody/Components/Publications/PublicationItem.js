import React from "react";
import cx from "classnames";
import styles from "./Publications.module.scss";
import { parse } from "../../../../helpers";

function PublicationItem({ publication, idx, color = "white", smallFont }) {
  const renderLink = (key, text) => {
    if (!publication[key]) return null;
    return (
      <div>
        [
        <a
          href={publication[key]}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.publicationLink}
        >
          {text}
        </a>
        ]
      </div>
    );
  };

  return (
    <div
      key={idx}
      className={cx(styles.publication, { [styles.smallFont]: smallFont })}
      style={{ color }}
    >
      <div className={styles.publicationImageContainer}>
        <img
          src={publication.imageURL}
          alt=""
          className={styles.publicationImage}
        />
      </div>

      <div className={styles.publicationDetails}>
        <div className={styles.publicationTitle}>
          {parse(publication.title)}
        </div>
        <div className={styles.publicationAuthors}>
          {parse(publication.authors)}
        </div>
        {publication.venue && (
          <div className={styles.publicationVenue}>
            {parse(publication.venue)}
          </div>
        )}
        {publication.award && (
          <div className={styles.publicationAward}>
            {parse(publication.award)}
          </div>
        )}
        <div className={styles.publicationLinksContainer}>
          {renderLink("websiteURL", "Website")}
          {renderLink("linkURL", "Link")}
          {renderLink("arXivURL", "arXiv")}
          {renderLink("paperURL", "Paper")}
          {renderLink("codeURL", "Code")}
          {renderLink("videoURL", "Video")}
        </div>
      </div>
    </div>
  );
}

export default PublicationItem;
