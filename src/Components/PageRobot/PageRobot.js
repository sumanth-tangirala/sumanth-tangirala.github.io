import React, { memo, useEffect, useRef } from "react";
import { createRRTStar, seededRandom } from "../../planner/rrtStar";
import { holonomic } from "../../planner/motion";
import { measureObstacles } from "../../planner/heroObstacles";
import { createApproach } from "../../planner/drive";
import { drawGoal, drawRobot, drawTree, strokePath } from "../../planner/draw";
import { robotHandoff } from "../../planner/robotHandoff";
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
// between sections. It takes the robot over where the hero left it once the
// hero has scrolled out of view, and drives it back into the hero when the
// reader returns there; the hero's planner carries on from it. Its tree and
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
// What is drawn: a window around the screen, moved with it when the reader
// stops (fractions of the screen height above it, and in all)
const WINDOW = { above: 0.3, height: 1.6 };
const STEP = 26;
const GOAL_RADIUS = 2;
const SEARCH_RATE = 1.4; // nodes per ms: a quick look, not the hero's slow search
// ... per screen height the trip spans: a long way is searched as quickly
// Out of view it hurries: no turn on the spot, and it drives this much faster
// (it still travels the whole way). Its tree and path are drawn only while
// it is in view, fading in as it arrives; the goal always shows.
const OFFSCREEN_HURRY = 2;
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
// Its speed is the distance left over this many seconds (≈ 490 px/s a screen
// height away), within these limits, px/s and px/s²
const APPROACH = { timeConstant: 2, minSpeed: 160, maxSpeed: 2400, accel: 2400 };
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

// The tight box around a section's content, in viewport px. `boxes`: its
// elements drawn as boxes (they rarely change, so they are found once)
const contentBox = (section, boxes) => {
  const box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
  const add = (r) => {
    if (r.width <= 0 || r.height <= 0) return;
    box.left = Math.min(box.left, r.left);
    box.right = Math.max(box.right, r.right);
    box.top = Math.min(box.top, r.top);
    box.bottom = Math.max(box.bottom, r.bottom);
  };
  const range = document.createRange();
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) add(rect);
  }
  section.querySelectorAll(CONTENT_BOXES).forEach((el) => add(el.getBoundingClientRect()));
  boxes.forEach((el) => add(el.getBoundingClientRect()));
  return box.left < box.right ? box : null;
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
  const boxes = sections.map((section) => contentBox(section, drawn(section))).filter(Boolean);
  const heroRect = toPage(hero.getBoundingClientRect(), 0);
  const heroObstacles = measureObstacles(hero, HERO_MARGIN).map((o) => ({
    left: o.left + heroRect.left,
    right: o.right + heroRect.left,
    top: o.top + heroRect.top,
    bottom: o.bottom + heroRect.top,
  }));
  const content = boxes.map((b) => toPage(b, CONTENT_MARGIN));
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

    const viewNow = () => ({ top: scroller.scrollTop, height: scroller.clientHeight });
    // Whether the robot can be seen (a robot's width past an edge counts)
    const inView = () =>
      !!pose && pose.y > scroller.scrollTop - 8 && pose.y < scroller.scrollTop + scroller.clientHeight + 8;
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
      robotHandoff.handBack(null);
    };

    const planTrip = (goal, handBack, attempt) => {
      const top = Math.max(0, Math.min(pose.y, goal.y) - REGION_PAD);
      const bottom = Math.min(world.height, Math.max(pose.y, goal.y) + REGION_PAD);
      // Staying on its side, it plans on that half of the page only
      const sameSide = sideOf(pose.x) === goal.side;
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
            // home, give the robot back)
            const { attempt, handBack } = trip;
            trip = null;
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
        const next = trip.drive.advance(inView() ? dt : dt * OFFSCREEN_HURRY);
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
          robotHandoff.handBack({ x: pose.x - world.hero.left, y: pose.y - world.hero.top, theta: pose.theta });
        } else {
          side = trip.goal.side;
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
      if (active && pose && (!trip || trip.phase === "fade")) {
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
      if (active && pose) drawRobot(ctx, { ...pose, y: pose.y - drawn.top, alpha: 1 });
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
        if (active) giveUp();
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
        robotHandoff.takeOver();
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
      if (active) giveUp();
    };
  }, [sectionRefs]);

  return (
    <div className={styles.layer} aria-hidden>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}

export default memo(PageRobot);
