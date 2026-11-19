import htmlParse from "html-react-parser";

import _isNil from "lodash/isNil";
import { PRIMARY_COLOR } from "./constants";

// Keeps a text's last `count` words on one line, so a paragraph never ends
// on a line of one or two words. They go in a no-wrap span, which also stops
// a break at a hyphen inside them; when a tag falls among them (a link at the
// end), they are joined with no-break spaces instead. Spaces inside tags are
// skipped.
// The last words kept together must still fit a 320px-wide phone's line:
// 24 characters in a 20px title, 30 in 17px body text
export const TITLE_KEEP = 24;
export const BODY_KEEP = 30;
export const keepLastWords = (text, maxChars = TITLE_KEEP, count = 3) => {
  const chars = [...text];
  // The spaces before each of the last `count` words, nearest first
  const spaces = [];
  let inTag = false;
  let crossesTag = false;
  for (let i = chars.length - 1; i >= 0 && spaces.length < count; i--) {
    // Scanning backwards, ">" opens a tag and "<" closes it
    if (chars[i] === ">") {
      inTag = true;
      if (spaces.length < count - 1) crossesTag = true;
    } else if (chars[i] === "<") inTag = false;
    else if (!inTag && chars[i] === " ") spaces.push(i);
  }
  if (spaces.length < count - 1) return text; // too few words to matter
  const start = spaces.length === count ? spaces[count - 1] + 1 : 0;
  // Words this long could not share a narrow phone's line: keep fewer
  if (chars.slice(start).join("").replace(/<[^>]*>/g, "").length > maxChars) {
    return count > 2 ? keepLastWords(text, maxChars, count - 1) : text;
  }
  if (crossesTag) {
    spaces.slice(0, count - 1).forEach((i) => (chars[i] = "\u00a0"));
    return chars.join("");
  }
  return `${chars.slice(0, start).join("")}<span style="white-space: nowrap;">${chars
    .slice(start)
    .join("")}</span>`;
};

// `keepChars`: how long the kept last words may be (see keepLastWords)
export const parse = (text, keepChars = TITLE_KEEP) => {
  text = text.replaceAll(
    "<highlight>",
    `<span style="color:${PRIMARY_COLOR};">`,
  );
  text = text.replaceAll("</highlight>", "</span>");

  text = text.replaceAll("<no_wrap>", '<span style="white-space: nowrap;">');

  text = text.replaceAll("</no_wrap>", "</span>");

  return htmlParse(keepLastWords(text, keepChars));
};

// True when build/index.html shipped prerendered markup (scripts/prerender.js).
// Read at import time, before React replaces the markup.
export const IS_PRERENDERED = Boolean(
  document.getElementById("root")?.hasChildNodes(),
);

export const isMobile = () => {
  return window.innerWidth < 750;
};

export const mobileDesktopSwitcher = ({ mobile, desktop }) => {
  return isMobile() ? mobile : desktop;
};

const scroll_element = (
  element,
  scrollAmount,
  time,
  discretization,
  scrollValues,
  final_value,
  count = 0,
) => {
  setTimeout(() => {
    if (!_isNil(scrollValues[count])) {
      element.scrollTop = scrollValues[count];
    }

    if (count < discretization - 1) {
      scroll_element(
        element,
        scrollAmount,
        time,
        discretization,
        scrollValues,
        final_value,
        count + 1,
      );
    } else {
      element.scrollTop = final_value;
    }
  }, time / discretization);
};

export const scrollParentToChild = (parent, child, time, discretization) => {
  // Where is the parent on page
  var parentRect = parent.getBoundingClientRect();
  // What can you see?
  var parentViewableArea = {
    height: parent.clientHeight,
    width: parent.clientWidth,
  };

  // Where is the child
  var childRect = child.getBoundingClientRect();
  // Is the child viewable?
  var isViewable =
    childRect.top >= parentRect.top &&
    childRect.bottom <= parentRect.top + parentViewableArea.height;

  var scrollAmount = 0;
  // if you can't see the child try to scroll parent
  if (!isViewable) {
    // Should we scroll using top or bottom? Find the smaller ABS adjustment
    const scrollTop = childRect.top - parentRect.top;
    const scrollBot = childRect.bottom - parentRect.bottom;
    if (Math.abs(scrollTop) < Math.abs(scrollBot)) {
      // we're near the top of the list
      scrollAmount = scrollTop - 20;
    } else {
      // we're near the bottom of the list
      scrollAmount = scrollBot + 20;
    }
  }

  if (scrollAmount === 0) return;
  var scrollValues = [];

  for (let i = 0; i < discretization; i++) {
    var scrollValue;
    if (i === 0) {
      scrollValue = parent.scrollTop + scrollAmount / discretization;
    } else {
      scrollValue = scrollValues[i - 1] + scrollAmount / discretization;
    }

    scrollValues.push(scrollValue);
  }
  scroll_element(
    parent,
    scrollAmount,
    time,
    discretization,
    scrollValues,
    parent.scrollTop + scrollAmount,
  );
};
