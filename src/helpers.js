import htmlParse from "html-react-parser";

import _replace from "lodash/replace";
import _isNil from "lodash/isNil";

export const parse = (text) => {
  text = _replace(
    text,
    "<yellow_bold>",
    '<span style="color:#fcc923;font-weight: 500;">',
  );
  text = _replace(text, "</yellow_bold>", "</span>");
  return htmlParse(text);
};

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
    } else {
      console.log(count, scrollValues, scrollValues.length);
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
      scrollAmount = scrollTop;
    } else {
      // we're near the bottom of the list
      scrollAmount = scrollBot;
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
