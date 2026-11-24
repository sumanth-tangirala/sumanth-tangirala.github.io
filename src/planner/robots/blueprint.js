import { AMBER, angleTo, clamp01, easeOut, GREY, HOP_PEAK, INK, lerp } from "./shared";

// The robot as a technical drawing of itself, in the planner tree's own
// hairlines: its base's outline, the two wheels in their wells, the lidar
// with its centre mark, all in 1px grey on a fill the colour of the page
// (so the tree's lines don't show through it). Its one colour is its
// heading arrow, in amber. Like an engineer's drawing it annotates itself,
// faintly, one note at a time:
//   watching:  a dashed bearing line toward your pointer, with its angle,
//              while the pointer moves (it fades a second after it stops)
//   search:    a dashed sensing ring sweeps outward
//   drive:     the heading arrow is its velocity vector, longer as it goes
//              faster
//   happy:     a few short emphasis ticks around it
//   dizzy:     rotation arrows around it
//   carried:   its footprint stays on the ground, dashed, with a dimension
//              line marking the lift, "z"
//   confused:  the bearing to where it couldn't go, marked ×
//   asleep:    every line goes dashed and dim

const R = 8.5; // px: the base's radius
const LINE = (a) => GREY(0.75 * a); // its outlines
const LINE_W = 1;
const NOTE = (a) => GREY(0.42 * a); // annotations: fainter than the drawing
const LABEL = (a) => GREY(0.5 * a);
const FONT = "500 9px -apple-system, system-ui, sans-serif";
const WHEEL = { length: 5.6, width: 2, y: 5.6 }; // px, in its frame
const LIDAR = { x: -1.5, r: 2.2, mark: 3.2 }; // px: centre, radius, centre mark
// The heading arrow (amber): from its rim; longer with speed (velocity)
const ARROW = { from: R + 1, rest: 3.5, perSpeed: 0.085, max: 14, head: 2.2 };
const BEARING = { from: R + 3, to: R + 22, dash: [2, 2.5] };
const BEARING_HOLD_MS = 250; // shown this long after the pointer last moved,
const BEARING_FADE_MS = 750; // then fades over this long
const RING = { every: 1150, from: R + 2, to: R + 17, dash: [1.5, 3] }; // search
const LIFT_PX = 8; // px it rises when carried
const LIFT_SCALE = 0.06;

const lineDash = (ctx, sleep) => ctx.setLineDash(sleep > 0.01 ? [2, 2.2 * sleep] : []);

// Its drawing, in its own frame (x ahead)
const drawBody = (ctx, s, alpha) => {
  // The base: page-coloured, on a dark edge that keeps tree lines off it
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = INK(s.alpha); // the fill stays the page, even when it dims
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK(0.9 * s.alpha);
  ctx.stroke();
  ctx.lineWidth = LINE_W;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.strokeStyle = LINE(alpha);
  lineDash(ctx, s.sleep);
  ctx.stroke();
  // The wheels in their wells, and the lidar with its centre mark
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.rect(-WHEEL.length / 2, side * WHEEL.y - WHEEL.width / 2, WHEEL.length, WHEEL.width);
    lineDash(ctx, s.sleep);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(LIDAR.x, 0, LIDAR.r, 0, Math.PI * 2);
  lineDash(ctx, s.sleep);
  ctx.stroke();
  // Its centre mark is its eye: it shrinks to a point as it blinks
  const mark = LIDAR.mark * (0.3 + 0.7 * s.open);
  ctx.beginPath();
  ctx.moveTo(LIDAR.x - mark, 0);
  ctx.lineTo(LIDAR.x + mark, 0);
  ctx.moveTo(LIDAR.x, -mark);
  ctx.lineTo(LIDAR.x, mark);
  ctx.setLineDash([]);
  ctx.strokeStyle = GREY(0.45 * alpha);
  ctx.stroke();
  // The heading arrow: its velocity vector
  const length = ARROW.rest + Math.min(ARROW.max, s.speed * ARROW.perSpeed);
  const tip = ARROW.from + length;
  ctx.beginPath();
  ctx.moveTo(ARROW.from - 1.5, 0);
  ctx.lineTo(tip, 0);
  ctx.moveTo(tip - ARROW.head, -ARROW.head * 0.75);
  ctx.lineTo(tip, 0);
  ctx.lineTo(tip - ARROW.head, ARROW.head * 0.75);
  ctx.setLineDash([]);
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = AMBER(0.9 * alpha * (1 - 0.4 * s.sleep));
  ctx.stroke();
};

// A tiny label in the drawing's hand, set beside a point in the direction
// it lies from the robot, so it never sits on the robot itself
const label = (ctx, text, x, y, dir, alpha) => {
  ctx.font = FONT;
  const c = Math.cos(dir);
  ctx.textAlign = c > 0.35 ? "left" : c < -0.35 ? "right" : "center";
  ctx.textBaseline = Math.sin(dir) > 0.35 ? "top" : Math.sin(dir) < -0.35 ? "alphabetic" : "middle";
  ctx.fillStyle = LABEL(alpha);
  ctx.fillText(text, x, y);
};

// Watching: the bearing to your pointer, and its angle from its heading
const drawBearing = (ctx, s, theta, alpha) => {
  const off = angleTo(theta, s.gaze);
  const c = Math.cos(s.gaze);
  const sn = Math.sin(s.gaze);
  ctx.setLineDash(BEARING.dash);
  ctx.lineWidth = 1;
  ctx.strokeStyle = NOTE(alpha);
  ctx.beginPath();
  ctx.moveTo(c * BEARING.from, sn * BEARING.from);
  ctx.lineTo(c * BEARING.to, sn * BEARING.to);
  ctx.stroke();
  const degrees = Math.round(Math.abs(off) * (180 / Math.PI));
  label(ctx, `${degrees}°`, c * (BEARING.to + 3), sn * (BEARING.to + 3), s.gaze, alpha);
};

// Searching: a dashed ring, sweeping outward from it
const drawRing = (ctx, s, alpha) => {
  const k = (s.t % RING.every) / RING.every;
  ctx.setLineDash(RING.dash);
  ctx.lineWidth = 1;
  ctx.strokeStyle = NOTE(alpha * 0.8 * (1 - k) ** 1.5);
  ctx.beginPath();
  ctx.arc(0, 0, lerp(RING.from, RING.to, easeOut(k)), 0, Math.PI * 2);
  ctx.stroke();
};

// Happy: short ticks of emphasis, all round
const drawTicks = (ctx, level, alpha) => {
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = GREY(0.6 * level * alpha);
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3 + Math.PI / 6;
    const r0 = R + 3.5 + 1.5 * (1 - level);
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * (r0 + 3), Math.sin(a) * (r0 + 3));
  }
  ctx.stroke();
};

// Dizzy: rotation arrows round it, the way it spins (clockwise)
const drawRotation = (ctx, level, alpha) => {
  const r = R + 5;
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = NOTE(level * alpha * 1.2);
  for (const start of [-2.4, 0.74]) {
    const end = start + 1.75;
    ctx.beginPath();
    ctx.arc(0, 0, r, start, end);
    // the head, at the end, along the circle
    const tx = Math.cos(end) * r;
    const ty = Math.sin(end) * r;
    const back = end - 0.32;
    ctx.moveTo(Math.cos(back) * (r + 2), Math.sin(back) * (r + 2));
    ctx.lineTo(tx, ty);
    ctx.lineTo(Math.cos(back) * (r - 2), Math.sin(back) * (r - 2));
    ctx.stroke();
  }
};

// Confused: the bearing to where it couldn't go, marked ×
const drawBlocked = (ctx, s, level, alpha) => {
  const c = Math.cos(s.gaze);
  const sn = Math.sin(s.gaze);
  ctx.setLineDash(BEARING.dash);
  ctx.lineWidth = 1;
  ctx.strokeStyle = NOTE(level * alpha);
  ctx.beginPath();
  ctx.moveTo(c * BEARING.from, sn * BEARING.from);
  ctx.lineTo(c * (BEARING.to - 3), sn * (BEARING.to - 3));
  ctx.stroke();
  const x = c * (BEARING.to + 1);
  const y = sn * (BEARING.to + 1);
  ctx.setLineDash([]);
  ctx.strokeStyle = GREY(0.6 * level * alpha);
  ctx.beginPath();
  ctx.moveTo(x - 2.2, y - 2.2);
  ctx.lineTo(x + 2.2, y + 2.2);
  ctx.moveTo(x + 2.2, y - 2.2);
  ctx.lineTo(x - 2.2, y + 2.2);
  ctx.stroke();
};

// Carried: its footprint, dashed, where it stood, and the lift dimensioned
const drawLift = (ctx, rise, lift, alpha) => {
  ctx.lineWidth = 1;
  ctx.setLineDash([1.5, 2]);
  ctx.strokeStyle = NOTE(lift * alpha);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();
  // The dimension line, right of it: extension ticks at both heights, a
  // line between, and its name
  const x = R + 5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x - 2, 0);
  ctx.lineTo(x + 2, 0);
  ctx.moveTo(x - 2, -rise);
  ctx.lineTo(x + 2, -rise);
  ctx.moveTo(x, 0);
  ctx.lineTo(x, -rise);
  ctx.stroke();
  label(ctx, "z", x + 3, -rise / 2, 0, lift * alpha);
};

const look = {
  id: "blueprint",
  name: "Blueprint",
  radius: R,
  reach: R + 1.5,
  extent: R + 34,

  draw(ctx, s, memo) {
    const a = s.alpha;
    ctx.save();
    // Whole device pixels at its centre, so straight lines stay crisp
    const m = ctx.getTransform();
    ctx.translate((Math.round(m.e) - m.e) / m.a, (Math.round(m.f) - m.f) / m.d);
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";

    // Watching: note when the pointer last moved
    const watching = (s.activity === "wait" || s.activity === "wake") && s.pointer && !s.reduced;
    if (s.pointer && (!memo.pointer || memo.pointer.x !== s.pointer.x || memo.pointer.y !== s.pointer.y)) {
      memo.pointer = { x: s.pointer.x, y: s.pointer.y };
      memo.movedAt = s.t;
    }
    const since = s.t - (memo.movedAt === undefined ? -Infinity : memo.movedAt);
    const far = s.pointer && Math.hypot(s.pointer.x - s.x, s.pointer.y - s.y) > R + 10;
    const bearing = watching && far ? 1 - clamp01((since - BEARING_HOLD_MS) / BEARING_FADE_MS) : 0;
    memo.bearingShown = bearing > 0;

    // Held up, or in a hop (dimensioned the same)
    const lift = Math.max(s.carried || s.lift > 0 ? s.lift : 0, clamp01(s.hop / HOP_PEAK));
    const rise = LIFT_PX * lift;
    const notes = 1 - s.sleep; // annotations quieten as it dozes
    const dim = 1 - 0.5 * s.sleep;

    // Notes on the ground, under it
    if (lift > 0.01) drawLift(ctx, rise, lift, a);
    if (s.activity === "search" && !s.reduced) drawRing(ctx, s, a * notes);
    if (bearing > 0) drawBearing(ctx, s, s.theta, a * bearing);
    if (s.mood.confused > 0) drawBlocked(ctx, s, s.mood.confused, a);

    // Itself (raised when carried)
    ctx.save();
    ctx.translate(0, -rise);
    if (lift > 0) ctx.scale(1 + LIFT_SCALE * lift, 1 + LIFT_SCALE * lift);
    if (s.mood.happy > 0) drawTicks(ctx, s.mood.happy, a);
    if (s.mood.dizzy > 0) drawRotation(ctx, s.mood.dizzy, a);
    ctx.rotate(s.theta);
    drawBody(ctx, s, a * dim);
    ctx.restore();
    ctx.restore();
  },

  busy(s, memo) {
    if (s.reduced) return false;
    return s.activity === "search" || !!memo.bearingShown;
  },

  bubbleAt(s) {
    return R + 9 + LIFT_PX * Math.max(s.lift, clamp01(s.hop / HOP_PEAK));
  },
};

export default look;
