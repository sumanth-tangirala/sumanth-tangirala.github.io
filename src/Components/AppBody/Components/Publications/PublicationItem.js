import React from "react";
import styles from "./Publications.module.scss";
import { parse } from "../../../../helpers";

// Animated thumbnails are animated WebP: unlike video, an image always plays
// and loops, with no play button, even in iOS Low Power Mode. With reduced
// motion they show a still (the poster) instead.
const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Every place the paper is available, one pill each; the title itself is
// not a link, so the pills are the one way in
const PILLS = [
  ["paperURL", "PDF"],
  ["arXivURL", "arXiv"],
  ["codeURL", "Code"],
  ["videoURL", "Video"],
  ["websiteURL", "Website"],
  ["linkURL", "Springer"],
];

function PublicationItem({ publication }) {
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
        <h3 className={styles.publicationTitle}>{parse(publication.title)}</h3>
        {/* The citation reads as a byline under the title */}
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
        {publication.summary && (
          <p className={styles.publicationSummary}>{publication.summary}</p>
        )}
        {/* What he did on it: the part an author list can't say */}
        {publication.role && (
          <p className={styles.publicationRole}>
            <span className={styles.publicationRoleLabel}>My role</span>
            {publication.role}
          </p>
        )}
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
