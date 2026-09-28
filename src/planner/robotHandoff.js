// One robot, two drivers: the hero's planner, and (further down the page)
// the page robot. This says which one has it, and where the hero's robot is
// when the page robot takes it over.

const listeners = new Set();
let owner = "hero";
let heroPose = null; // hero-local px: { x, y, theta }
let handback = null;

const emit = () => listeners.forEach((listener) => listener(owner));

export const robotHandoff = {
  get owner() {
    return owner;
  },
  get heroPose() {
    return heroPose;
  },
  // The hero planner reports its robot as it moves
  reportHeroPose(pose) {
    heroPose = pose && { x: pose.x, y: pose.y, theta: pose.theta };
  },
  takeOver() {
    owner = "page";
    emit();
  },
  // The page robot gives it back at `pose` (hero-local px), or at the hero's
  // own starting point if null
  handBack(pose) {
    owner = "hero";
    handback = pose;
    emit();
  },
  consumeHandback() {
    const pose = handback;
    handback = null;
    return pose;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
