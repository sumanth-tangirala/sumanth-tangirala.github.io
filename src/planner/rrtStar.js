// A small incremental RRT* planner for the hero background.
//
// The planner works in the hero's pixel space. Obstacles are axis-aligned
// rectangles (the hero content, inflated). The motion model (./motion)
// decides how the robot moves between states. `grow(n)` adds up to n nodes and
// rewires, so the tree can be animated a few nodes per frame.

import { holonomic } from "./motion";

const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// Park–Miller LCG so a seed reproduces a tree exactly
export const seededRandom = (seed) => {
  let state = seed % 2147483647 || 1;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
};

export function createRRTStar({
  width,
  height,
  start, // { x, y, theta }
  goal, // [x, y]; reached at any heading
  obstacles,
  stepSize,
  rewireRadius = stepSize * 2,
  goalRadius = stepSize,
  goalBias = 0.03,
  // New nodes this close to the goal also try driving straight onto it
  goalConnectRadius = stepSize * 3,
  motion = holonomic,
  random = Math.random,
}) {
  // edge: the polyline from the parent to this node
  const nodes = [{ x: start.x, y: start.y, theta: start.theta || 0, parent: -1, cost: 0, edge: null }];
  const children = [[]];
  let goalNode = -1;

  const isBlocked = (x, y) =>
    x < 0 || y < 0 || x > width || y > height ||
    obstacles.some((o) => x > o.left && x < o.right && y > o.top && y < o.bottom);

  const isPolylineFree = (points) => {
    for (let k = 1; k < points.length; k++) {
      const [ax, ay] = points[k - 1];
      const [bx, by] = points[k];
      const length = distance(ax, ay, bx, by);
      for (let s = 0; s <= length; s += 3) {
        const t = length ? s / length : 0;
        if (isBlocked(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
      }
    }
    return !isBlocked(points[points.length - 1][0], points[points.length - 1][1]);
  };

  // Rewiring changes a node's cost; its whole subtree shifts with it
  const shiftSubtree = (index, delta) => {
    const stack = [...children[index]];
    while (stack.length) {
      const i = stack.pop();
      nodes[i].cost += delta;
      stack.push(...children[i]);
    }
  };

  const setParent = (index, parent, connection, cost) => {
    const node = nodes[index];
    const siblings = children[node.parent];
    siblings.splice(siblings.indexOf(index), 1);
    children[parent].push(index);
    const delta = cost - node.cost;
    node.parent = parent;
    node.edge = connection.points;
    node.theta = connection.end.theta;
    node.cost = cost;
    if (delta) shiftSubtree(index, delta);
  };

  const insert = (state, parent, connection, cost) => {
    const id = nodes.push({ x: state.x, y: state.y, theta: state.theta, parent, cost, edge: connection.points }) - 1;
    children.push([]);
    children[parent].push(id);
    if (distance(state.x, state.y, goal[0], goal[1]) <= goalRadius &&
        (goalNode < 0 || cost < nodes[goalNode].cost)) {
      goalNode = id;
    }
    return id;
  };

  const addNode = () => {
    const useGoal = random() < goalBias;
    const qx = useGoal ? goal[0] : random() * width;
    const qy = useGoal ? goal[1] : random() * height;
    if (isBlocked(qx, qy)) return false;

    // The k Euclidean-nearest nodes, then the one the robot reaches soonest
    const k = motion.candidates;
    const closest = []; // [distance, index], ascending
    for (let i = 0; i < nodes.length; i++) {
      const d = distance(nodes[i].x, nodes[i].y, qx, qy);
      if (closest.length === k && d >= closest[k - 1][0]) continue;
      let at = closest.length;
      while (at > 0 && closest[at - 1][0] > d) at--;
      closest.splice(at, 0, [d, i]);
      if (closest.length > k) closest.pop();
    }
    if (closest[0][0] < 1) return false;
    let nearest = closest[0][1];
    if (k > 1) {
      let best = Infinity;
      for (const [, i] of closest) {
        const d = motion.distanceTo(nodes[i], qx, qy);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      if (best === Infinity) return false;
    }

    const steered = motion.steer(nodes[nearest], qx, qy, stepSize);
    if (!steered || !isPolylineFree(steered.points)) return false;
    const state = steered.end;

    // Choose the cheapest collision-free parent nearby
    let parent = nearest;
    let connection = steered;
    let cost = nodes[nearest].cost + steered.length;
    const near = [];
    for (let i = 0; i < nodes.length; i++) {
      if (distance(nodes[i].x, nodes[i].y, state.x, state.y) > rewireRadius) continue;
      near.push(i);
      if (i === nearest) continue;
      const candidate = motion.connect(nodes[i], state);
      if (candidate && nodes[i].cost + candidate.length < cost && isPolylineFree(candidate.points)) {
        cost = nodes[i].cost + candidate.length;
        parent = i;
        connection = candidate;
      }
    }
    const id = insert(state, parent, connection, cost);

    // Rewire neighbours through the new node when that is cheaper
    for (const i of near) {
      if (i === parent || i === 0) continue;
      const candidate = motion.connect(nodes[id], nodes[i]);
      if (candidate && cost + candidate.length < nodes[i].cost && isPolylineFree(candidate.points)) {
        setParent(i, id, candidate, cost + candidate.length);
      }
    }

    // Try driving straight onto the goal (reached at any heading)
    if (goalNode < 0 && distance(state.x, state.y, goal[0], goal[1]) <= goalConnectRadius) {
      const toGoal = motion.steer(nodes[id], goal[0], goal[1], Infinity);
      if (toGoal && distance(toGoal.end.x, toGoal.end.y, goal[0], goal[1]) <= goalRadius &&
          isPolylineFree(toGoal.points)) {
        insert(toGoal.end, id, toGoal, cost + toGoal.length);
      }
    }
    return true;
  };

  const bestGoalIndex = () => {
    if (goalNode < 0) return -1;
    // Costs change as the tree rewires, so re-pick the best node each call
    let best = goalNode;
    for (let i = 0; i < nodes.length; i++) {
      if (distance(nodes[i].x, nodes[i].y, goal[0], goal[1]) <= goalRadius &&
          nodes[i].cost < nodes[best].cost) best = i;
    }
    return best;
  };

  return {
    nodes,
    motion,
    grow(count, maxAttempts = count * 8) {
      let added = 0;
      for (let a = 0; added < count && a < maxAttempts; a++) if (addNode()) added++;
      return added;
    },
    hasReachedGoal: () => goalNode >= 0,
    bestGoalIndex,
    // The node that gets closest to the goal so far (for showing the search)
    closestToGoal() {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const d = distance(nodes[i].x, nodes[i].y, goal[0], goal[1]);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return { index: best, distance: bestDist };
    },
    isDescendant(index, ancestor) {
      for (let i = index; i >= 0; i = nodes[i].parent) if (i === ancestor) return true;
      return false;
    },
    // Node positions from the root to `index` (cheap, for comparing routes)
    nodesFrom(index) {
      const path = [];
      for (let i = index; i >= 0; i = nodes[i].parent) path.push([nodes[i].x, nodes[i].y]);
      return path.reverse();
    },
    // The full curve from the root to `index`, following each edge
    pathFrom(index) {
      const edges = [];
      for (let i = index; nodes[i].parent >= 0; i = nodes[i].parent) edges.push(nodes[i].edge);
      const path = [[nodes[0].x, nodes[0].y]];
      for (let e = edges.length - 1; e >= 0; e--) path.push(...edges[e].slice(1));
      return path;
    },
    pathToGoal() {
      const best = bestGoalIndex();
      return best < 0 ? null : this.pathFrom(best);
    },
  };
}
