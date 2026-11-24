import React, { memo, useEffect, useRef } from "react";
import { createRRTStar, seededRandom } from "../../../../planner/rrtStar";
import { holonomic } from "../../../../planner/motion";
import { measureObstacles } from "../../../../planner/heroObstacles";
import { createDrive } from "../../../../planner/drive";
import { drawGoal, drawTree, FRONTIER_MS, ROBOT_RADIUS, strokePath } from "../../../../planner/draw";
import { robotHandoff } from "../../../../planner/robotHandoff";
import { robotLive } from "../../../../planner/robotLive";
import { character } from "../../../../planner/character";
import styles from "./landing.module.scss";

// A live RRT* planner drawn behind the hero, for a small robot (a top-down
// TurtleBot, which can turn on the spot) that plans a route and then drives
// it, one query after another. Each query treats the hero content as
// obstacles and runs in phases:
//   search: the tree grows at a steady rate; a faint amber line follows the
//           branch that currently gets closest to the goal;
//   refine: once the goal is reached the path turns solid, and the tree keeps
//           growing and rewiring, straightening the path;
//   drive:  the tree dims and the robot drives the path to the goal. If the
//           goal was never reached, it drives to the node that got closest
//           (clear of content), if that is closer than where it started;
//           otherwise it stays and tries a new goal.
// On load the robot sits where the tagline's bullet point would be
// (data-robot-start), still for a few seconds. Then it shows itself for what
// it is: it turns around, rolls off a little, looks about, turns to you and
// says hello, and only then makes its first plan. After a
// short pause each next query starts from where the robot stopped,
// towards a newly sampled goal far enough away. The loop pauses while the
// hero is off screen; with reduced motion a single finished plan is drawn.
// While the page robot has the robot (further down the page), the hero is
// left empty; when it hands the robot back, planning starts from there.

const SEARCH_RATE_PER_MS = { wide: 0.26, narrow: 0.16 }; // nodes per ms
const REFINE_DURATION_MS = 2200;
const DRIVE_DIM_MS = 500; // the tree dims as the robot sets off
const DRIVE_TREE_ALPHA = 0.5;
const ARRIVE_HOLD_MS = 900; // at the goal before the next query
// Left alone for this many queries (no pointer, scroll or key), it goes
// home: it plans its way back to where it rolled off its bullet, yawns,
// rolls in and curls up as the bullet to sleep. Woken, it pops out with a
// start, rolls off again and carries on.
const QUIET_QUERIES = 5;
const WAKE_PAUSE_MS = 600;
const UNSOLVED_HOLD_MS = 600;
const STALL_MS = 1200; // a search that adds no nodes for this long gives up
const SWAP_FADE_MS = 700; // outgoing plan fades while the next one starts
const ENDPOINT_FADE_MS = 300;
// Where it appears on load: as a list's bullet would sit before the
// tagline's first line, centred on the height of its capitals (the line's
// visual middle; the lowercase middle leaves a disc this size hanging low),
// its edge this far (× the font size) from the text
const BULLET_GAP_EM = 0.5;
const APPEAR_MS = 300; // it fades in with the tagline
// ... and what it does there before planning: stay still, turn around, roll
// off, and look one way and the other. Each move eases in and out.
const HOME_STEP = 18; // px from its bullet to where it plans from
const WAKE_STEPS = [
  { pause: 1500 },
  { turnTo: Math.PI },
  { pause: 200 },
  { drive: HOME_STEP },
  { pause: 300 },
  { turnBy: -0.7 },
  { pause: 350 },
  { turnBy: 1.3 },
  { pause: 300 },
  { turnTo: Math.PI / 2 }, // to you
  { greet: true },
  { pause: 900 },
];
// Woken at home: out of its bullet with a start, and off its doorstep
const HOME_WAKE_STEPS = [{ pause: 500 }, { turnTo: Math.PI }, { pause: 150 }, { drive: HOME_STEP }, { pause: 300 }];
const WAKE_TURN_RATE = 3.5; // rad/s
const WAKE_SPEED = 45; // px/s
const PATH_FADE_MS = 380; // search → found, and route cross-fades
const ROUTE_CHANGE_PX = 28; // mean offset that counts as a new route
const SEARCH_HYSTERESIS_PX = 8; // avoid flicking between near-equal branches
// The search line may extend along its branch at once, but jumps to another
// branch at most this often (≈3/s instead of ≈14/s), cross-fading each jump
const SEARCH_JUMP_MIN_MS = 400;
const SEARCH_JUMP_FADE_MS = 220;
const MIN_FRAME_MS = 1000 / 60 - 1; // ProMotion screens: draw at most 60fps
const MAX_FRAME_MS = 50; // clamp so a paused tab doesn't jump ahead
// Clearance kept around each piece of content (photo, text lines, links)
const OBSTACLE_MARGIN = 5;
const ENDPOINT_CLEARANCE = 12;
// Paths end inside the goal marker (radius 3.5)
const GOAL_RADIUS = 2;
// Goals are sampled where the canvas is fully visible (its mask in
// landing.module.scss: clear from 150px down to 90% of the hero)
const VISIBLE_TOP = 150;
const VISIBLE_BOTTOM = 0.88; // × hero height
const WIDE_BAND_TOP = 110; // fallback band when the visible one has no valid goal
const WIDE_BAND_BOTTOM = 0.94;
// With the hero scrolled part-way off screen, goals stay on the part still
// shown: this far (px) below the screen's top (under the nav) and above its
// bottom
const ON_SCREEN = { below: 100, above: 40 };
// Kept faint so the name, not the planner, holds the eye (the page robot's
// plan, beside the reading, is fainter still)
const TREE_ALPHA = 0.7;
const SEARCH_STYLE = { alpha: 0.21, width: 1.25 };
const FOUND_STYLE = { alpha: 0.35, width: 1.5 };
const GOAL_ALPHA = 0.5;

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const angleTo = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const lerp = (a, b, t) => a + (b - a) * t;

// A goal at least `clearance` from content and the minimum distance from
// `start`: the diagonal of a square whose side is half the smaller dimension
// of the hero as shown. It prefers the clearly visible band and widens only if
// that has no valid point. `shown`: the part of the hero on screen ({ top,
// bottom }, hero px); goals keep to it while it has room for one, so the
// robot never drives off screen. Only then is the whole hero used (and the
// distance its own).
const sampleGoal = (start, width, height, obstacles, random, clearance, shown) => {
  const side = Math.max(width * 0.04, clearance);
  const isClear = (x, y) =>
    obstacles.every(
      (o) =>
        x < o.left - clearance || x > o.right + clearance ||
        y < o.top - clearance || y > o.bottom + clearance,
    );
  const bands = [
    [VISIBLE_TOP, height * VISIBLE_BOTTOM],
    [WIDE_BAND_TOP, height * WIDE_BAND_BOTTOM],
  ];
  const tries = [
    ...bands.map(([top, bottom]) => ({
      top: Math.max(top, shown.top + ON_SCREEN.below),
      bottom: Math.min(bottom, shown.bottom - ON_SCREEN.above),
      span: Math.min(width, shown.bottom - shown.top),
    })),
    ...bands.map(([top, bottom]) => ({ top, bottom, span: Math.min(width, height) })),
  ];
  for (const { top, bottom, span } of tries) {
    if (bottom <= top) continue;
    const minDistance = (Math.SQRT2 * span) / 2;
    for (let i = 0; i < 400; i++) {
      const x = lerp(side, width - side, random());
      const y = lerp(top, bottom, random());
      if (Math.hypot(x - start.x, y - start.y) >= minDistance && isClear(x, y)) return [x, y];
    }
  }
  return null;
};

// Mean distance from each point of `a` to the nearest vertex of `b`
const routeOffset = (a, b) => {
  if (!a || !b) return Infinity;
  let total = 0;
  for (const [x, y] of a) {
    let best = Infinity;
    for (const [u, v] of b) best = Math.min(best, Math.hypot(x - u, y - v));
    total += best;
  }
  return total / a.length;
};

// One planning query and its animation state. `from` is the robot's pose.
const createQuery = (hero, random, { from, createdAt, goal: requested = null }) => {
  const rect = hero.getBoundingClientRect();
  const { width, height } = rect;
  const shown = { top: Math.max(0, -rect.top), bottom: Math.min(height, window.innerHeight - rect.top) };
  const narrow = width <= 720;
  const obstacles = measureObstacles(hero, OBSTACLE_MARGIN + robotLive.extraClearance);
  // The first query is composed: lower left to upper right (always farther
  // apart than the minimum). If no valid goal exists from `from`, which a
  // cramped layout could cause, fall back to that composed query.
  const composedGoal = [width * (narrow ? 0.9 : 0.93), height * (narrow ? 0.2 : 0.24)];
  const composedStart = { x: width * (narrow ? 0.1 : 0.07), y: height * 0.88 };
  composedStart.theta = Math.atan2(composedGoal[1] - composedStart.y, composedGoal[0] - composedStart.x);
  const motion = holonomic;
  const clearance = ENDPOINT_CLEARANCE;
  // A goal the reader asked for, else one sampled
  const sampled = from && (requested || sampleGoal(from, width, height, obstacles, random, clearance, shown));
  const [start, goal] = sampled ? [from, sampled] : [composedStart, composedGoal];
  // Whether the robot may stop here: clear of content and the edges
  const hasTurningRoom = (x, y) =>
    x >= clearance && x <= width - clearance && y >= clearance && y <= height - clearance &&
    obstacles.every(
      (o) => x < o.left - clearance || x > o.right + clearance || y < o.top - clearance || y > o.bottom + clearance,
    );
  const maxNodes = Math.round(Math.min(2400, Math.max(700, (width * height) / 550)));
  const planner = createRRTStar({
    width,
    height,
    start,
    goal,
    obstacles,
    stepSize: narrow ? 22 : 30,
    goalRadius: GOAL_RADIUS,
    motion,
    random,
  });
  const rate = SEARCH_RATE_PER_MS[narrow ? "narrow" : "wide"];
  const births = [createdAt];
  let lastTime = createdAt;
  let searchTarget = 0;
  let lastJumpAt = -Infinity;
  let searchFades = []; // [{ path, from }]: search lines left behind by jumps
  let foundAt = 0;
  let foundNodes = 0;
  let grewAt = createdAt;
  let stalled = false;
  let route = null; // the found route being shown: { path, nodes }
  let fading = null; // { path, from }: the previous route, fading out
  let paths = [];

  return {
    width,
    height,
    start,
    goal,
    requested: !!requested,
    obstacles,
    motion,
    planner,
    births,
    createdAt,
    treeAlpha: 1,
    get paths() {
      return paths;
    },
    get solved() {
      return foundAt > 0;
    },
    // The final route and the pose the robot ends in
    get plan() {
      if (!foundAt) return null;
      const end = planner.nodes[planner.bestGoalIndex()];
      return { path: route.path, end: { x: end.x, y: end.y, theta: end.theta } };
    },

    get stalled() {
      return stalled;
    },

    // When the goal was never reached: the route to the node closest to it
    // that the robot can safely stop at and that is closer than the start,
    // shown as the found route (or null)
    fallback() {
      let best = -1;
      let bestDistance = Math.hypot(start.x - goal[0], start.y - goal[1]);
      planner.nodes.forEach((node, i) => {
        if (i === 0 || !hasTurningRoom(node.x, node.y)) return;
        const d = Math.hypot(node.x - goal[0], node.y - goal[1]);
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      });
      if (best < 0) return null;
      const end = planner.nodes[best];
      route = { path: planner.pathFrom(best), nodes: planner.nodesFrom(best) };
      paths = [{ path: route.path, ...FOUND_STYLE }];
      return { path: route.path, end: { x: end.x, y: end.y, theta: end.theta } };
    },

    step(time) {
      const dt = time - lastTime;
      lastTime = time;

      // Grow: steady while searching, then ease out to the full tree
      let target;
      if (!foundAt) {
        target = planner.nodes.length + Math.max(1, Math.round(rate * dt));
      } else {
        const t = Math.min(1, (time - foundAt) / REFINE_DURATION_MS);
        target = Math.round(foundNodes + (maxNodes - foundNodes) * easeOutCubic(t));
      }
      const before = planner.nodes.length;
      planner.grow(Math.max(0, Math.min(maxNodes, target) - before));
      for (let i = before; i < planner.nodes.length; i++) births[i] = time;
      if (planner.nodes.length > before) grewAt = time;
      else if (!foundAt && time - grewAt > STALL_MS) stalled = true;

      if (!foundAt && planner.hasReachedGoal()) {
        foundAt = time;
        foundNodes = planner.nodes.length;
      }

      paths = [];
      searchFades = searchFades.filter((f) => time - f.from < SEARCH_JUMP_FADE_MS);
      for (const f of searchFades) {
        const out = 1 - (time - f.from) / SEARCH_JUMP_FADE_MS;
        paths.push({ path: f.path, alpha: SEARCH_STYLE.alpha * out, width: SEARCH_STYLE.width });
      }
      if (!foundAt) {
        // Follow the branch nearest the goal, switching only for a clear gain:
        // growing along the same branch is immediate, jumping branches is paced
        const closest = planner.closestToGoal();
        const current = planner.nodes[searchTarget];
        const currentDistance = Math.hypot(current.x - goal[0], current.y - goal[1]);
        if (closest.index !== searchTarget && closest.distance < currentDistance - SEARCH_HYSTERESIS_PX) {
          if (planner.isDescendant(closest.index, searchTarget)) {
            searchTarget = closest.index;
          } else if (time - lastJumpAt >= SEARCH_JUMP_MIN_MS) {
            searchFades.push({ path: planner.pathFrom(searchTarget), from: time });
            searchTarget = closest.index;
            lastJumpAt = time;
          }
        }
        const fadeIn = Math.min(1, (time - lastJumpAt) / SEARCH_JUMP_FADE_MS);
        paths.push({ path: planner.pathFrom(searchTarget), alpha: SEARCH_STYLE.alpha * fadeIn, width: SEARCH_STYLE.width });
        return;
      }

      const bestIndex = planner.bestGoalIndex();
      const best = { path: planner.pathFrom(bestIndex), nodes: planner.nodesFrom(bestIndex) };
      if (route && routeOffset(best.nodes, route.nodes) > ROUTE_CHANGE_PX) fading = { path: route.path, from: time };
      route = best;
      if (fading) {
        const out = 1 - Math.min(1, (time - fading.from) / PATH_FADE_MS);
        paths.push({ path: fading.path, alpha: FOUND_STYLE.alpha * out, width: FOUND_STYLE.width });
        if (out <= 0) fading = null;
      }
      const fadeIn = Math.min(1, (time - (fading ? fading.from : foundAt)) / PATH_FADE_MS);
      paths.push({
        path: route.path,
        alpha: lerp(SEARCH_STYLE.alpha, FOUND_STYLE.alpha, fadeIn),
        width: lerp(SEARCH_STYLE.width, FOUND_STYLE.width, fadeIn),
      });
    },

    isSettled(time) {
      // A query that can't reach its goal simply ends and the next begins
      if (!foundAt) return stalled || planner.nodes.length >= maxNodes;
      return (
        planner.nodes.length >= maxNodes &&
        !fading &&
        time - births[births.length - 1] > FRONTIER_MS &&
        time - foundAt > PATH_FADE_MS
      );
    },

    finish() {
      planner.grow(maxNodes - planner.nodes.length);
      const index = planner.bestGoalIndex();
      if (index >= 0) {
        foundAt = foundAt || 1;
        route = { path: planner.pathFrom(index), nodes: planner.nodesFrom(index) };
      }
      paths = route ? [{ path: route.path, ...FOUND_STYLE }] : [];
      births.fill(-Infinity);
    },
  };
};

// The robot's place on load, hero-local, or null
const startPose = (hero) => {
  const line = hero.querySelector("[data-robot-start]");
  if (!line) return null;
  // Where the line's text starts, and the middle of its capitals: a probe
  // one cap-height tall standing on the baseline, put in the flow of the
  // first text (the line itself lays out its parts as flex items)
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  let text = walker.nextNode();
  while (text && !text.textContent.trim()) text = walker.nextNode();
  if (!text) return null;
  const probe = document.createElement("span");
  const capHeight = CSS.supports("height", "1cap") ? "1cap" : "0.68em"; // Newsreader's caps
  probe.style.cssText = `display: inline-block; width: 0; height: ${capHeight}; vertical-align: baseline;`;
  text.parentNode.insertBefore(probe, text);
  const caps = probe.getBoundingClientRect();
  probe.remove();
  const at = { left: caps.left, top: (caps.top + caps.bottom) / 2 };
  const style = getComputedStyle(line);
  // The hero's entrance may still be sliding it in: place it by where the
  // line comes to rest
  const slide = style.transform === "none" ? { m41: 0, m42: 0 } : new DOMMatrixReadOnly(style.transform);
  const origin = hero.getBoundingClientRect();
  return {
    x: at.left - slide.m41 - origin.left - BULLET_GAP_EM * parseFloat(style.fontSize) - ROBOT_RADIUS,
    y: at.top - slide.m42 - origin.top,
    theta: 0,
  };
};

// Scripted moves from `from` (its moves on load, and going home or out of
// it): { poseAt(t ms) → { x, y, theta, done }, events: [{ at, name }] }.
// Steps: pause, turnTo, turnBy, faceTo {x, y}, drive (px ahead), driveTo
// {x, y}, greet (says hello then).
const createMoves = (from, steps) => {
  const segments = [];
  const events = [];
  let pose = from;
  let at = 0;
  for (const step of steps) {
    if (step.greet) {
      events.push({ at, name: "greet" });
      continue;
    }
    let to = pose;
    let duration = step.pause || 0;
    const facing = step.faceTo ? Math.atan2(step.faceTo.y - pose.y, step.faceTo.x - pose.x) : step.turnTo;
    if (facing !== undefined || step.turnBy !== undefined) {
      const turn = facing !== undefined ? angleTo(pose.theta, facing) : step.turnBy;
      to = { ...pose, theta: pose.theta + turn };
      duration = Math.abs(turn) < 0.01 ? 0 : 150 + (Math.abs(turn) / WAKE_TURN_RATE) * 1000;
    } else if (step.drive || step.driveTo) {
      const target = step.driveTo || { x: pose.x + step.drive * Math.cos(pose.theta), y: pose.y + step.drive * Math.sin(pose.theta) };
      const d = Math.hypot(target.x - pose.x, target.y - pose.y);
      to = { ...pose, x: target.x, y: target.y };
      duration = d < 0.5 ? 0 : 200 + (d / WAKE_SPEED) * 1000;
    }
    segments.push({ from: pose, to, duration });
    at += duration;
    pose = to;
  }
  return {
    events,
    poseAt(t) {
      let elapsed = t;
      for (const { from: a, to: b, duration } of segments) {
        if (elapsed < duration) {
          const k = easeInOutCubic(elapsed / duration);
          return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), theta: lerp(a.theta, b.theta, k), done: false };
        }
        elapsed -= duration;
      }
      return { ...pose, done: true };
    },
  };
};

// `layers`: [{ query, alpha }], drawn in order. The robot is drawn above them
// by RobotLayer.
const render = (canvas, layers, time) => {
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = layers[layers.length - 1].query;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const { query, alpha } of layers) {
    ctx.globalAlpha = alpha * query.treeAlpha * TREE_ALPHA;
    drawTree(ctx, query.planner.nodes, query.births, time);
    ctx.globalAlpha = alpha;
    for (const { path, alpha: a, width: w } of query.paths) strokePath(ctx, path, a, w);
    drawGoal(ctx, query.goal, GOAL_ALPHA * Math.min(1, (time - query.createdAt) / ENDPOINT_FADE_MS));
  }
  ctx.globalAlpha = 1;
};

const clearCanvas = (canvas) => canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

function PlannerBackground({ heroRef, startDelay }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    const scroller = document.getElementById("root");
    if (!hero || !canvas) return undefined;

    // A fresh sequence each visit
    const random = seededRandom(Math.floor(Math.random() * 2147483646) + 1);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cancelled = false;
    let started = false;
    let visible = true;
    let running = false;
    let holding = false;
    let frame = 0;
    let delayTimer = 0;
    let holdTimer = 0;
    let lastNow = 0;
    let time = 0; // advances only while animating, so pauses don't skip ahead
    let current = null;
    let outgoing = null; // { query, from }
    let robot = null; // { x, y, theta, alpha }
    let drive = null;
    // Scripted moves (on load, going into its bullet, coming out):
    // { moves, startedAt, bulletMs (posing as the bullet till then), then,
    // since (going in: the reader's last input when it set off) }
    let waking = null;
    let homing = null; // on its way home: { since, home }
    let atHome = false; // asleep in its bullet
    let away = false; // the page robot has the robot
    let carried = false; // the reader is carrying it (RobotLayer)
    let heldGoal = null; // where it was headed when picked up: { goal, requested }
    let napping = false; // stopped after QUIET_QUERIES, asleep
    let quiet = { since: -Infinity, count: 0 }; // queries since the reader's last input
    let offset = { x: 0, y: 0 }; // the hero's place on the page
    let space = null; // where it may go: { width, height, obstacles }

    // Each query sets off from the robot's pose
    const nextQuery = (goal = null) => {
      const query = createQuery(hero, random, { from: robot, createdAt: time, goal });
      space = query;
      return query;
    };

    const measure = () => {
      const { width, height } = hero.getBoundingClientRect();
      space = { width, height, obstacles: measureObstacles(hero, OBSTACLE_MARGIN + robotLive.extraClearance) };
      if (!scroller) return;
      const origin = scroller.getBoundingClientRect();
      const rect = hero.getBoundingClientRect();
      offset = { x: rect.left - origin.left, y: rect.top - origin.top + scroller.scrollTop };
    };

    // Tell RobotLayer where the robot is (page px) and what it is doing
    const report = (activity) => {
      if (away) return;
      robotLive.report({
        pose: robot && { x: robot.x + offset.x, y: robot.y + offset.y, theta: robot.theta },
        activity: robot ? activity : "hidden",
        goal: current && { x: current.goal[0] + offset.x, y: current.goal[1] + offset.y },
        alpha: robot ? robot.alpha : 0,
        pointing: false,
      });
    };

    const requestTick = () => {
      if (cancelled || running || holding || away || carried || napping || !visible || !(current || waking)) return;
      running = true;
      lastNow = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stopAll = () => {
      cancelAnimationFrame(frame);
      clearTimeout(holdTimer);
      running = false;
      holding = false;
      napping = false;
      homing = null;
      atHome = false;
    };

    // Its bullet, and its doorstep (where it rolls off to plan), hero px
    const homePose = () => {
      const bullet = startPose(hero);
      return bullet && { bullet, porch: { x: bullet.x - HOME_STEP, y: bullet.y } };
    };
    // Plans on from where it is
    const planOn = () => {
      outgoing = current && { query: current, from: time };
      drive = null;
      current = nextQuery();
    };
    // Into its bullet, to sleep
    const tuckIn = () => {
      homing = null;
      atHome = true;
      napping = true;
      report("bullet");
      character.doze(performance.now(), { yawn: false });
    };
    // Back out to its doorstep, then on
    const comeOut = (home, steps) => {
      waking = { moves: createMoves(robot, steps || [{ faceTo: home.porch }, { driveTo: home.porch }, { pause: 200 }]), startedAt: time, bulletMs: 0, then: planOn };
      requestTick();
    };
    // Home: a yawn on the doorstep, then in it goes. Disturbed on the way,
    // or kept from its doorstep, it carries on (or dozes where it is).
    const arriveHome = () => {
      const { since, home } = homing;
      drive = null; // there: its scripted moves take it from here
      const there = Math.hypot(robot.x - home.porch.x, robot.y - home.porch.y) < 8;
      if (character.lastInput !== since) {
        homing = null;
        holdThenNext(ARRIVE_HOLD_MS, false);
        return;
      }
      if (!there) {
        homing = null;
        napping = true;
        report("wait");
        character.doze();
        return;
      }
      character.yawn();
      holding = true;
      report("wait");
      holdTimer = setTimeout(() => {
        holding = false;
        if (character.lastInput !== since) {
          homing = null;
          holdThenNext(WAKE_PAUSE_MS, false);
          return;
        }
        waking = {
          moves: createMoves(robot, [{ faceTo: home.bullet }, { driveTo: home.bullet }, { turnTo: 0 }, { pause: 150 }]),
          startedAt: time,
          bulletMs: 0,
          since,
          home,
          then: tuckIn,
        };
        requestTick();
      }, character.yawnMs);
    };

    // `reset`: nowhere to drive to, so don't retry from this spot; fade the
    // robot in again at the composed starting point. Left alone long enough,
    // it stops here and dozes until it is woken.
    const holdThenNext = (ms, reset) => {
      holding = true;
      report("wait");
      holdTimer = setTimeout(() => {
        holding = false;
        if (character.lastInput !== quiet.since) quiet = { since: character.lastInput, count: 0 };
        if (!reset && quiet.count >= QUIET_QUERIES) {
          // Left alone a while: it goes home to sleep (or dozes here, if
          // it can't find its bullet)
          const home = homePose();
          if (!home) {
            napping = true;
            character.doze();
            return;
          }
          homing = { since: character.lastInput, home };
          outgoing = current && { query: current, from: time };
          drive = null;
          current = nextQuery([home.porch.x, home.porch.y]);
          current.home = true;
          requestTick();
          return;
        }
        quiet.count += 1;
        outgoing = current && { query: current, from: time };
        drive = null;
        if (reset) {
          robot = null;
          current = nextQuery();
          robot = { ...current.start, alpha: 0 };
        } else {
          current = nextQuery();
        }
        requestTick();
      }, ms);
    };

    const renderFrame = () => {
      const layers = [];
      if (outgoing) {
        const alpha = 1 - (time - outgoing.from) / SWAP_FADE_MS;
        if (alpha > 0) layers.push({ query: outgoing.query, alpha });
        else outgoing = null;
      }
      layers.push({ query: current, alpha: 1 });
      render(canvas, layers, time);
    };

    const tick = (now) => {
      running = false;
      if (cancelled) return;
      if (now - lastNow < MIN_FRAME_MS) {
        running = true;
        frame = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(MAX_FRAME_MS, now - lastNow);
      time += dt;
      lastNow = now;

      if (waking) {
        // Going into its bullet, it turns back if you stir
        if (waking.since !== undefined && character.lastInput !== waking.since) {
          const { home } = waking;
          waking = null;
          comeOut(home);
          return;
        }
        const t = time - waking.startedAt;
        const pose = waking.moves.poseAt(t);
        robot = { ...pose, alpha: Math.min(1, Math.max(robot ? robot.alpha : 0, t / APPEAR_MS)) };
        robotHandoff.reportHeroPose(robot);
        for (const event of waking.moves.events) {
          if (!event.done && t >= event.at) {
            event.done = true;
            if (event.name === "greet") character.greet();
          }
        }
        // Still, it is the tagline's bullet; once it moves, a robot
        report(t < waking.bulletMs ? "bullet" : "wake");
        if (pose.done) {
          const { then } = waking;
          waking = null;
          then();
        }
        requestTick();
        return;
      }

      if (drive && time < drive.startedAt) {
        // Turning on the spot to face its path, before it sets off
        const k = easeInOutCubic(Math.min(1, (time - drive.turn.from) / (drive.startedAt - drive.turn.from)));
        robot = { ...robot, theta: drive.turn.theta + drive.turn.by * k };
      } else if (drive) {
        const pose = drive.poseAt(time);
        robot = { ...robot, x: pose.x, y: pose.y, theta: pose.theta };
        current.treeAlpha = lerp(1, DRIVE_TREE_ALPHA, easeOutCubic(Math.min(1, (time - drive.startedAt) / DRIVE_DIM_MS)));
        if (pose.done) {
          renderFrame();
          if (current.home && homing) {
            arriveHome();
            return;
          }
          character.arrived(drive.length);
          holdThenNext(ARRIVE_HOLD_MS, false);
          return;
        }
      } else {
        current.step(time);
        robot = { ...robot, alpha: Math.min(1, robot.alpha + (dt / ENDPOINT_FADE_MS)) };
      }
      renderFrame();
      robotHandoff.reportHeroPose(robot);
      report(drive ? "drive" : "search");

      if (!drive && !outgoing && current.isSettled(time)) {
        const plan = current.plan || current.fallback();
        // Sent somewhere it can't reach: it is puzzled (and gets as close
        // as it can, if it can)
        if (current.requested && !current.solved && !current.home) character.feel("confused");
        if (!plan) {
          if (current.home) {
            // No way home from here: it dozes where it is
            homing = null;
            napping = true;
            report("wait");
            character.doze();
            return;
          }
          // Stay and try a new goal from here; start over only if the tree
          // could not grow at all (the robot is boxed in)
          holdThenNext(UNSOLVED_HOLD_MS, current.stalled);
          return;
        }
        // It turns on the spot to face its path first (as on load), so its
        // heading never jumps
        const by = angleTo(robot.theta, createDrive(plan, 0).poseAt(0).theta);
        const turnMs = Math.abs(by) < 0.05 ? 0 : 150 + (Math.abs(by) / WAKE_TURN_RATE) * 1000;
        drive = createDrive(plan, time + turnMs);
        drive.turn = { from: time, theta: robot.theta, by };
      }
      requestTick();
    };

    const start = () => {
      started = true;
      waking = null;
      measure();
      clearCanvas(canvas);
      const first = startPose(hero);
      robot = first && { ...first, alpha: 1 };
      robotHandoff.reportHeroPose(robot);
      // Asleep (the layout changed while it slept, or the page's code was
      // reloaded): it stays asleep, tucked in at home, until it is woken
      if (character.asleep && robot && !reduceMotion) {
        current = null;
        atHome = true;
        napping = true;
        report("bullet");
        return;
      }
      if (reduceMotion || !robot) {
        current = nextQuery();
        robot = robot || { ...current.start, alpha: reduceMotion ? 1 : 0 };
        if (reduceMotion) {
          current.finish();
          render(canvas, [{ query: current, alpha: 1 }], Infinity);
          // Still, it stays the tagline's bullet
          report(first ? "bullet" : "wait");
          return;
        }
        requestTick();
        return;
      }
      // It shows itself as a robot before its first plan
      current = null;
      waking = { moves: createMoves(robot, WAKE_STEPS), startedAt: time, bulletMs: WAKE_STEPS[0].pause, then: planOn };
      report("bullet");
      requestTick();
    };

    // Where the reader may send it: clear of content, within the band of the
    // hero that is fully visible. Hero px.
    const isFree = (x, y, band = [VISIBLE_TOP, VISIBLE_BOTTOM]) => {
      if (!space) return false;
      const { width, height, obstacles } = space;
      const c = ENDPOINT_CLEARANCE;
      return (
        x >= c && x <= width - c && y >= band[0] && y <= height * band[1] &&
        obstacles.every((o) => x < o.left - c || x > o.right + c || y < o.top - c || y > o.bottom + c)
      );
    };

    // What RobotLayer may ask of it while the hero has the robot (page px)
    const controls = {
      canCommand: (x, y) => started && !carried && !!robot && !reduceMotion && isFree(x - offset.x, y - offset.y),
      // Whether it may be set down at (x, y), as after a carry (a hop lands)
      canStand: (x, y) =>
        started && !carried && !!robot && !reduceMotion &&
        isFree(x - offset.x, y - offset.y, [WIDE_BAND_TOP, WIDE_BAND_BOTTOM]),
      // Plan from wherever it is now to where the reader tapped
      command(x, y) {
        if (!controls.canCommand(x, y)) return false;
        stopAll();
        waking = null;
        drive = null;
        if (current) outgoing = { query: current, from: time };
        robot = { ...robot, alpha: 1 };
        current = nextQuery([x - offset.x, y - offset.y]);
        requestTick();
        return true;
      },
      pickUp() {
        // Where it was headed, if it had not got there yet
        heldGoal = current && !holding && !napping && !waking ? { goal: current.goal, requested: current.requested } : null;
        stopAll();
        carried = true;
        waking = null;
        drive = null;
      },
      // The nearest place it may stand to (x, y)
      place(x, y) {
        const local = { x: x - offset.x, y: y - offset.y };
        const band = [WIDE_BAND_TOP, WIDE_BAND_BOTTOM];
        if (isFree(local.x, local.y, band)) return { x, y };
        for (let r = 6; r < 500; r += 6) {
          for (let a = 0; a < 2 * Math.PI; a += Math.PI / 16) {
            const px = local.x + r * Math.cos(a);
            const py = local.y + r * Math.sin(a);
            if (isFree(px, py, band)) return { x: px + offset.x, y: py + offset.y };
          }
        }
        return null;
      },
      // Set down: it plans on from there to where it was headed. If it had
      // got there, it waits a moment, as on arriving, before a new goal.
      drop(pose) {
        carried = false;
        robot = { x: pose.x - offset.x, y: pose.y - offset.y, theta: pose.theta, alpha: 1 };
        drive = null;
        const held = heldGoal;
        heldGoal = null;
        if (!held) {
          holdThenNext(ARRIVE_HOLD_MS, false);
          return;
        }
        if (current) outgoing = { query: current, from: time };
        current = nextQuery(held.goal);
        current.requested = held.requested; // puzzled if it can't get there only if sent there
        report("search");
        requestTick();
      },
      bounds() {
        const { width, height } = hero.getBoundingClientRect();
        return {
          left: offset.x + ENDPOINT_CLEARANCE,
          right: offset.x + width - ENDPOINT_CLEARANCE,
          top: offset.y + WIDE_BAND_TOP,
          bottom: offset.y + height * WIDE_BAND_BOTTOM,
        };
      },
    };
    robotLive.setControls(controls);

    // Woken from its nap (or stirred before it dropped off): it carries on;
    // at home, it pops out of its bullet and rolls off its doorstep first
    const unsubscribeCharacter = character.subscribe((event) => {
      if ((event !== "wake" && event !== "stir") || !napping) return;
      napping = false;
      if (atHome) {
        atHome = false;
        report("wake");
        comeOut(null, HOME_WAKE_STEPS);
        return;
      }
      holdThenNext(WAKE_PAUSE_MS, false);
    });

    document.fonts.ready.then(() => {
      // Measure once the hero's entrance has settled
      if (!cancelled) delayTimer = setTimeout(start, startDelay);
    });

    // The page robot takes the robot while the reader is further down the
    // page, and hands it back when they return: planning goes on from there
    const unsubscribe = robotHandoff.subscribe((owner) => {
      stopAll();
      outgoing = null;
      drive = null;
      waking = null;
      carried = false;
      if (owner === "page") {
        away = true;
        robotLive.releaseControls(controls);
        clearCanvas(canvas);
        return;
      }
      away = false;
      measure();
      robotLive.setControls(controls);
      const pose = robotHandoff.consumeHandback();
      robot = pose && { ...pose, alpha: 1 };
      current = nextQuery();
      robot = robot || { ...current.start, alpha: 0 };
      report("search");
      requestTick();
    });

    // Carried in from the page robot and set down in the hero: the hero plans
    // on from there
    robotHandoff.offerToTake("hero", {
      bounds: () => controls.bounds(),
      place: (x, y) => (started ? controls.place(x, y) : null),
      take: (at) => robotHandoff.handBack({ x: at.x - offset.x, y: at.y - offset.y, theta: at.theta }),
    });

    // Pause while the hero is off screen
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      requestTick();
    });
    visibility.observe(hero);

    // A new layout invalidates the obstacles: start over from a fresh query
    let resizeTimer = 0;
    let lastWidth = hero.getBoundingClientRect().width;
    const resize = new ResizeObserver(() => {
      const width = hero.getBoundingClientRect().width;
      if (Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!started || away || carried) return;
        stopAll();
        outgoing = null;
        drive = null;
        start();
      }, 200);
    });
    resize.observe(hero);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(delayTimer);
      clearTimeout(holdTimer);
      clearTimeout(resizeTimer);
      visibility.disconnect();
      resize.disconnect();
      unsubscribe();
      unsubscribeCharacter();
      robotHandoff.offerToTake("hero", null);
      robotLive.releaseControls(controls);
    };
  }, [heroRef, startDelay]);

  return <canvas ref={canvasRef} className={styles.planner} aria-hidden />;
}

export default memo(PlannerBackground);
