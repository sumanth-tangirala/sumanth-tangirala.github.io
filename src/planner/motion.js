// Motion model for the planner. A model steers from a state towards a point
// (to grow the tree) and connects two states exactly (to rewire it). Both
// return the curve followed, as a polyline, its length and the end state.
// States are { x, y, theta }; x grows right, y grows down, and theta turns
// the same way as atan2(dy, dx) in those coordinates.

// Point-robot: straight lines, heading = direction of travel
export const holonomic = {
  name: "holonomic",
  candidates: 1, // Euclidean nearest is exact
  distanceTo: (from, x, y) => Math.hypot(x - from.x, y - from.y),
  steer(from, x, y, maxLength) {
    const d = Math.hypot(x - from.x, y - from.y);
    if (d < 1) return null;
    const s = Math.min(maxLength, d);
    const theta = Math.atan2(y - from.y, x - from.x);
    const end = { x: from.x + (Math.cos(theta) * s), y: from.y + (Math.sin(theta) * s), theta };
    return { points: [[from.x, from.y], [end.x, end.y]], length: s, end };
  },
  connect(from, to) {
    const d = Math.hypot(to.x - from.x, to.y - from.y);
    if (d < 1e-9) return null;
    const theta = Math.atan2(to.y - from.y, to.x - from.x);
    return { points: [[from.x, from.y], [to.x, to.y]], length: d, end: { x: to.x, y: to.y, theta } };
  },
};
