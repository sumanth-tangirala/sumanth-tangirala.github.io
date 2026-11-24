// Shared by the robot's looks (./index.js). Each look is a module:
//   { id, name, radius (px: its body, for taps), extent (px its drawing may
//     reach from where it stands), draw(ctx, s, memo), busy?(s, memo),
//     bubbleAt?(s) → px above it, drawBubble?(ctx, kind, age, s),
//     icon?: { heading, x, y, scale } for its entry in the menu of looks,
//     hopTurn?: false if it hops as it lies, rather than turning to you }
// draw() is called with the context's origin where the robot stands. `s`:
//   x, y (page px), theta (its heading, screen radians; y points down),
//   t, dt (ms), R (its radius), dpr,
//   activity ("bullet" | "wake" | "search" | "drive" | "wait"),
//   speed (px/s), vx, vy, turn (rad/s),
//   open (eyes, 0…1), sleep (0…1), lift (0…1, carried), carried,
//   hop (px off the ground in a boop's hop, 0…HOP_PEAK), hopping (one is
//   under way: a look's own happy hop gives way to it),
//   mood: { happy, dizzy, startled, confused } (0…1 each),
//   gaze (screen angle it looks along), look (−1…1, that angle beside its
//   heading), pointer ({ x, y } page px, a mouse or pen, or null),
//   pointing (it is showing the reader something it faces: not the pointer),
//   unfold (0: camouflaged as the tagline's bullet … 1: itself; each look
//   draws its own camouflage and how it breaks cover), alpha.
// `memo` is the look's own state between frames (gait, trail), kept until
// the look changes.

export const AMBER = (a = 1) => `rgba(251, 177, 60, ${a})`;
export const GREY = (a = 1) => `rgba(216, 217, 221, ${a})`;
export const INK = (a = 1) => `rgba(17, 17, 17, ${a})`;
export const CREAM = (a = 1) => `rgba(255, 238, 208, ${a})`;

// px: the top of a boop's hop (RobotLayer), for looks to scale theirs by
export const HOP_PEAK = 10;

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (t) => Math.min(1, Math.max(0, t));
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
export const angleTo = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export const disc = (ctx, x, y, r, fill) => {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
};

export const pill = (ctx, cx, cy, w, h, fill) => {
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, Math.min(w, h) / 2);
  ctx.fillStyle = fill;
  ctx.fill();
};

// The tagline's bullet, which each look camouflages itself as on load
export const BULLET_RADIUS = 6.5;
