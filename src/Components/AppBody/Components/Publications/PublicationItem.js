import React from "react";
import styles from "./Publications.module.scss";
import { parse } from "../../../../helpers";

// The title opens the project page, else the arXiv abstract; the pills list
// every place the paper is available, so each paper shows the same set
const TITLE_KEYS = ["websiteURL", "arXivURL", "linkURL", "paperURL"];
// Animated thumbnails are animated WebP: unlike video, an image always plays
// and loops, with no play button, even in iOS Low Power Mode. With reduced
// motion they show a still (the poster) instead.
const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PILLS = [
  ["paperURL", "PDF"],
  ["arXivURL", "arXiv"],
  ["codeURL", "Code"],
  ["videoURL", "Video"],
  ["linkURL", "Springer"],
];

function PublicationItem({ publication }) {
  const titleKey = TITLE_KEYS.find((key) => publication[key]);
  const plainTitle = (publication.title || "").replace(/<[^>]+>/g, "");
  const pills = PILLS.filter(([key]) => publication[key]);

  return (
    <article className={styles.publication} id={publication.id}>
      <div className={styles.publicationImageContainer}>
        {/* No alt text: the title beside it names the paper */}
        <img
          src={REDUCE_MOTION && publication.posterURL ? publication.posterURL : publication.imageURL}
          alt=""
          className={styles.publicationImage}
          loading="lazy"
        />
      </div>

      <div className={styles.publicationDetails}>
        <h3 className={styles.publicationTitle}>
          {titleKey ? (
            <a
              href={publication[titleKey]}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.publicationTitleLink}
            >
              {parse(publication.title)}
            </a>
          ) : (
            parse(publication.title)
          )}
        </h3>
        {publication.summary && (
          <p className={styles.publicationSummary}>{publication.summary}</p>
        )}
        {/* What he did on it, in his words: the part an author list can't say */}
        {publication.role && <p className={styles.publicationRole}>{publication.role}</p>}
        <div className={styles.publicationAuthors}>
          {parse(publication.authors)}
        </div>
        {publication.venue && (
          <div className={styles.publicationVenue}>
            {parse(publication.venue)}
            {publication.equalContribution && (
              <span className={styles.publicationNote}> · * Equal contribution</span>
            )}
          </div>
        )}
        {publication.award && <div className={styles.publicationAward}>{publication.award}</div>}
        {pills.length > 0 && (
          <div className={styles.publicationLinksContainer}>
            {pills.map(([key, label]) => (
              <a
                key={key}
                href={publication[key]}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.publicationLink}
                aria-label={`${label}: ${plainTitle}`}
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default PublicationItem;
