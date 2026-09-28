// The robot driving a planned path, shared by the hero and the page robot.

export const DRIVE_SPEED = 150; // px/s when cruising
const DRIVE_RAMP_MS = 700; // to reach cruising speed, and to stop
// The path turns sharply at its nodes; the robot's heading is smoothed over
// this stretch of path so it turns through each corner instead of snapping
const HEADING_WINDOW = 14;
// An approach eases to a stop over its last few px, and never crawls slower
// than this before it arrives
const STOP_PX = 24;
const CREEP_SPEED = 12; // px/s

const lerp = (a, b, t) => a + (b - a) * t;

// Arc-length parametrised points and headings along a path
const along = (path) => {
  const lengths = [0];
  for (let i = 1; i < path.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  }
  const total = lengths[lengths.length - 1];
  const pointAt = (s) => {
    const d = Math.min(total, Math.max(0, s));
    let lo = 0;
    let hi = lengths.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lengths[mid] <= d) lo = mid;
      else hi = mid;
    }
    const span = lengths[hi] - lengths[lo] || 1;
    const t = (d - lengths[lo]) / span;
    return [lerp(path[lo][0], path[hi][0], t), lerp(path[lo][1], path[hi][1], t)];
  };
  const headingAt = (s) => {
    const [ax, ay] = pointAt(s - HEADING_WINDOW);
    const [bx, by] = pointAt(s + HEADING_WINDOW);
    return Math.atan2(by - ay, bx - ax);
  };
  return { total, pointAt, headingAt };
};

// Distance travelled after `t` ms: speed ramps up linearly, cruises, and ramps
// down to stop exactly at `length` (a trapezoid, or a triangle if short)
const driveProfile = (length) => {
  const v = DRIVE_SPEED / 1000; // px/ms
  const a = v / DRIVE_RAMP_MS;
  if (length >= v * DRIVE_RAMP_MS) {
    const duration = length / v + DRIVE_RAMP_MS;
    return {
      duration,
      at: (t) => {
        if (t <= DRIVE_RAMP_MS) return 0.5 * a * t * t;
        if (t < duration - DRIVE_RAMP_MS) return 0.5 * v * DRIVE_RAMP_MS + v * (t - DRIVE_RAMP_MS);
        return length - 0.5 * a * (duration - t) ** 2;
      },
    };
  }
  const ramp = Math.sqrt(length / a);
  return {
    duration: 2 * ramp,
    at: (t) => (t <= ramp ? 0.5 * a * t * t : length - 0.5 * a * (2 * ramp - t) ** 2),
  };
};

// `plan`: { path, end }, driven at a steady cruising speed
export const createDrive = (plan, startedAt) => {
  const { end } = plan;
  const { total, pointAt, headingAt } = along(plan.path);
  const profile = driveProfile(total);
  return {
    startedAt,
    end,
    // { x, y, theta, done } at `time`
    poseAt(time) {
      const t = time - startedAt;
      if (t >= profile.duration) return { ...end, done: true };
      const s = profile.at(t);
      const [x, y] = pointAt(s);
      return { x, y, theta: headingAt(s), done: false };
    },
  };
};

// `plan`: { path, end }, driven at a speed proportional to the distance left
// (distance / `timeConstant` s): fast from far away, slowing as it nears the
// goal, but never below `minSpeed` until the last few px, where it eases to
// a stop. It speeds up at `accel` px/s² at most, and never beyond `maxSpeed`.
export const createApproach = (plan, { timeConstant, minSpeed, maxSpeed, accel }) => {
  const { end } = plan;
  const { total, pointAt, headingAt } = along(plan.path);
  let s = 0;
  let speed = 0;
  return {
    startHeading: headingAt(0),
    // { x, y, theta, done } after `dt` more ms
    advance(dt) {
      const seconds = dt / 1000;
      const left = total - s;
      const floor = Math.max(CREEP_SPEED, minSpeed * Math.min(1, left / STOP_PX));
      const wanted = Math.min(maxSpeed, Math.max(floor, left / timeConstant));
      speed = Math.min(wanted, speed + accel * seconds);
      s = Math.min(total, s + speed * seconds);
      if (total - s < 0.5) return { ...end, done: true };
      const [x, y] = pointAt(s);
      return { x, y, theta: headingAt(s), done: false };
    },
  };
};
