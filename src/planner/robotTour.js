// The robot showing the reader what matters on the page. STOPS are the
// things worth seeing, in reading order. Whatever is being shown (a stop, or
// a section's heading) is `robotTour.shown`; the page robot goes to stand
// beside it, facing it, and waits there:
//   - where it waits beside the page, it picks a stop in view, if there is
//     one, rather than any free spot (PageRobot);
//   - a section chosen in the nav: it runs ahead to wait at its heading
//     (BasePage).
// The reader's own scrolling ends the showing.

const highlight = (i) => () => document.querySelectorAll("#research [data-highlight]")[i] || null;
const byId = (id) => () => document.getElementById(id);

export const STOPS = [
  { id: "research", find: highlight(0) },
  { id: "research-goal", find: highlight(1) },
  { id: "parse", find: byId("parse") },
  { id: "grape", find: byId("grape") },
  { id: "rutgers", find: byId("rutgers") },
  { id: "zoox", find: byId("zoox") },
  { id: "contact", find: () => document.querySelector("#contact a[href^='mailto:']") },
];

const listeners = new Set();
let shown = null; // { el }
let watchTimer = 0;
// The reader's own scrolling (a wheel, a finger) ends the showing
let watching = false;
const onOwnScroll = () => robotTour.show(null);
const watch = (on) => {
  if (on === watching) return;
  watching = on;
  const method = on ? "addEventListener" : "removeEventListener";
  window[method]("wheel", onOwnScroll, { passive: true });
  window[method]("touchmove", onOwnScroll, { passive: true });
};

export const robotTour = {
  get shown() {
    return shown;
  },
  show(el) {
    shown = el ? { el } : null;
    // (after the scroll that brings it into view has begun)
    clearTimeout(watchTimer);
    if (shown) watchTimer = setTimeout(() => watch(true), 600);
    else watch(false);
    listeners.forEach((listener) => listener(shown));
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
