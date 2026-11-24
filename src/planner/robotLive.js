// The robot as its drivers move it, for the layer that draws it (RobotLayer):
// where it is, in page px (the scroller's content), what it is doing, and
// the controls of whichever driver has it, so the layer can hand it things
// the reader asks for (a goal, a carry).
//
// activity: "bullet" (still at its spot before the tagline: on load, and
// asleep at home), "wake" (its first moves), "search", "drive", "wait", or
// "hidden"

const listeners = new Set();
let state = { pose: null, activity: "hidden", goal: null, alpha: 1 };
let controls = null;
// How much farther than today's disc (radius 6.5) the look reaches, px: the
// drivers keep this much more room around content
let extraClearance = 0;

export const robotLive = {
  get extraClearance() {
    return extraClearance;
  },
  setReach(radius) {
    extraClearance = Math.max(0, radius - 6.5);
  },
  get state() {
    return state;
  },
  // A driver reports the robot as it moves it
  report(next) {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener(state));
  },
  // The driver that has the robot offers: command(x, y) → whether it takes
  // the goal; canCommand(x, y); canStand(x, y) → whether it may be set
  // down right there; pickUp(); place(x, y) → the nearest pose it
  // may be set down at, or null; drop(pose); bounds() → page px rect it may
  // be carried within; mayDoze → whether it may fall asleep while it waits;
  // readsAlong → whether its eyes read along as the reader scrolls slowly.
  // Page px throughout.
  setControls(next) {
    controls = next;
  },
  releaseControls(previous) {
    if (controls === previous) controls = null;
  },
  get controls() {
    return controls;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
