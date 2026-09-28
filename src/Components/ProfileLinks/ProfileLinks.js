import React, { memo } from "react";
import cx from "classnames";
import basicData from "text";
import { LuFileText, LuGithub, LuGraduationCap, LuLinkedin, LuMail } from "react-icons/lu";
import styles from "./profileLinks.module.scss";

// Where to find Sumanth, as the hero and the Contact card both show it: icon
// circles, and a labelled pill for the résumé (a document glyph alone doesn't
// say "resume", and touch has no tooltips)
const LINKS = {
  email: { label: "Email", href: `mailto:${basicData.email}`, Icon: LuMail },
  scholar: { label: "Google Scholar", href: basicData.scholarURL, Icon: LuGraduationCap, external: true },
  linkedin: { label: "LinkedIn", href: basicData.linkedinURL, Icon: LuLinkedin, external: true },
  github: { label: "GitHub", href: basicData.githubURL, Icon: LuGithub, external: true },
  resume: { label: "Resume", href: basicData.resumeURL, Icon: LuFileText, external: true, showLabel: true },
};

// `links`: which of the above, in order; `linkProps`: extra attributes for
// each link
function ProfileLinks({ links, className, linkProps }) {
  return (
    <div className={cx(styles.links, className)}>
      {links.map((key) => {
        const { label, href, Icon, external, showLabel } = LINKS[key];
        return (
          <a
            key={key}
            href={href}
            className={cx(styles.link, { [styles.labelledLink]: showLabel })}
            aria-label={showLabel ? undefined : label}
            title={showLabel ? undefined : label}
            {...linkProps}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <Icon aria-hidden />
            {showLabel && label}
          </a>
        );
      })}
    </div>
  );
}

export default memo(ProfileLinks);
