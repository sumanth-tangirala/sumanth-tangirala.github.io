// The robot driving a planned path, shared by the hero and the page robot.

export const DRIVE_SPEED = 150; // px/s when cruising
const DRIVE_RAMP_MS = 700; // to reach cruising speed, and to stop
// The path turns sharply at its nodes; the robot's heading is smoothed over
// this stretch of path so it turns through each corner instead of snapping
const HEADING_WINDOW = 14;

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

// Distance travelled after `t` ms at up to `v` px/ms, speeding up and slowing
// down at `a` px/ms²: it ramps up, cruises, and ramps down to stop exactly at
// `length` (a trapezoid, or a triangle if short)
const driveProfile = (length, v, a) => {
  const ramp = v / a;
  if (length >= v * ramp) {
    const duration = length / v + ramp;
    return {
      duration,
      at: (t) => {
        if (t <= ramp) return 0.5 * a * t * t;
        if (t < duration - ramp) return 0.5 * v * ramp + v * (t - ramp);
        return length - 0.5 * a * (duration - t) ** 2;
      },
    };
  }
  const half = Math.sqrt(length / a);
  return {
    duration: 2 * half,
    at: (t) => (t <= half ? 0.5 * a * t * t : length - 0.5 * a * (2 * half - t) ** 2),
  };
};

// `plan`: { path, end }, driven at a steady cruising speed
export const createDrive = (plan, startedAt) => {
  const { end } = plan;
  const { total, pointAt, headingAt } = along(plan.path);
  const v = DRIVE_SPEED / 1000;
  const profile = driveProfile(total, v, v / DRIVE_RAMP_MS);
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

// `plan`: { path, end }, driven like createDrive: it speeds up at `accel`
// px/s², cruises, and slows to a stop. It cruises at `cruise` px/s, or faster
// on a long trip: at D / (timeConstant (1 + ln(D / near))) px/s, as if each
// e-fold of distance beyond `near` px took `timeConstant` s more.
export const createApproach = (plan, { cruise, near, timeConstant, accel }) => {
  const { end } = plan;
  const { total, pointAt, headingAt } = along(plan.path);
  const long = total > near ? total / (timeConstant * (1 + Math.log(total / near))) : 0;
  const profile = driveProfile(total, Math.max(cruise, long) / 1000, accel / 1e6);
  let t = 0;
  return {
    startHeading: headingAt(0),
    // { x, y, theta, done } after `dt` more ms
    advance(dt) {
      t += dt;
      if (t >= profile.duration) return { ...end, done: true };
      const s = profile.at(t);
      const [x, y] = pointAt(s);
      return { x, y, theta: headingAt(s), done: false };
    },
  };
};
