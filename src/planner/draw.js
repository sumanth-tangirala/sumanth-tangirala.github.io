// Drawing the planner and its robot, shared by the hero and the page robot.

// The plan and the goal are in the page's text grey, so they stay in the
// background; only the robot is amber
export const GREY = (alpha) => `rgba(216, 217, 221, ${alpha})`;
export const AMBER = (alpha) => `rgba(251, 177, 60, ${alpha})`;
export const ROBOT_RADIUS = 6.5;

export const EDGE_ALPHA = 0.07;
export const FRONTIER_ALPHA = 0.11; // new branches, just above settled ones (0.07)
export const FRONTIER_MS = 420; // how long a new branch stays bright
// New branches are stroked in this many age groups, one path each, so
// branches fanning out of the same node don't stack up their opacity
const FRONTIER_GROUPS = 4;

const lerp = (a, b, t) => a + (b - a) * t;

const traceEdge = (ctx, edge) => {
  ctx.moveTo(edge[0][0], edge[0][1]);
  for (let k = 1; k < edge.length; k++) ctx.lineTo(edge[k][0], edge[k][1]);
};

// The tree: settled branches in one path; recent ones on top in a few age
// groups, brighter the newer they are. `births[i]` is when node i was added.
// Scale it with ctx.globalAlpha.
export const drawTree = (ctx, nodes, births, time) => {
  const groups = Array.from({ length: FRONTIER_GROUPS }, () => []);
  ctx.beginPath();
  for (let i = 1; i < nodes.length; i++) {
    const age = time - births[i];
    if (age < FRONTIER_MS) {
      groups[Math.floor((age / FRONTIER_MS) * FRONTIER_GROUPS)].push(i);
      continue;
    }
    traceEdge(ctx, nodes[i].edge);
  }
  ctx.strokeStyle = `rgba(255, 255, 255, ${EDGE_ALPHA})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  groups.forEach((group, g) => {
    if (!group.length) return;
    ctx.beginPath();
    for (const i of group) traceEdge(ctx, nodes[i].edge);
    const fade = (g + 0.5) / FRONTIER_GROUPS;
    ctx.strokeStyle = `rgba(255, 255, 255, ${lerp(FRONTIER_ALPHA, EDGE_ALPHA, fade).toFixed(3)})`;
    ctx.stroke();
  });
};

export const strokePath = (ctx, path, alpha, width) => {
  if (!path || alpha <= 0) return;
  ctx.beginPath();
  path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = GREY(alpha);
  ctx.lineWidth = width;
  ctx.stroke();
};

export const drawGoal = (ctx, [x, y], alpha) => {
  if (alpha <= 0) return;
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
  ctx.strokeStyle = GREY(alpha);
  ctx.lineWidth = 1.25;
  ctx.stroke();
};

// The robot, from above: a round TurtleBot base with a dark mark showing
// which way it faces
export const drawRobot = (ctx, robot) => {
  if (!robot || robot.alpha <= 0) return;
  ctx.save();
  ctx.translate(robot.x, robot.y);
  ctx.rotate(robot.theta);
  ctx.beginPath();
  ctx.arc(0, 0, ROBOT_RADIUS, 0, 2 * Math.PI);
  ctx.lineWidth = 3;
  ctx.strokeStyle = `rgba(17, 17, 17, ${0.9 * robot.alpha})`; // separates it from lines beneath
  ctx.stroke();
  ctx.fillStyle = AMBER(0.95 * robot.alpha);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(5.5, 0);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = `rgba(17, 17, 17, ${0.75 * robot.alpha})`;
  ctx.stroke();
  ctx.restore();
};
