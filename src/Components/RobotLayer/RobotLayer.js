import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dropdown } from "antd";
import { robotLive } from "../../planner/robotLive";
import { robotHandoff } from "../../planner/robotHandoff";
import { character } from "../../planner/character";
import { LOOKS, chosenLook, rememberLook } from "../../planner/robots";
import { angleTo, clamp01, easeInOut, easeOut, GREY, HOP_PEAK, lerp } from "../../planner/robots/shared";
import styles from "./robotLayer.module.scss";

// The robot itself, whichever driver moves it (the hero's planner, or the
// page robot further down). The drivers draw their plans and report where
// the robot is (robotLive); this draws the robot there in the look chosen
// (planner/robots), with what it feels and notices (planner/character), and
// lets the reader play with it:
//   watch:   it looks at a mouse or pen pointer;
//   boop:    tap it and it hops, pleased; tap it a few times and it gets
//            dizzy;
//   carry:   drag it somewhere (on touch, hold it first: a swipe that
//            starts on it scrolls the page); it plans on from where it is
//            set down: by the hero's planner in the hero, by the page
//            robot below it, whichever had it;
//   send:    tap free space it could drive to (the pointer becomes a goal
//            marker there) and it plans a route there;
//   pet:     stroke it back and forth (a mouse or pen, no click) and it
//            purrs: it smiles at you, and hearts float off it;
//   proud:   parked after a long trip, it smiles at you, and a sparkle
//            twinkles beside its head;
//   read:    scroll slowly through the page and its eyes read along; it
//            looks up when you stop;
//   sleep:   left alone, it fidgets while it waits, then yawns and dozes
//            off once it stands still (in the hero after a few routes, at
//            home in the tagline's bullet; further down the page after a
//            while); any input wakes it with a start (a "!", and a jump);
//   looks:   right-click it to choose how it looks.
// With reduced motion it is drawn still, and none of this happens.

const BUBBLE_ROOM = 46; // px above it for its "z"s, "?" and "!"
// A "z" shrinks as it floats off: three show at once, each clearly smaller
// than the one before it
const Z_PX = { from: 12, to: 4 };
// Px around its body that still takes hold of it: small, since it drives
// close to the hero's links and must never take their clicks
const HIT_SLOP = { fine: 3, coarse: 8 };
const DRAG_START_PX = 4; // a mouse: moved this far while pressed, it is carried
// Touch and pen: held this long, it is picked up. Moved farther before
// then, it was a swipe, and the page scrolls.
const LONG_PRESS_MS = 400;
const PRESS_SLOP_PX = 8;
const PICKUP_MS = 200; // picked up, it comes to the hand
const LAND_MS = 260;
const UNFOLD_MS = 750;
const SPEED_SMOOTH_MS = 90;
const POINTER_GONE_MS = 1500; // after the pointer leaves the page
// Its gaze, like a real robot's: it sees the pointer where it was this long
// ago (ms), and turns its gaze like a motor, speeding up and slowing into
// place (critically damped, never past it), as the page robot turns
const GAZE = { noticeMs: 250, stiffness: 90, maxRate: 5 };
// Booped, it hops out from under the pointer (which hid its face), to land
// facing it this far (px) from where it points: above it if there is room,
// as a pointer hangs below where it points, and farther if below. On touch
// the finger has lifted off it, so it hops where it is.
const HOP = { ms: 380, clear: 25, below: 7 };
const STARTLE_HOP_MS = 300; // woken: a jump on the spot, quicker than a boop's
// Driving faster than this (px/s), it is leaving the pointer anyway: it
// hops as it goes rather than leave its route
const HOP_ON_THE_MOVE = 20;
const ICON_PX = 30; // its picture in the menu of looks
// Petting: strokes back and forth over it, each at least this long (px),
// this many turns within this long (ms)
const PET = { stroke: 3, turns: 3, within: 1500, slop: 6 };
// Reading along: scrolling at a reading pace (px/s, averaged over the last
// `window` ms) for a while; it looks up for `lookUp` ms after you stop, if
// it read for at least `minRead` ms
const READ = { slow: 12, fast: 450, window: 1200, stopAfter: 450, minRead: 1200, lookUp: 800, lineMs: 1100 };

const isInteractive = (el) =>
  !!el.closest("a, button, input, textarea, select, label, summary, [role='button'], [contenteditable]");

// A look standing still, as it shows in the menu
const stillState = (look, icon, dpr) => ({
  x: 0,
  y: 0,
  theta: icon.heading,
  heading: icon.heading,
  t: 0,
  dt: 16,
  R: look.radius,
  dpr,
  activity: "wait",
  speed: 0,
  vx: 0,
  vy: 0,
  turn: 0,
  open: 1,
  sleep: 0,
  lift: 0,
  hop: 0,
  hopping: false,
  carried: false,
  mood: { happy: 0, dizzy: 0, startled: 0, confused: 0, purr: 0, proud: 0 },
  gaze: icon.heading,
  look: 0,
  pointer: null,
  unfold: 1,
  alpha: 1,
  reduced: true,
});

function RobotIcon({ look }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(ICON_PX * dpr);
    canvas.height = Math.round(ICON_PX * dpr);
    const ctx = canvas.getContext("2d");
    const icon = { heading: -Math.PI / 4, x: 0, y: 0, scale: 1, ...look.icon };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(ICON_PX / 2 + icon.x, ICON_PX / 2 + icon.y);
    ctx.scale(icon.scale, icon.scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    look.draw(ctx, stillState(look, icon, dpr), {});
  }, [look]);
  return <canvas ref={ref} className={styles.icon} aria-hidden />;
}

function RobotLayer() {
  const canvasRef = useRef(null);
  const handleRef = useRef(null);
  const lookRef = useRef(null);
  const pressRef = useRef(null); // the kind of pointer last pressed on it
  const [lookId, setLookId] = useState(() => chosenLook().id);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const look = LOOKS.find((l) => l.id === lookId);
    const previous = lookRef.current;
    lookRef.current = {
      look,
      memo: {},
      // Changed while on the page: it folds back to the bullet and unfolds
      // as the new look
      swappedAt: previous && previous.look.id !== lookId ? performance.now() : null,
    };
    // The drivers keep content clear of its body and of the handle around it,
    // so the handle never takes a click meant for a link (their margins are
    // set for today's disc, which reached 1.5px past them)
    robotLive.setReach((look.reach || look.radius) + HIT_SLOP.fine + 1.5);
    robotLive.report({}); // redraw in the new look
  }, [lookId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const handle = handleRef.current;
    const scroller = document.getElementById("root");
    if (!canvas || !handle || !scroller) return undefined;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const ctx = canvas.getContext("2d");

    let frame = 0;
    let timer = 0;
    let lastRender = 0;
    let lastFrame = 0;
    let prev = null; // the last pose drawn, for its speed
    let vx = 0;
    let vy = 0;
    let turn = 0;
    let wasBullet = false;
    let unfoldFrom = null;
    let foldFrom = null; // going back into its bullet (home, to sleep)
    let lastActivity = null;
    let pet = null; // strokes over it: { dir, travel, turns: [times] }
    const scrolls = []; // [{ t, top }], recent
    let readFrom = null; // reading along since
    let readUntil = -Infinity; // and stopped then
    let seenSwap = null;
    let pointer = null; // a mouse or pen: { x, y } viewport px
    const pointerTrail = []; // and where it was: [{ x, y, t }], recent
    let gazeNow = null; // rad, where its gaze is turned
    let gazeSpin = 0; // rad/s
    let pointerLeftAt = -Infinity;
    // Pressed on it: { id, kind, from, at, client, grab, pose, moved, timer,
    // controls, liftFrom, liftAt }
    let carry = null;
    let landing = null; // { from, to, start, pass }
    let hop = null; // { start, ms, inPlace, from, to, controls }
    let spin = 0; // dizzy, rad
    let shown = null; // { pose, look } last drawn
    let speedNow = 0; // px/s, as last drawn

    const toPage = (clientX, clientY) => {
      const origin = scroller.getBoundingClientRect();
      return { x: clientX - origin.left, y: clientY - origin.top + scroller.scrollTop };
    };

    const currentPose = (now) => {
      if (carry && carry.moved) {
        // Coming to the hand that took it, then held there
        const k = easeOut(clamp01((now - carry.liftAt) / PICKUP_MS));
        if (k >= 1) return carry.pose;
        return {
          ...carry.pose,
          x: lerp(carry.liftFrom.x, carry.pose.x, k),
          y: lerp(carry.liftFrom.y, carry.pose.y, k),
        };
      }
      if (hop && !hop.inPlace) {
        // Across at an even pace (it is in the air), turning to face you
        const k = clamp01((now - hop.start) / hop.ms);
        return {
          x: lerp(hop.from.x, hop.to.x, k),
          y: lerp(hop.from.y, hop.to.y, k),
          theta: hop.from.theta + angleTo(hop.from.theta, hop.to.theta) * easeOut(k),
        };
      }
      if (landing) {
        const k = easeOut(clamp01((now - landing.start) / LAND_MS));
        return {
          x: lerp(landing.from.x, landing.to.x, k),
          y: lerp(landing.from.y, landing.to.y, k),
          theta: landing.from.theta + angleTo(landing.from.theta, landing.to.theta) * k,
        };
      }
      return robotLive.state.pose;
    };

    const hide = () => {
      canvas.style.visibility = "hidden";
      handle.style.display = "none";
      shown = null;
      setMenuOpen(false);
    };

    // Reading along, while the page robot waits in view: { line 0…1 or null
    // (looking up, after), up 0…1 }, or null
    const readingAt = (now, activity) => {
      const controls = robotLive.controls;
      if (reduceMotion || !controls || !controls.readsAlong || activity !== "wait") return null;
      if (readFrom !== null && now - readUntil < READ.stopAfter) {
        return { line: ((now - readFrom) % READ.lineMs) / READ.lineMs, up: 0 };
      }
      if (readFrom !== null && readUntil - readFrom >= READ.minRead && now - readUntil < READ.stopAfter + READ.lookUp) {
        return { line: null, up: 1 };
      }
      return null;
    };
    const onScrollRead = () => {
      const now = performance.now();
      scrolls.push({ t: now, top: scroller.scrollTop });
      while (scrolls.length && now - scrolls[0].t > READ.window) scrolls.shift();
      let travelled = 0;
      for (let i = 1; i < scrolls.length; i++) travelled += Math.abs(scrolls[i].top - scrolls[i - 1].top);
      const pace = (travelled / READ.window) * 1000;
      const reading = pace >= READ.slow && pace <= READ.fast;
      if (reading) {
        if (readFrom === null || now - readUntil > READ.stopAfter + READ.lookUp) readFrom = now;
        readUntil = now;
      } else if (pace > READ.fast) {
        readFrom = null; // skimming, not reading
      }
      if (!frame) schedule(true);
    };

    // Petting: a mouse or pen stroking back and forth over it, unpressed
    const strokeAt = (event) => {
      if (reduceMotion || event.pointerType === "touch" || event.buttons || carry || !shown) {
        pet = null;
        return;
      }
      const at = toPage(event.clientX, event.clientY);
      const { pose, look } = shown;
      if (Math.hypot(at.x - pose.x, at.y - pose.y) > look.radius + PET.slop) {
        pet = null;
        return;
      }
      const now = performance.now();
      if (!pet) {
        pet = { x: at.x, dir: 0, travel: 0, turns: [] };
        return;
      }
      const dx = at.x - pet.x;
      pet.x = at.x;
      if (Math.abs(dx) < 0.5) return;
      const dir = Math.sign(dx);
      if (dir !== pet.dir) {
        if (pet.dir !== 0 && pet.travel >= PET.stroke) pet.turns.push(now);
        pet.dir = dir;
        pet.travel = Math.abs(dx);
      } else {
        pet.travel += Math.abs(dx);
      }
      pet.turns = pet.turns.filter((t) => now - t < PET.within);
      if (pet.turns.length >= PET.turns) character.pet(now);
    };

    // Everything a look draws from (planner/robots/shared.js)
    const describe = (pose, now, dt, look) => {
      const state = robotLive.state;
      const held = (carry && carry.moved) || landing || (hop && !hop.inPlace);
      const activity = held ? "wait" : state.activity;
      // Speed, from how it has moved since the last frame
      if (prev && now > prev.t) {
        const d = now - prev.t;
        const k = 1 - Math.exp(-d / SPEED_SMOOTH_MS);
        vx = lerp(vx, ((pose.x - prev.x) / d) * 1000, k);
        vy = lerp(vy, ((pose.y - prev.y) / d) * 1000, k);
        turn = lerp(turn, (angleTo(prev.theta, pose.theta) / d) * 1000, k);
      }
      prev = { x: pose.x, y: pose.y, theta: pose.theta, t: now };
      const speed = Math.hypot(vx, vy);
      speedNow = speed;

      // Camouflaged as the bullet, then breaking cover; and again when its
      // look is changed
      const { swappedAt } = lookRef.current;
      if (swappedAt !== null && swappedAt !== seenSwap) {
        seenSwap = swappedAt;
        if (activity !== "bullet") {
          wasBullet = true;
          unfoldFrom = swappedAt;
        }
      }
      let unfold = 1;
      if (activity === "bullet") {
        // Back into its bullet (gone home to sleep): it folds up
        if (lastActivity !== null && lastActivity !== "bullet" && lastActivity !== "hidden") foldFrom = now;
        wasBullet = true;
        unfoldFrom = null;
        unfold = foldFrom === null ? 0 : 1 - easeInOut(clamp01((now - foldFrom) / UNFOLD_MS));
      } else if (wasBullet) {
        foldFrom = null;
        if (unfoldFrom === null) unfoldFrom = now;
        unfold = easeInOut(clamp01((now - unfoldFrom) / UNFOLD_MS));
      }
      lastActivity = activity;

      // What it looks at: you, while you hold it or point near; where it is
      // going while it searches; ahead while it drives
      const noticed = pointerTrail.filter((p) => p.t <= now - GAZE.noticeMs).pop();
      const seen = noticed && !(now - pointerLeftAt > POINTER_GONE_MS && pointerLeftAt > 0) ? toPage(noticed.x, noticed.y) : null;
      let gaze = pose.theta;
      // Showing you something, it looks at that (its heading), not your pointer
      const pointing = !!state.pointing && activity === "wait" && !carry;
      if (pointing) gaze = pose.theta;
      else if (seen && (activity === "wait" || activity === "wake" || carry)) gaze = Math.atan2(seen.y - pose.y, seen.x - pose.x);
      else if (state.goal && activity === "search") gaze = Math.atan2(state.goal.y - pose.y, state.goal.x - pose.x);
      else if (seen && activity !== "drive") gaze = Math.atan2(seen.y - pose.y, seen.x - pose.x);
      // Fidgeting, it glances one way and then the other; reading along, its
      // gaze runs along the lines (looks that draw these themselves have
      // `fidget` and `reading` too)
      const fidget = reduceMotion ? null : character.fidget(now);
      if (fidget && fidget.kind === "glance") gaze = pose.theta + (fidget.k < 0.5 ? -0.7 : 0.7) * Math.sin(Math.PI * ((fidget.k * 2) % 1));
      const reading = readingAt(now, activity);
      if (reading && reading.line !== null) gaze = pose.theta + 0.5 * (2 * reading.line - 1);
      // Its gaze turns there, rather than jumping
      if (gazeNow === null || reduceMotion) {
        gazeNow = gaze;
        gazeSpin = 0;
      } else {
        const seconds = dt / 1000;
        const error = angleTo(gazeNow, gaze);
        gazeSpin += (GAZE.stiffness * error - 2 * Math.sqrt(GAZE.stiffness) * gazeSpin) * seconds;
        gazeSpin = Math.max(-GAZE.maxRate, Math.min(GAZE.maxRate, gazeSpin));
        gazeNow += gazeSpin * seconds;
        if (Math.abs(error) < 0.003 && Math.abs(gazeSpin) < 0.02) {
          gazeNow = gaze;
          gazeSpin = 0;
        }
      }
      const gazeSettling =
        gazeSpin !== 0 || (pointerTrail.length > 0 && pointerTrail[pointerTrail.length - 1].t > now - GAZE.noticeMs);
      gaze = gazeNow;
      const look01 = Math.max(-1, Math.min(1, angleTo(pose.theta, gaze) / 1.2));

      const mood = character.moods(now);
      // Looks that draw only the first moods show a purr or pride as happy
      if (!look.ownMoods) mood.happy = Math.max(mood.happy, mood.purr, mood.proud);
      // Moods move its whole body: a happy wiggle, a dizzy spin (two whole
      // turns, so it ends facing where it was)
      const wiggle = mood.happy > 0 ? 0.3 * Math.sin(character.progress("happy", now) * Math.PI * 6) * (1 - character.progress("happy", now)) : 0;
      spin = mood.dizzy > 0 ? 4 * Math.PI * easeInOut(character.progress("dizzy", now)) : 0;
      // Its hop: up and back down, as a thrown thing falls
      const hopK = hop ? clamp01((now - hop.start) / hop.ms) : 1;

      return {
        s: {
          x: pose.x,
          y: pose.y,
          theta: pose.theta + wiggle + spin,
          heading: pose.theta,
          t: now,
          dt,
          R: look.radius,
          dpr: Math.min(3, window.devicePixelRatio || 1),
          activity,
          speed,
          vx,
          vy,
          turn,
          open: reduceMotion ? 1 : fidget && fidget.kind === "yawn" ? Math.min(character.open(now), 0.2 + 0.8 * Math.abs(2 * fidget.k - 1) ** 3) : character.open(now),
          sleep: reduceMotion ? 0 : character.sleep(now),
          lift: character.lift(now),
          hop: hop ? HOP_PEAK * 4 * hopK * (1 - hopK) : 0,
          hopping: !!hop,
          carried: !!(carry && carry.moved),
          mood,
          moodK: { proud: character.progress("proud", now), purr: character.progress("purr", now) },
          pointing,
          fidget,
          reading,
          gaze,
          look: look01,
          pointer: seen,
          unfold,
          alpha: state.alpha === undefined ? 1 : state.alpha,
          reduced: reduceMotion,
        },
        moving: speed > 2 || Math.abs(turn) > 0.05 || (unfold > 0 && unfold < 1) || !!reading,
        gazeSettling,
      };
    };

    // Its "z", "?" and "!" go on a side of it that is free space (above if
    // it can), so they never sit over text. A "?" or "!" keeps its side while
    // it shows; each "z" takes the side free as it appears (it may still be
    // finishing a drive) and floats off along its `trail` (px, over its life).
    let bubbleSide = null;
    const HEART = { every: 650, life: 1300 }; // ms
    const hearts = []; // [{ t, side, dx }]
    let lastHeartAt = -Infinity;
    const zSides = new Map(); // a "z"'s index → its side
    const SIDES = [
      { id: "up", at: (up) => ({ x: 0, y: -up }), trail: [18, -36] },
      { id: "down", at: (up) => ({ x: 0, y: up + 16 }), trail: [26, 8] },
      { id: "right", at: (up) => ({ x: up + 6, y: 4 }), trail: [22, -26] },
      { id: "left", at: (up) => ({ x: -(up + 6), y: 4 }), trail: [-22, -26] },
    ];
    const chooseBubbleSide = (s, up) => {
      const controls = robotLive.controls;
      if (!controls) return SIDES[0];
      return (
        SIDES.find(({ at, trail }) => {
          const { x, y } = at(up);
          return [0, 0.5, 1].every((k) => controls.canStand(s.x + x + trail[0] * k, s.y + y + trail[1] * k));
        }) || SIDES[0]
      );
    };

    const drawBubbles = (s, look, now) => {
      const up = look.bubbleAt ? look.bubbleAt(s) : look.radius + 10;
      const bubble = (glyph, x, y, size, alpha) => {
        if (look.drawBubble) {
          look.drawBubble(ctx, glyph, { x, y, size, alpha }, s);
          return;
        }
        const text = { heart: "♥", sparkle: "✦" }[glyph] || glyph;
        ctx.font = `italic 500 ${size}px Newsreader, Georgia, serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(17, 17, 17, ${0.9 * alpha})`;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = text === glyph ? GREY(0.85 * alpha) : `rgba(251, 177, 60, ${0.9 * alpha})`;
        ctx.fillText(text, x, y);
      };
      // Three at a time, each shrinking as it floats off: in quickly, out slowly
      const snores = character.snores(now);
      for (const index of zSides.keys()) if (!snores.some((z) => z.index === index)) zSides.delete(index);
      for (const { age, alpha, index } of snores) {
        if (!zSides.has(index)) zSides.set(index, chooseBubbleSide(s, up));
        const { at, trail } = zSides.get(index);
        const from = at(up);
        const a = Math.min(1, age / 0.12, (1 - age) / 0.3) * alpha;
        const size = Z_PX.from - (Z_PX.from - Z_PX.to) * age;
        bubble("z", from.x + trail[0] * (0.15 + age), from.y + trail[1] * age, size, a * s.alpha);
      }
      // Petted: hearts float off while you go on, one at a time, each on the
      // side free as it appears, as the "z"s do (to one side, then the other)
      if (s.mood.purr > 0.3 && now - lastHeartAt > HEART.every) {
        lastHeartAt = now;
        hearts.push({ t: now, side: chooseBubbleSide(s, up), dx: hearts.length % 2 ? -5 : 5 });
      }
      while (hearts.length && now - hearts[0].t > HEART.life) hearts.shift();
      for (const { t, side, dx } of hearts) {
        const age = (now - t) / HEART.life;
        const a = Math.min(1, age / 0.15, (1 - age) / 0.35);
        const from = side.at(up);
        bubble("heart", from.x + dx + side.trail[0] * 0.5 * age, from.y + 4 + side.trail[1] * 0.8 * age, 12, a * s.alpha);
      }
      // Pleased with a long trip: a sparkle twinkles beside its head, where
      // its "!" would be
      const proud = s.mood.proud > 0 && s.moodK.proud < 0.85;
      if (!(s.mood.confused > 0) && !(s.mood.startled > 0) && !proud) {
        bubbleSide = null;
        return;
      }
      if (!bubbleSide) bubbleSide = chooseBubbleSide(s, up);
      const anchor = bubbleSide.at(up);
      if (proud) {
        const k = s.moodK.proud;
        const size = k < 0.12 || (k > 0.35 && k < 0.47) || k > 0.7 ? 8 : 12;
        bubble("sparkle", anchor.x + (bubbleSide.id === "left" ? -9 : 9), anchor.y + 2, size, s.alpha);
      }
      if (s.mood.confused > 0) bubble("?", anchor.x, anchor.y, 15, s.mood.confused * s.alpha);
      if (s.mood.startled > 0) bubble("!", anchor.x, anchor.y - (1 - s.mood.startled) * 4, 15, s.mood.startled * s.alpha);
    };

    const render = (now) => {
      lastRender = now;
      const dt = Math.min(50, Math.max(1, now - (lastFrame || now - 16)));
      lastFrame = now;
      const state = robotLive.state;
      const pose = currentPose(now);
      const { look, memo } = lookRef.current;
      if (!pose || (state.activity === "hidden" && !carry && !landing && !hop)) {
        hide();
        return false;
      }
      const controls = robotLive.controls;
      const idle = state.activity === "wait" && !carry && !hop && !landing;
      character.update(now, !!(controls && controls.mayDoze) && state.activity === "wait", idle, look.fidgets || ["glance"]);
      const { s, moving, gazeSettling } = describe(pose, now, dt, look);
      const half = Math.ceil(look.extent + BUBBLE_ROOM + HOP_PEAK);
      const dpr = s.dpr;
      const size = 2 * half;
      if (canvas.width !== Math.round(size * dpr)) {
        canvas.width = Math.round(size * dpr);
        canvas.height = Math.round(size * dpr);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
      }
      const left = Math.round(pose.x) - half;
      const top = Math.round(pose.y) - half;
      canvas.style.visibility = "visible";
      canvas.style.transform = `translate(${left}px, ${top}px)`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.translate(pose.x - left, pose.y - top);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      look.draw(ctx, s, memo);
      if (!reduceMotion) drawBubbles(s, look, now);

      // The handle you take hold of
      const slop = coarsePointer.matches ? HIT_SLOP.coarse : HIT_SLOP.fine;
      const r = look.radius * (look.hitScale || 1) + slop;
      handle.style.display = reduceMotion || s.alpha < 0.5 ? "none" : "block";
      handle.style.width = `${2 * r}px`;
      handle.style.height = `${2 * r}px`;
      handle.style.transform = `translate(${pose.x - r}px, ${pose.y - r}px)`;
      shown = { pose, look };

      if (reduceMotion) return false;
      return (
        moving ||
        gazeSettling ||
        hearts.length > 0 ||
        !!carry ||
        !!landing ||
        !!hop ||
        character.animating(now) ||
        (look.busy ? look.busy(s, memo) : false)
      );
    };

    const schedule = (busy) => {
      clearTimeout(timer);
      if (frame || reduceMotion) return;
      if (busy) {
        frame = requestAnimationFrame(loop);
        return;
      }
      const now = performance.now();
      const at = character.nextEventAt(now);
      timer = setTimeout(() => {
        if (!frame) frame = requestAnimationFrame(loop);
      }, Math.max(16, Math.min(60000, at - now)));
    };

    // Set down after a carry, or landed from a hop: the driver plans on
    const finishLanding = () => {
      const { to, pass } = landing;
      landing = null;
      robotHandoff.setInHand(false);
      if (pass) {
        pass.take(to);
        return;
      }
      const controls = robotLive.controls;
      if (controls) controls.drop(to);
    };
    const finishHop = () => {
      const { inPlace, to, controls } = hop;
      hop = null;
      if (!inPlace && controls === robotLive.controls) controls.drop(to);
    };

    function loop(now) {
      frame = 0;
      // A driver already drew this frame: just keep going
      const busy = now - lastRender < 8 ? true : render(now);
      if (landing && now - landing.start >= LAND_MS) finishLanding();
      if (hop && now - hop.start >= hop.ms) finishHop();
      schedule(busy);
    }

    // The drivers move it: draw it where they put it, in the same frame
    const unsubscribe = robotLive.subscribe(() => {
      if (carry && carry.moved) return;
      const busy = render(performance.now());
      schedule(busy);
    });

    // ---- watching, and staying awake ----
    const onPointerMove = (event) => {
      character.input();
      if (event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      const now = performance.now();
      pointerTrail.push({ ...pointer, t: now });
      while (pointerTrail.length > 2 && pointerTrail[1].t < now - GAZE.noticeMs) pointerTrail.shift();
      pointerLeftAt = -Infinity;
      strokeAt(event);
      if (!frame) schedule(true);
      updateGoalCursor(event);
    };
    const onPointerOut = (event) => {
      if (event.relatedTarget) return;
      pointerLeftAt = performance.now();
      if (!frame) schedule(true);
    };
    const onInput = () => {
      const wasAsleep = character.asleep;
      character.input();
      if (wasAsleep && !frame) schedule(true);
    };
    const wakeUp = character.subscribe((event) => {
      // Woken with a start: it jumps on the spot (not in your hand); saying
      // hello, it bounces
      if ((event === "wake" || event === "greet") && !reduceMotion && shown && !carry && !hop && !landing) {
        hop = { start: performance.now(), ms: event === "wake" ? STARTLE_HOP_MS : HOP.ms, inPlace: true };
      }
      if (!frame) schedule(true);
    });

    // ---- send: tap free space ----
    let goalCursor = false;
    const freeSpaceAt = (event) => {
      if (reduceMotion || carry || hop || !robotLive.controls) return null;
      const target = event.target;
      if (!(target instanceof Element) || isInteractive(target) || handle.contains(target)) return null;
      const at = toPage(event.clientX, event.clientY);
      return robotLive.controls.canCommand(at.x, at.y) ? at : null;
    };
    function updateGoalCursor(event) {
      const free = !!freeSpaceAt(event);
      if (free !== goalCursor) {
        goalCursor = free;
        scroller.classList.toggle(styles.goalCursor, free);
      }
    }
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;
      const at = freeSpaceAt(event);
      if (!at) return;
      character.input();
      robotLive.controls.command(at.x, at.y);
    };

    // ---- boop: a hop ----
    // Where it lands: up, leaning away from where on it you pointed, else
    // the nearest way round from there that is free space. It lands facing
    // you, unless its look hops as it lies (a snake).
    const hopSpot = (controls, at, pose, look) => {
      const lean = Math.max(-1, Math.min(1, (pose.x - at.x) / look.radius));
      const ahead = -Math.PI / 2 + (lean * Math.PI) / 4;
      const turns = lean >= 0 ? [0, 1, -1, 2, -2, 3, -3, 4] : [0, -1, 1, -2, 2, -3, 3, 4];
      for (const k of turns) {
        const a = ahead + (k * Math.PI) / 4;
        const d = HOP.clear + HOP.below * Math.max(0, Math.sin(a));
        const x = at.x + d * Math.cos(a);
        const y = at.y + d * Math.sin(a);
        const theta = look.hopTurn === false ? pose.theta : Math.atan2(at.y - y, at.x - x);
        if (controls.canStand(x, y)) return { x, y, theta };
      }
      return null;
    };
    const boop = (event) => {
      character.boop();
      const now = performance.now();
      const controls = robotLive.controls;
      const at = toPage(event.clientX, event.clientY);
      const away = event.pointerType !== "touch" && speedNow < HOP_ON_THE_MOVE && controls && shown;
      const to = away && hopSpot(controls, at, shown.pose, shown.look);
      if (to) {
        controls.pickUp();
        hop = { start: now, ms: HOP.ms, inPlace: false, from: { ...shown.pose }, to, controls };
      } else {
        hop = { start: now, ms: HOP.ms, inPlace: true };
      }
    };

    // ---- carry: the handle ----
    // Within where its driver may take it, or where the other would take it
    // from there: the nearer
    const follow = (at) => {
      const want = { x: at.x - carry.grab.x, y: at.y - carry.grab.y };
      const taker = robotHandoff.taker;
      let best = null;
      for (const bounds of taker ? [carry.controls.bounds(), taker.bounds()] : [carry.controls.bounds()]) {
        const x = Math.min(bounds.right, Math.max(bounds.left, want.x));
        const y = Math.min(bounds.bottom, Math.max(bounds.top, want.y));
        const off = Math.hypot(x - want.x, y - want.y);
        if (!best || off < best.off) best = { x, y, off };
      }
      carry.pose = { ...carry.pose, x: best.x, y: best.y };
    };
    const takeHold = () => {
      if (!carry || carry.moved) return;
      const controls = robotLive.controls;
      if (!controls) return;
      const now = performance.now();
      carry.moved = true;
      carry.controls = controls;
      carry.liftFrom = shown ? { ...shown.pose } : { ...carry.pose };
      carry.liftAt = now;
      robotHandoff.setInHand(true);
      controls.pickUp();
      character.pickUp(now);
      handle.classList.add(styles.held);
      follow(carry.at);
      if (!frame) schedule(true);
    };
    const onHandleDown = (event) => {
      pressRef.current = event.pointerType;
      if (reduceMotion || !shown || carry || (hop && !hop.inPlace)) return;
      const mouse = event.pointerType === "mouse";
      // A ctrl-click is a right-click on a Mac: the menu, not a boop
      if (mouse && (event.button !== 0 || event.ctrlKey)) return;
      if (mouse) event.preventDefault();
      if (landing) finishLanding();
      handle.setPointerCapture(event.pointerId);
      const at = toPage(event.clientX, event.clientY);
      carry = {
        id: event.pointerId,
        kind: event.pointerType,
        from: at,
        at,
        client: { x: event.clientX, y: event.clientY },
        grab: { x: at.x - shown.pose.x, y: at.y - shown.pose.y },
        pose: { ...shown.pose },
        moved: false,
        timer: mouse ? 0 : setTimeout(takeHold, LONG_PRESS_MS),
      };
      character.input();
    };
    const onHandleMove = (event) => {
      if (!carry || event.pointerId !== carry.id) return;
      const at = toPage(event.clientX, event.clientY);
      carry.at = at;
      carry.client = { x: event.clientX, y: event.clientY };
      if (!carry.moved) {
        const far = Math.hypot(at.x - carry.from.x, at.y - carry.from.y);
        if (carry.kind !== "mouse") {
          // Moving before it was held: a swipe, so the page scrolls
          if (far > PRESS_SLOP_PX) {
            clearTimeout(carry.timer);
            carry = null;
          }
          return;
        }
        if (far < DRAG_START_PX) return;
        takeHold();
        if (!carry.moved) return;
      }
      follow(at);
      if (!frame) schedule(true);
    };
    const onHandleUp = (event) => {
      if (!carry || event.pointerId !== carry.id) return;
      const was = carry;
      const pose = currentPose(performance.now());
      clearTimeout(was.timer);
      carry = null;
      handle.classList.remove(styles.held);
      if (!was.moved) {
        if (event.type === "pointerup") boop(event);
      } else {
        // Set it down where it may stand, nearest where it was let go: in the
        // hero, the hero has it from there; below it, the page robot
        const taker = robotHandoff.taker;
        const heroHasIt = robotHandoff.owner === "hero";
        const hero = heroHasIt ? was.controls.bounds() : taker && taker.bounds();
        let pass = taker && (pose.y <= hero.bottom) !== heroHasIt ? taker : null;
        let to = pass && pass.place(pose.x, pose.y);
        if (!to) {
          pass = null;
          to = was.controls.place(pose.x, pose.y) || was.from;
        }
        character.setDown();
        landing = { from: pose, to: { ...pose, ...to }, start: performance.now(), pass };
      }
      if (!frame) schedule(true);
    };
    // Scrolled while it is held (a mouse's wheel): it stays in the hand
    const onScrollCarry = () => {
      if (!carry || !carry.moved) return;
      carry.at = toPage(carry.client.x, carry.client.y);
      follow(carry.at);
      if (!frame) schedule(true);
    };
    // Once it is held, a finger moving it moves it, not the page
    const onTouchMove = (event) => {
      if (carry && carry.moved && event.cancelable) event.preventDefault();
    };
    // Never the browser's menu over it (the menu of looks opens instead, for
    // a mouse)
    const onContextMenu = (event) => event.preventDefault();
    const closeMenu = () => setMenuOpen(false);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut);
    window.addEventListener("pointerdown", onInput, { passive: true });
    window.addEventListener("keydown", onInput);
    window.addEventListener("wheel", onInput, { passive: true });
    window.addEventListener("resize", closeMenu);
    scroller.addEventListener("scroll", onInput, { passive: true });
    scroller.addEventListener("scroll", onScrollRead, { passive: true });
    scroller.addEventListener("scroll", onScrollCarry, { passive: true });
    scroller.addEventListener("scroll", closeMenu, { passive: true });
    scroller.addEventListener("click", onClick);
    handle.addEventListener("pointerdown", onHandleDown);
    handle.addEventListener("pointermove", onHandleMove);
    handle.addEventListener("pointerup", onHandleUp);
    handle.addEventListener("pointercancel", onHandleUp);
    handle.addEventListener("touchmove", onTouchMove, { passive: false });
    handle.addEventListener("contextmenu", onContextMenu);
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (carry && carry.moved) onHandleUp({ pointerId: carry.id, type: "pointercancel" });
      closeMenu();
    };
    window.addEventListener("keydown", onKey);

    schedule(true);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      if (carry) clearTimeout(carry.timer);
      unsubscribe();
      wakeUp();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("pointerdown", onInput);
      window.removeEventListener("keydown", onInput);
      window.removeEventListener("wheel", onInput);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", onKey);
      scroller.removeEventListener("scroll", onInput);
      scroller.removeEventListener("scroll", onScrollRead);
      scroller.removeEventListener("scroll", onScrollCarry);
      robotHandoff.setInHand(false);
      scroller.removeEventListener("scroll", closeMenu);
      scroller.removeEventListener("click", onClick);
      scroller.classList.remove(styles.goalCursor);
      handle.removeEventListener("pointerdown", onHandleDown);
      handle.removeEventListener("pointermove", onHandleMove);
      handle.removeEventListener("pointerup", onHandleUp);
      handle.removeEventListener("pointercancel", onHandleUp);
      handle.removeEventListener("touchmove", onTouchMove);
      handle.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  // ---- the menu of looks: right-click it ----
  const onMenuOpenChange = useCallback((open) => {
    // Not a long press on touch, which picks it up
    setMenuOpen(open && pressRef.current !== "touch" && pressRef.current !== "pen");
  }, []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const menu = useMemo(
    () => ({
      items: LOOKS.map((look) => ({ key: look.id, label: look.name, icon: <RobotIcon look={look} /> })),
      selectable: true,
      selectedKeys: [lookId],
      onClick: ({ key }) => {
        setLookId(key);
        rememberLook(key);
        setMenuOpen(false);
      },
    }),
    [lookId],
  );

  return (
    <>
      {/* While the menu is open, a clear shield covers the page, so the
          click that closes it never also sends the robot somewhere */}
      {menuOpen && (
        <div
          className={styles.menuShield}
          onClick={closeMenu}
          onContextMenu={(event) => {
            event.preventDefault();
            closeMenu();
          }}
          aria-hidden
        />
      )}
      <div className={styles.layer} aria-hidden>
        <canvas ref={canvasRef} className={styles.canvas} />
        <Dropdown
          menu={menu}
          trigger={["contextMenu"]}
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          overlayClassName={styles.menu}
        >
          <div ref={handleRef} className={styles.handle} />
        </Dropdown>
      </div>
    </>
  );
}

export default memo(RobotLayer);
