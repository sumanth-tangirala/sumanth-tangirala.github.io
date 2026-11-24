import React, { memo, useEffect, useRef } from "react";
import { createRRTStar, seededRandom } from "../../planner/rrtStar";
import { holonomic } from "../../planner/motion";
import { measureObstacles } from "../../planner/heroObstacles";
import { createApproach } from "../../planner/drive";
import { drawGoal, drawTree, strokePath } from "../../planner/draw";
import { robotHandoff } from "../../planner/robotHandoff";
import { robotLive } from "../../planner/robotLive";
import { character } from "../../planner/character";
import { SECTION_TYPES } from "../../constants";
import styles from "./pageRobot.module.scss";

// The hero's robot, following the reader down the page. It lives on the page,
// so while the reader scrolls it is left behind. Once they stop, it catches
// up the way it moves in the hero, from wherever it is: a quick, faint RRT*
// search through the margins, then it turns to face its path and drives it,
// at a speed proportional to the distance left: quick from far away, slowing
// as it arrives. While it
// waits it faces the text, or watches the mouse pointer, turning after it a
// moment late, like a real robot. Each section's content is one obstacle, so
// it keeps to the margins and crosses between them only through the gaps
// between sections, and between the publication cards, which are obstacles
// of their own (ITEMS). It takes the robot over where the hero left it once the
// hero has scrolled out of view (or the reader carries it out of the hero and
// sets it down below), and drives it back into the hero when the reader
// returns there; the hero's planner carries on from it. Its tree and
// path are fainter than the hero's: they sit beside what is being read.
// Where the margins are too narrow for it (phones), or with reduced motion,
// the robot stays in the hero.

const SETTLE_MS = 200; // after the last scroll event
const START_CHECK_MS = 1500; // a page opened part-way down: catch up once the hero has started
const MIN_GUTTER = 56; // px of margin beside the content
const CONTENT_MARGIN = 20; // px kept clear around each section's content
const HERO_MARGIN = 5; // as the hero's planner
const CLEARANCE = 14; // px around where it stops
const HERO_CLEARANCE = 12;
const EDGE = 16; // px from the page's side edges
// With less of the hero than this on screen, the page robot takes the robot;
// with at least this share of the screen showing the hero, it takes it home
const HERO_GONE_PX = 120;
const HOME_SHARE = 0.5;
// It stays put (or keeps to its trip) while where it is (or is headed) can
// be seen: below the nav and above the screen's bottom edge, px. Otherwise
// it heads for a point in the goal band (fractions of the screen height).
const SEEN_BELOW = 100;
const SEEN_ABOVE = 20;
const GOAL_BAND = [0.35, 0.7];
// Coming home it stops low in the hero (fractions of its height), and the
// hero's planner takes over from there
const HOME_BAND = [0.62, 0.88];
const MIN_MOVE = 90; // px: no shorter trips
const SWITCH_SIDES = 0.35; // how often it heads for the other margin
const REGION_PAD = 80; // px planned around the trip, above and below
// ... crossing to the other margin, farther: far enough to reach a way
// across (a gap between cards half a tall card away, on an iPad)
const CROSSING_REGION_PAD = 320;
// What is drawn: a window around the screen, moved with it when the reader
// stops (fractions of the screen height above it, and in all)
const WINDOW = { above: 0.3, height: 1.6 };
const STEP = 26;
const GOAL_RADIUS = 2;
const SEARCH_RATE = 1.4; // nodes per ms: a quick look, not the hero's slow search
// ... per screen height the trip spans: a long way is searched as quickly
// Out of view it hurries: no turn on the spot, and the farther it still has
// to drive before it comes into view, the faster it goes (it still travels
// the whole way): 1× more for every HURRY_PER px of path out of sight ahead,
// up to HURRY_MAX×. So it is back to its own speed as it comes into view, and
// a trip from screens away takes a few seconds. Its tree and path are drawn
// only while it is in view, fading in as it arrives; the goal always shows.
const OUT_OF_SIGHT = 30; // px past the window's edge, past its body and bubbles
const HURRY_PER = 150; // px
const HURRY_MAX = 20;
const PLAN_SHOW_MS = 250;
const REFINE_MS = 500;
// The finished tree is as dense as the hero's: a node per this many px² of
// free space
const AREA_PER_NODE = 550;
const MAX_NODES = 1600;
// Then another goal is tried: longer for longer trips
const SEARCH_TIMEOUT_MS = 1500;
const SEARCH_TIMEOUT_PER_PX = 0.6;
const GOAL_ATTEMPTS = 3;
// In view it never goes faster than this; px/s, px/s²
const APPROACH = { cruise: 200, accel: 600 };
// Turning on the spot, like a motor: it speeds up and slows into place
// (critically damped, so it never overshoots)
const TURN_STIFFNESS = 90; // 1/s²
const TURN_RATE = 5; // rad/s at most
// Watching the pointer while it waits: it reacts this late, ignores small
// moves, and turns back to the text once the pointer has left the page
const LOOK_DELAY_MS = 180;
const LOOK_DEADBAND = 0.05; // rad
const LOOK_AWAY_MS = 1500;
// Fainter than the hero's plan (its tree is at 0.7, its path at 0.35)
const TREE_ALPHA = 0.4;
const DRIVE_TREE_ALPHA = 0.2;
const DRIVE_DIM_MS = 500;
const PATH_STYLE = { alpha: 0.22, width: 1.25 };
const GOAL_ALPHA = 0.35;
const PATH_FADE_MS = 300;
const FADE_MS = 900; // once it has arrived, the plan fades
const MIN_FRAME_MS = 1000 / 60 - 1;
const MAX_FRAME_MS = 50;
// What counts as content besides text: the tight box of each section's
// content is taken over its text lines, these, and anything drawn as a box
// (a background or a border: cards, panels, pills)
const CONTENT_BOXES = "img, svg, canvas, video, button, a, article, li, hr";
// A list whose children are each an obstacle of their own (the publication
// cards), rather than part of their section's one box, so the robot can pass
// between them. Above and below them it keeps this much clear (px; less than
// CONTENT_MARGIN, which it keeps beside them): the gaps between them are
// ways through.
const ITEMS = "[data-robot-items]";
const ITEM_GAP_MARGIN = 4;

const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const angleTo = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const distanceToRect = (x, y, o) =>
  Math.hypot(Math.max(o.left - x, 0, x - o.right), Math.max(o.top - y, 0, y - o.bottom));

const isClear = (color) => color === "transparent" || /rgba\([^)]*,\s*0\)$/.test(color);

// Elements drawn as a box: a background (colour or image) or a visible border
const drawnBoxes = (section) =>
  [...section.querySelectorAll("*")].filter((el) => {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (!isClear(style.backgroundColor) || style.backgroundImage !== "none") return true;
    return ["Top", "Right", "Bottom", "Left"].some(
      (edge) =>
        parseFloat(style[`border${edge}Width`]) > 0 &&
        style[`border${edge}Style`] !== "none" &&
        !isClear(style[`border${edge}Color`]),
    );
  });

// The tight box around the content under \`root\`, in viewport px, leaving
// out what \`skip\` says. \`drawn\`: its elements drawn as boxes (they rarely
// change, so they are found once).
const tightBox = (root, drawn, skip = () => false) => {
  const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  const add = (r) => {
    if (r.width <= 0 || r.height <= 0) return;
    box.left = Math.min(box.left, r.left);
    box.right = Math.max(box.right, r.right);
    box.top = Math.min(box.top, r.top);
    box.bottom = Math.max(box.bottom, r.bottom);
  };
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim() || skip(node)) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) add(rect);
  }
  root.querySelectorAll(CONTENT_BOXES).forEach((el) => !skip(el) && add(el.getBoundingClientRect()));
  drawn.forEach((el) => !skip(el) && add(el.getBoundingClientRect()));
  return box.left < box.right ? box : null;
};

// A section's content as obstacles: one box; or, where it has lists of
// items (ITEMS), a box for each item and one for the rest
const contentBoxes = (section, drawn) => {
  const items = [...section.querySelectorAll(ITEMS)].flatMap((list) => [...list.children]);
  if (!items.length) {
    const box = tightBox(section, drawn);
    return box ? [box] : [];
  }
  const inItem = (node) => items.some((item) => item.contains(node));
  const boxes = [tightBox(section, drawn, inItem)];
  for (const item of items) {
    const box = tightBox(item, drawn.filter((el) => item.contains(el)));
    if (box) boxes.push({ ...box, item: true });
  }
  return boxes.filter(Boolean);
};

// The page as the robot sees it, in page px (the scroller's content)
const measureWorld = (scroller, hero, sections, drawn) => {
  const origin = scroller.getBoundingClientRect();
  const toPage = (r, margin) => ({
    left: r.left - origin.left - margin,
    right: r.right - origin.left + margin,
    top: r.top - origin.top + scroller.scrollTop - margin,
    bottom: r.bottom - origin.top + scroller.scrollTop + margin,
  });
  const width = scroller.clientWidth;
  // Where the page's content ends (not the scroll height, which the robot's
  // own canvas would add to)
  const height = Math.max(...sections.map((s) => toPage(s.getBoundingClientRect(), 0).bottom));
  const boxes = sections.flatMap((section) => contentBoxes(section, drawn(section)));
  const heroRect = toPage(hero.getBoundingClientRect(), 0);
  const heroObstacles = measureObstacles(hero, HERO_MARGIN + robotLive.extraClearance).map((o) => ({
    left: o.left + heroRect.left,
    right: o.right + heroRect.left,
    top: o.top + heroRect.top,
    bottom: o.bottom + heroRect.top,
  }));
  const content = boxes.map((b) => {
    const box = toPage(b, CONTENT_MARGIN + robotLive.extraClearance);
    if (!b.item) return box;
    const tight = toPage(b, ITEM_GAP_MARGIN + robotLive.extraClearance);
    return { ...box, top: tight.top, bottom: tight.bottom };
  });
  const obstacles = [...heroObstacles, ...content];
  const columnLeft = Math.min(...boxes.map((b) => b.left)) - origin.left;
  const columnRight = Math.max(...boxes.map((b) => b.right)) - origin.left;
  return {
    width,
    height,
    obstacles,
    clearanceAt: (x, y) => Math.min(x, width - x, ...obstacles.map((o) => distanceToRect(x, y, o))),
    // The side of the content a point is beside, if it is beside some (not
    // in a gap between sections)
    besideContent: (x, y) => {
      const box = content.find((b) => y >= b.top && y <= b.bottom);
      if (!box) return null;
      if (x < box.left) return "left";
      return x > box.right ? "right" : null;
    },
    hero: { ...heroRect, width: heroRect.right - heroRect.left, height: heroRect.bottom - heroRect.top },
    // Room for the robot beside the widest content
    gutter: Math.min(columnLeft, width - columnRight),
  };
};

function PageRobot({ sectionRefs }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scroller = document.getElementById("root");
    const hero = sectionRefs[SECTION_TYPES.LANDING].current;
    if (!canvas || !scroller || !hero) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const random = seededRandom(Math.floor(Math.random() * 2147483646) + 1);
    const sections = () =>
      Object.entries(sectionRefs)
        .filter(([type, ref]) => type !== SECTION_TYPES.LANDING && ref.current)
        .map(([, ref]) => ref.current);
    // Each section's elements drawn as boxes, found once (and again after a
    // new layout)
    let boxesOf = new WeakMap();
    const drawnBoxesOf = (section) => {
      if (!boxesOf.has(section)) boxesOf.set(section, drawnBoxes(section));
      return boxesOf.get(section);
    };

    let world = null;
    let active = false; // it has the robot
    let pose = null; // page px: { x, y, theta }
    let side = "left";
    let spin = 0; // rad/s
    let planShown = 0; // 0–1: its plan fades in while it is in view
    let trip = null;
    let drawn = { top: 0, height: 0 }; // the window drawn into, page px
    let frame = 0;
    let lastNow = 0;
    let time = 0;
    let settleTimer = 0;
    let startTimer = 0;
    // The mouse pointer: recent positions (viewport px, performance.now()),
    // and when it left the page
    const pointer = [];
    let pointerLeftAt = -Infinity;
    let looking = null; // where it looks while it waits
    let carried = false; // the reader is carrying it (RobotLayer)
    let heldTrip = null; // where it was headed when picked up: { goal, handBack, requested }

    const viewNow = () => ({ top: scroller.scrollTop, height: scroller.clientHeight });
    // Whether the robot can be seen (a robot's width past an edge counts)
    const inView = () =>
      !!pose && pose.y > scroller.scrollTop - 8 && pose.y < scroller.scrollTop + scroller.clientHeight + 8;
    // How much faster it may drive `drive` now: by how far it has to go out
    // of sight
    const hurry = (drive) => {
      const top = scroller.scrollTop - OUT_OF_SIGHT;
      const hidden = drive.untilBand(top, top + scroller.clientHeight + 2 * OUT_OF_SIGHT);
      return Math.min(HURRY_MAX, 1 + hidden / HURRY_PER);
    };
    const sideOf = (x) => (x < world.width / 2 ? "left" : "right");
    const faceText = (s) => (s === "left" ? 0 : Math.PI);

    // The nearest point with room for it (a new layout can put content where
    // it was)
    const roomNear = (at) => {
      if (world.clearanceAt(at.x, at.y) > 2) return at;
      for (let r = 6; r < 400; r += 6) {
        for (let a = 0; a < 2 * Math.PI; a += Math.PI / 12) {
          const x = at.x + r * Math.cos(a);
          const y = at.y + r * Math.sin(a);
          if (world.clearanceAt(x, y) > 2) return { ...at, x, y };
        }
      }
      return at;
    };

    // Somewhere beside the content in the reader's view (anywhere beside it:
    // closer in where a section is narrower), usually on its own side
    const sampleGoal = (view, from) => {
      const top = view.top + view.height * GOAL_BAND[0];
      const bottom = view.top + view.height * GOAL_BAND[1];
      const other = side === "left" ? "right" : "left";
      for (const wanted of random() < SWITCH_SIDES ? [other, side] : [side, other]) {
        for (let i = 0; i < 300; i++) {
          const x = wanted === "left" ? lerp(EDGE, world.width / 2, random()) : lerp(world.width / 2, world.width - EDGE, random());
          const y = lerp(top, bottom, random());
          if (
            world.besideContent(x, y) === wanted &&
            world.clearanceAt(x, y) >= CLEARANCE &&
            Math.hypot(x - from.x, y - from.y) >= MIN_MOVE
          ) {
            return { x, y, side: wanted };
          }
        }
      }
      return null;
    };

    // Low in the hero, on its own side if it can
    const sampleHomeGoal = (from) => {
      const { hero: h } = world;
      for (const sameSide of [true, false]) {
        for (let i = 0; i < 300; i++) {
          const x = h.left + lerp(h.width * 0.05, h.width * 0.95, random());
          const y = h.top + h.height * lerp(HOME_BAND[0], HOME_BAND[1], random());
          if (
            (!sameSide || sideOf(x) === sideOf(from.x)) &&
            world.clearanceAt(x, y) >= HERO_CLEARANCE &&
            Math.hypot(x - from.x, y - from.y) >= MIN_MOVE
          ) {
            return { x, y, side: sideOf(x) };
          }
        }
      }
      return null;
    };

    // Give the robot back to the hero where it is not driven there: the hero
    // starts over from its own starting point
    const giveUp = () => {
      active = false;
      trip = null;
      carried = false;
      robotLive.releaseControls(controls);
      robotHandoff.handBack(null);
    };

    const planTrip = (goal, handBack, attempt) => {
      // Staying on its side, it plans on that half of the page only
      const sameSide = sideOf(pose.x) === goal.side;
      const pad = sameSide ? REGION_PAD : CROSSING_REGION_PAD;
      const top = Math.max(0, Math.min(pose.y, goal.y) - pad);
      const bottom = Math.min(world.height, Math.max(pose.y, goal.y) + pad);
      const left = sameSide && goal.side === "right" ? world.width / 2 : 0;
      const right = sameSide && goal.side === "left" ? world.width / 2 : world.width;
      const obstacles = world.obstacles
        .filter((o) => o.bottom > top && o.top < bottom && o.right > left && o.left < right)
        .map((o) => ({ left: o.left - left, right: o.right - left, top: o.top - top, bottom: o.bottom - top }));
      // Free space in the region, estimated by sampling
      const isFree = (x, y) => !obstacles.some((o) => x > o.left && x < o.right && y > o.top && y < o.bottom);
      let free = 0;
      for (let i = 0; i < 400; i++) if (isFree(random() * (right - left), random() * (bottom - top))) free += 1;
      trip = {
        goal,
        handBack,
        attempt,
        planner: createRRTStar({
          width: right - left,
          height: bottom - top,
          start: { x: pose.x - left, y: pose.y - top, theta: pose.theta },
          goal: [goal.x - left, goal.y - top],
          obstacles,
          stepSize: STEP,
          goalRadius: GOAL_RADIUS,
          motion: holonomic,
          random,
        }),
        maxNodes: Math.min(MAX_NODES, Math.round(((free / 400) * (right - left) * (bottom - top)) / AREA_PER_NODE)),
        timeout: SEARCH_TIMEOUT_MS + SEARCH_TIMEOUT_PER_PX * (bottom - top),
        regionHeight: bottom - top,
        offset: { x: left, y: top },
        births: [time],
        createdAt: time,
        phase: "search", // then turn, drive, fade
        foundAt: 0,
        foundNodes: 0,
        path: null, // page px
        drive: null,
        treeAlpha: TREE_ALPHA,
        fadeFrom: 0,
      };
    };

    const pickTrip = (view, home, attempt = 0) => {
      const goal = home ? sampleHomeGoal(pose) : sampleGoal(view, pose);
      if (goal) planTrip(goal, home, attempt);
      else if (home) giveUp();
    };

    // Turn toward `heading` like a motor; whether it has settled there
    const turnToward = (heading, dt) => {
      const seconds = dt / 1000;
      const error = angleTo(pose.theta, heading);
      spin += (TURN_STIFFNESS * error - 2 * Math.sqrt(TURN_STIFFNESS) * spin) * seconds;
      spin = Math.max(-TURN_RATE, Math.min(TURN_RATE, spin));
      if (Math.abs(error) < 0.003 && Math.abs(spin) < 0.02) {
        pose = { ...pose, theta: heading };
        spin = 0;
        return true;
      }
      pose = { ...pose, theta: pose.theta + spin * seconds };
      return false;
    };

    // Where it looks while it waits: where the pointer was a moment ago, or
    // (no pointer, or it has left the page) at the text
    const restingHeading = (now) => {
      const seen = pointer.filter((p) => p.t <= now - LOOK_DELAY_MS).pop();
      const gone = seen && pointerLeftAt > seen.t && now - pointerLeftAt > LOOK_AWAY_MS;
      if (!seen || gone) {
        looking = faceText(side);
        return looking;
      }
      const heading = Math.atan2(seen.y + scroller.scrollTop - pose.y, seen.x - pose.x);
      if (looking === null || Math.abs(angleTo(looking, heading)) > LOOK_DEADBAND) looking = heading;
      return looking;
    };

    // Advance the trip; whether there is more to animate
    const stepTrip = (dt) => {
      const { planner } = trip;
      if (trip.phase === "search") {
        const before = planner.nodes.length;
        if (!trip.foundAt) {
          const span = Math.max(1, trip.regionHeight / scroller.clientHeight);
          planner.grow(Math.max(1, Math.round(SEARCH_RATE * span * dt)));
          if (planner.hasReachedGoal()) {
            trip.foundAt = time;
            trip.foundNodes = planner.nodes.length;
          } else if (time - trip.createdAt > trip.timeout) {
            // Out of reach: try another goal, or stay put (or, on the way
            // home, give the robot back). Sent there by the reader, it is
            // puzzled, and stays.
            const { attempt, handBack, requested } = trip;
            trip = null;
            if (requested) {
              character.feel("confused");
              return true;
            }
            if (attempt + 1 < GOAL_ATTEMPTS) pickTrip(viewNow(), handBack, attempt + 1);
            else if (handBack) giveUp();
            return true;
          }
        } else {
          const t = Math.min(1, (time - trip.foundAt) / REFINE_MS);
          const target = Math.round(trip.foundNodes + Math.max(0, trip.maxNodes - trip.foundNodes) * easeOutCubic(t));
          planner.grow(Math.max(0, target - planner.nodes.length));
          if (t >= 1) {
            const index = planner.bestGoalIndex();
            const end = planner.nodes[index];
            trip.path = planner.pathFrom(index).map(([x, y]) => [x + trip.offset.x, y + trip.offset.y]);
            trip.end = { x: end.x + trip.offset.x, y: end.y + trip.offset.y, theta: end.theta };
            trip.drive = createApproach({ path: trip.path, end: trip.end }, APPROACH);
            trip.heading = trip.drive.startHeading;
            trip.phase = "turn";
          }
        }
        for (let i = before; i < planner.nodes.length; i++) trip.births[i] = time;
        return true;
      }
      if (trip.phase === "turn") {
        // Face the path before setting off (no one sees it turn out of view)
        if (!inView()) pose = { ...pose, theta: trip.heading };
        if (turnToward(trip.heading, dt)) {
          trip.phase = "drive";
          trip.driveStartedAt = time;
        }
        return true;
      }
      if (trip.phase === "drive") {
        const next = trip.drive.advance(dt * hurry(trip.drive));
        pose = { x: next.x, y: next.y, theta: next.theta };
        const dim = easeOutCubic(Math.min(1, (time - trip.driveStartedAt) / DRIVE_DIM_MS));
        trip.treeAlpha = lerp(TREE_ALPHA, DRIVE_TREE_ALPHA, dim);
        if (!next.done) return true;
        spin = 0;
        trip.phase = "fade";
        trip.fadeFrom = time;
        if (trip.handBack) {
          // Home: the hero's planner carries on from here
          active = false;
          robotLive.releaseControls(controls);
          robotHandoff.handBack({ x: pose.x - world.hero.left, y: pose.y - world.hero.top, theta: pose.theta });
        } else {
          side = trip.goal.side;
          character.arrived(trip.drive.length); // pleased, after a long way
        }
        return true;
      }
      // Fade the plan away; the robot stays
      if (time - trip.fadeFrom >= FADE_MS) {
        trip = null;
        return false;
      }
      return true;
    };

    const step = (dt) => {
      planShown = Math.max(0, Math.min(1, planShown + ((inView() ? 1 : -1) * dt) / PLAN_SHOW_MS));
      let busy = trip ? stepTrip(dt) : false;
      // Waiting: it looks at the text, or after the pointer
      if (active && pose && !carried && (!trip || trip.phase === "fade")) {
        const now = performance.now();
        const settled = turnToward(restingHeading(now), dt);
        const last = pointer[pointer.length - 1];
        busy = busy || !settled || (last && now - last.t < LOOK_DELAY_MS + 100) || now - pointerLeftAt < LOOK_AWAY_MS + 100;
      }
      return busy;
    };

    // Draw into a window around the screen, kept within the page: a canvas
    // reaching past its end would make the page longer
    const moveWindow = (view) => {
      const top = Math.max(0, view.top - view.height * WINDOW.above);
      const bottom = Math.min(world.height, view.top - view.height * WINDOW.above + view.height * WINDOW.height);
      drawn = { top, height: Math.max(0, bottom - top) };
    };

    const render = () => {
      if (!world) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { width } = world;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(drawn.height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(drawn.height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${drawn.height}px`;
      }
      canvas.style.transform = `translateY(${drawn.top}px)`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, drawn.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (trip) {
        const fade = trip.phase === "fade" ? Math.max(0, 1 - (time - trip.fadeFrom) / FADE_MS) : 1;
        const alpha = planShown * fade;
        ctx.save();
        ctx.translate(trip.offset.x, trip.offset.y - drawn.top);
        ctx.globalAlpha = alpha * trip.treeAlpha;
        drawTree(ctx, trip.planner.nodes, trip.births, time);
        // The goal shows even while the robot is out of view: it marks where
        // the robot is headed
        ctx.globalAlpha = fade;
        drawGoal(ctx, [trip.goal.x - trip.offset.x, trip.goal.y - trip.offset.y], GOAL_ALPHA);
        ctx.globalAlpha = alpha;
        ctx.restore();
        if (trip.path) {
          ctx.save();
          ctx.translate(0, -drawn.top);
          ctx.globalAlpha = alpha;
          const fadeIn = Math.max(0, Math.min(1, (time - trip.foundAt - REFINE_MS) / PATH_FADE_MS));
          strokePath(ctx, trip.path, PATH_STYLE.alpha * fadeIn, PATH_STYLE.width);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
      if (active && pose && !carried) report();
    };

    // Tell RobotLayer where the robot is and what it is doing
    const report = () => {
      let activity = "wait";
      if (trip && trip.phase === "search") activity = "search";
      else if (trip && (trip.phase === "turn" || trip.phase === "drive")) activity = "drive";
      robotLive.report({ pose, activity, goal: trip && trip.phase !== "fade" ? trip.goal : null, alpha: 1 });
    };

    const tick = (now) => {
      frame = 0;
      if (now - lastNow < MIN_FRAME_MS) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(MAX_FRAME_MS, now - lastNow);
      lastNow = now;
      time += dt;
      const busy = step(dt);
      render();
      if (busy) frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (frame) return;
      lastNow = performance.now();
      frame = requestAnimationFrame(tick);
    };

    // The reader has stopped scrolling: take the robot over, catch up with
    // them, or take it home to the hero
    const onSettle = () => {
      world = measureWorld(scroller, hero, sections(), drawnBoxesOf);
      const view = viewNow();
      moveWindow(view);
      if (world.gutter < MIN_GUTTER) {
        // No room beside the content (a narrow screen): it belongs in the hero
        robotHandoff.offerToTake(null);
        if (active) giveUp();
        render();
        return;
      }
      robotHandoff.offerToTake(taker);
      // In the reader's hand: whoever has it keeps it until it is set down
      if (robotHandoff.inHand) {
        render();
        return;
      }
      const heroShown = Math.max(0, Math.min(view.height, world.hero.bottom - view.top));
      if (!active) {
        if (heroShown > HERO_GONE_PX) return; // still the hero's
        // It sets off from where the hero left it
        const last = robotHandoff.heroPose;
        pose = last
          ? { x: last.x + world.hero.left, y: last.y + world.hero.top, theta: last.theta }
          : { x: world.hero.left + world.hero.width * 0.07, y: world.hero.top + world.hero.height * 0.88, theta: 0 };
        side = sideOf(pose.x);
        spin = 0;
        active = true;
        trip = null;
        carried = false;
        robotHandoff.takeOver();
        robotLive.setControls(controls);
      }
      const home = heroShown >= view.height * HOME_SHARE;
      const moving = trip && trip.phase !== "fade";
      if (home) {
        if (moving && trip.handBack) {
          render();
          return;
        }
      } else {
        // Where it is headed, or where it is, can still be seen: leave it be
        const at = moving ? trip.goal : pose;
        const seen = at.y >= view.top + SEEN_BELOW && at.y <= view.top + view.height - SEEN_ABOVE;
        if (seen && !(moving && trip.handBack)) {
          render();
          wake();
          return;
        }
      }
      // Set off again from wherever it is now
      trip = null;
      spin = 0;
      pose = roomNear(pose);
      pickTrip(view, home);
      render();
      wake();
    };

    // What RobotLayer may ask of it while it has the robot (page px)
    const standsClear = (x, y) =>
      !!world && x > EDGE && x < world.width - EDGE && world.clearanceAt(x, y) >= CLEARANCE + robotLive.extraClearance;
    const controls = {
      // Somewhere free in view: beside the content, or between sections
      canCommand(x, y) {
        if (!active || carried || !world) return false;
        const view = viewNow();
        return y > view.top + SEEN_BELOW && y < view.top + view.height - SEEN_ABOVE && standsClear(x, y);
      },
      // Whether it may be set down at (x, y) (a hop lands): the same places
      canStand: (x, y) => controls.canCommand(x, y),
      // Left alone a while as it waits here, it may doze off
      mayDoze: true,
      // Waiting beside your page, its eyes read along as you scroll slowly
      readsAlong: true,
      command(x, y) {
        if (!controls.canCommand(x, y)) return false;
        trip = null;
        spin = 0;
        planTrip({ x, y, side: sideOf(x) }, false, GOAL_ATTEMPTS - 1);
        trip.requested = true;
        render();
        wake();
        return true;
      },
      pickUp() {
        heldTrip =
          trip && trip.phase !== "fade" ? { goal: trip.goal, handBack: trip.handBack, requested: !!trip.requested } : null;
        carried = true;
        trip = null;
        spin = 0;
        render();
      },
      // The nearest place it may stand to (x, y)
      place(x, y) {
        if (standsClear(x, y)) return { x, y };
        for (let r = 6; r < 500; r += 6) {
          for (let a = 0; a < 2 * Math.PI; a += Math.PI / 16) {
            const px = x + r * Math.cos(a);
            const py = y + r * Math.sin(a);
            if (standsClear(px, py)) return { x: px, y: py };
          }
        }
        return null;
      },
      // Set down: it plans on from there to where it was headed, if it was
      drop(at) {
        carried = false;
        pose = { x: at.x, y: at.y, theta: at.theta };
        side = sideOf(pose.x);
        looking = null;
        if (heldTrip) {
          planTrip(heldTrip.goal, heldTrip.handBack, GOAL_ATTEMPTS - 1);
          trip.requested = heldTrip.requested;
          heldTrip = null;
        }
        render();
        wake();
      },
      bounds() {
        const view = viewNow();
        return {
          left: EDGE,
          right: world.width - EDGE,
          top: view.top + SEEN_BELOW,
          bottom: view.top + view.height - SEEN_ABOVE,
        };
      },
    };

    // Carried out of the hero and set down below it: it is the page robot's
    // from there, and waits where it was put
    const taker = {
      bounds: () => controls.bounds(),
      place: (x, y) => controls.place(x, y),
      take(at) {
        pose = { x: at.x, y: at.y, theta: at.theta };
        side = sideOf(pose.x);
        spin = 0;
        trip = null;
        heldTrip = null;
        carried = false;
        looking = null;
        active = true;
        robotHandoff.takeOver();
        robotLive.setControls(controls);
        render();
        wake();
      },
    };

    const onScroll = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(onSettle, SETTLE_MS);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    startTimer = setTimeout(onSettle, START_CHECK_MS);

    // It watches a mouse or pen, not a finger
    const onPointerMove = (event) => {
      if (event.pointerType === "touch") return;
      const now = performance.now();
      pointer.push({ x: event.clientX, y: event.clientY, t: now });
      while (pointer.length > 2 && pointer[1].t < now - 2 * LOOK_DELAY_MS) pointer.shift();
      if (active) wake();
    };
    const onPointerOut = (event) => {
      if (event.relatedTarget) return;
      pointerLeftAt = performance.now();
      if (active) wake();
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut);

    // A new layout moves the content: look again once it has settled
    let lastWidth = scroller.clientWidth;
    const resize = new ResizeObserver(() => {
      if (Math.abs(scroller.clientWidth - lastWidth) < 1) return;
      lastWidth = scroller.clientWidth;
      trip = null;
      boxesOf = new WeakMap();
      onScroll();
    });
    resize.observe(scroller);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
      clearTimeout(startTimer);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      resize.disconnect();
      robotHandoff.offerToTake(null);
      if (active) giveUp();
      robotLive.releaseControls(controls);
    };
  }, [sectionRefs]);

  return (
    <div className={styles.layer} aria-hidden>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}

export default memo(PageRobot);
