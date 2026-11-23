import { angleTo, clamp01, HOP_PEAK } from "./shared";
import { ANCHOR, CAMO, CAMO_EYES, COLORS, compose, GLYPHS, LIDAR_GLINT, OUT_H, OUT_W, PAD_TOP } from "./pixel-sprites";

// The robot as a pixel-art sprite, as an old RPG draws its characters on
// the overworld: seen from above and in front, so it shows the top of its
// drum, its lidar puck, and the face on its front. Its art is drawn by hand
// in ./pixel-sprites.js; this places it on the page and animates it, all on
// a grid of whole art pixels:
//   facing:   sixteen facings, from nine drawings; it turns one facing at a
//             time, like a sprite does
//   waiting:  it turns to face you, as townsfolk do, and its eye pixels
//             follow your pointer; it blinks
//   search:   a glint goes round its lidar puck; it faces the goal
//   drive:    its wheels' treads roll (two frames) and it bobs a pixel, at
//             the pace of the ground it covers
//   moods:    it turns its face to you, and its eyes change: ∩ ∩ (booped),
//             x x (dizzy), wide (picked up), lopsided (confused), shut
//             lines (asleep, settled a pixel onto its wheels)
//   carried:  it rises a few pixels off its shadow, its wheels dangling
//   hop:      the same, higher, and back down
//   on load:  camouflaged as the tagline's bullet: tucked into an amber ball
//             the bullet's size, only its eyes in a slit giving it away (they
//             blink, and glance at your pointer); then it breaks cover,
//             popping up to its full size in a hop
// Nothing is smoothed: every pixel is a whole number of device pixels.

const ART_PX = 1.5; // CSS px per art pixel (rounded to whole device px)
const TURN_STEP_MS = 35; // it turns one facing (22.5°) at a time, this often
const TURN_SLACK = 0.1; // rad past a facing's edge before it turns
const NEAR_POINTER_PX = 24; // closer than this, a pointer has no direction
const TREAD_PX = 7; // px driven per tread frame
const TREAD_MAX_HZ = 8; // tread frames per second, at most
const GLINT_MS = 85; // the lidar glint's step while it searches
const LIFT_ART = 4; // art px it rises when picked up
const SHADOW_FILL = "rgba(0, 0, 0, 0.45)";
// Its shadow, a pixel ellipse at its wheels' feet, smaller once lifted:
// [first column, width] per row, centred under it
const SHADOW = { rest: [[2, 6], [0, 10], [2, 6]], lifted: [[2, 4], [0, 8], [2, 4]], row: 5 };
const SHAKE_RAD = 0.12; // a happy wiggle beyond this shifts it a pixel
// Breaking cover: s.unfold (0…1, eased), as time through it (0…1).
// Camouflaged until `at`, then it pops up to its full size in a hop `art`
// art px high, landed by `land`.
const BREAK = { at: 0.2, land: 0.75, art: 5 };
const unease = (u) => (u < 0.5 ? Math.cbrt(u / 4) : 1 - Math.cbrt(2 * (1 - u)) / 2); // shared.easeInOut⁻¹

const INK_GREY = "#d8d9dd"; // the page's text grey, for its glyphs

// A glyph's pixels with its outline: [column, row, ink?], worked out once
const glyphCache = {};
const glyphPixels = (name) => {
  if (glyphCache[name]) return glyphCache[name];
  const rows = GLYPHS[name];
  const inkAt = (i, j) => j >= 0 && j < rows.length && i >= 0 && i < rows[0].length && rows[j][i] === "x";
  const out = [];
  for (let j = -1; j <= rows.length; j++) {
    for (let i = -1; i <= rows[0].length; i++) {
      if (inkAt(i, j)) out.push([i, j, true]);
      else if ([-1, 0, 1].some((dj) => [-1, 0, 1].some((di) => inkAt(i + di, j + dj)))) out.push([i, j, false]);
    }
  }
  glyphCache[name] = out;
  return out;
};

const SECTOR = Math.PI / 8; // a facing's share of a turn
const facingOf = (angle) => ((Math.round(angle / SECTOR) % 16) + 16) % 16;
const sign = (v, dead) => (v > dead ? 1 : v < -dead ? -1 : 0);

// The art grid in device pixels: how big an art pixel is, and where the
// anchor (the pose) falls, snapped to the grid as it lies on the page, so
// the sprite moves in whole art pixels wherever its canvas is
const gridFor = (ctx, s) => {
  const m = ctx.getTransform();
  const scale = m.a;
  const P = Math.max(1, Math.round(ART_PX * scale));
  const ax = Math.round(m.e + Math.round((s.x * scale) / P) * P - s.x * scale);
  const ay = Math.round(m.f + Math.round((s.y * scale) / P) * P - s.y * scale);
  return { P, scale, ax, ay };
};

// From each facing, the nearest one that shows its face (both eyes)
const FACING_YOU = [2, 2, 2, 3, 4, 5, 6, 6, 6, 6, 6, 6, 4, 2, 2, 2];

// Which facing it shows: its heading while it drives; you, while it waits
// and your pointer is about; the goal while it searches. When it feels
// something (or dozes) it turns its face to you, as a sprite turns to the
// camera to emote. It turns one facing at a time, except when the layer
// spins it (dizzy), which shows at once.
const facingFor = (s, memo) => {
  let target = s.heading;
  const pointerFar = s.pointer && Math.hypot(s.pointer.x - s.x, s.pointer.y - s.y) > NEAR_POINTER_PX;
  if (s.activity === "search" || ((s.activity === "wait" || s.activity === "wake") && pointerFar)) target = s.gaze;
  else if (s.pointer && memo.facing !== undefined && s.activity !== "drive") target = memo.facing * SECTOR;
  const { happy, dizzy, startled, confused } = s.mood;
  if (happy > 0 || dizzy > 0 || startled > 0 || confused > 0 || s.sleep > 0) {
    target = FACING_YOU[facingOf(target)] * SECTOR;
  }
  target += angleTo(s.heading, s.theta); // the layer's spin or wiggle
  // Stay put until it is clearly past the edge of the current facing
  let want = facingOf(target);
  if (memo.facing !== undefined && Math.abs(angleTo(memo.facing * SECTOR, target)) < SECTOR / 2 + TURN_SLACK) {
    want = memo.facing;
  }
  memo.wantFacing = want;
  const immediate = memo.facing === undefined || s.reduced || s.unfold < 1 || dizzy > 0;
  if (immediate) {
    memo.facing = want;
    memo.turnedAt = s.t;
  } else if (want !== memo.facing && s.t - memo.turnedAt >= TURN_STEP_MS) {
    const step = (want - memo.facing + 16) % 16 <= 8 ? 1 : -1;
    memo.facing = (memo.facing + step + 16) % 16;
    memo.turnedAt = s.t;
  }
  return memo.facing;
};

// Its eyes' expression, the strongest feeling first (woken, it is startled
// before it is awake)
const expressionFor = (s) => {
  if (s.mood.startled > 0.25) return "wide";
  if (s.sleep > 0.6) return "asleep";
  if (s.mood.dizzy > 0.25) return "dizzy";
  if (s.mood.confused > 0.25) return "confused";
  if (s.mood.happy > 0.25) return "happy";
  if (s.open < 0.3) return "shut";
  if (s.open < 0.75) return "half";
  return "open";
};

// Where its eyes look, in art px within the visor: the way the gaze leans
// from where it faces
const eyeShift = (s, facing, memo) => {
  if (s.reduced || s.sleep > 0.6) return { x: 0, y: 0 };
  const near = s.pointer && Math.hypot(s.pointer.x - s.x, s.pointer.y - s.y) <= NEAR_POINTER_PX;
  if (near && memo.look) return memo.look; // a pointer on top of it: hold
  const f = facing * SECTOR;
  const look = {
    x: sign(Math.cos(s.gaze) - Math.cos(f), 0.3),
    y: sign(Math.sin(s.gaze) - Math.sin(f), 0.45),
  };
  memo.look = look;
  return look;
};

// The tread's frame and the bob, from the ground it has covered
const gait = (s, memo) => {
  if (s.reduced || s.carried || s.hop > 0) return { tread: memo.tread || 0, bob: 0 };
  const rate = Math.min(TREAD_MAX_HZ, s.speed / TREAD_PX); // frames per second
  memo.phase = ((memo.phase || 0) + (rate * s.dt) / 1000) % 2;
  memo.tread = Math.floor(memo.phase);
  return { tread: memo.tread, bob: s.speed > 4 ? memo.tread : 0 };
};

// Draw a composed sprite (art px colour letters) with its top left at
// device px (x0, y0), one rect per run of a colour
const paint = (ctx, buf, x0, y0, P) => {
  let style = "";
  for (let y = 0; y < OUT_H; y++) {
    let x = 0;
    while (x < OUT_W) {
      const c = buf[y * OUT_W + x];
      let end = x + 1;
      while (end < OUT_W && buf[y * OUT_W + end] === c) end++;
      if (c) {
        if (c !== style) {
          ctx.fillStyle = COLORS[c];
          style = c;
        }
        ctx.fillRect(x0 + x * P, y0 + y * P, (end - x) * P, P);
      }
      x = end;
    }
  }
};

// Camouflaged as the bullet: the ball, centred on the pose, its eyes in the
// slit (shut as it blinks), glancing your way
const drawCamo = (ctx, s, grid) => {
  const { P } = grid;
  const x0 = grid.ax - (CAMO[0].length / 2) * P;
  const y0 = grid.ay - (CAMO.length / 2) * P;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = s.alpha;
  CAMO.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x] === "v" ? "d" : row[x];
      if (c === ".") continue;
      ctx.fillStyle = COLORS[c];
      ctx.fillRect(x0 + x * P, y0 + y * P, P, P);
    }
  });
  if (s.open >= 0.5) {
    const glance = s.reduced ? 0 : sign(Math.cos(s.gaze), 0.3);
    ctx.fillStyle = COLORS.e;
    for (const [ex, ey] of CAMO_EYES) ctx.fillRect(x0 + (ex + glance) * P, y0 + ey * P, P, P);
  }
  ctx.restore();
};

const look = {
  id: "pixel",
  name: "Pixel",
  radius: 9.5,
  reach: 11,
  extent: 21,
  icon: { heading: Math.PI / 2 }, // facing you

  draw(ctx, s, memo) {
    const grid = gridFor(ctx, s);
    const time = unease(clamp01(s.unfold));
    if (time < BREAK.at) {
      drawCamo(ctx, s, grid);
      memo.facing = undefined;
      return;
    }
    const popped = clamp01((time - BREAK.at) / (BREAK.land - BREAK.at));
    const pop = popped < 1 ? Math.round(BREAK.art * Math.sin(Math.PI * popped)) : 0;
    const { P } = grid;
    const facing = facingFor(s, memo);
    const eyes = expressionFor(s);
    const shift = eyeShift(s, facing, memo);
    const { tread, bob } = gait(s, memo);
    const rise = Math.max(pop, Math.round(Math.max(s.lift * LIFT_ART, s.hop / ART_PX)));
    const searching = s.activity === "search" && !s.reduced;
    const glint = searching ? Math.floor(s.t / GLINT_MS) % LIDAR_GLINT.length : -1;
    // Asleep, it settles a pixel onto its wheels
    const settle = s.sleep > 0.6 ? -1 : 0;
    // Happy, it shakes a pixel side to side with the layer's wiggle
    const shake = s.mood.happy > 0 ? sign(angleTo(s.heading, s.theta), SHAKE_RAD) : 0;
    const dangle = s.lift > 0.5 || s.hop > HOP_PEAK / 3 || pop > 1 ? 1 : 0;

    memo.buf = memo.buf || new Array(OUT_W * OUT_H);
    const key = `${facing}${tread}${bob + settle}${dangle}${eyes}${shift.x}${shift.y}${glint}`;
    if (key !== memo.key) {
      compose(memo.buf, {
        facing,
        tread,
        bob: bob + settle,
        dangle,
        eyes,
        look: shift,
        lidar: glint,
      });
      memo.key = key;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = s.alpha;
    const x0 = grid.ax - ANCHOR.x * P + shake * P;
    const y0 = grid.ay - (ANCHOR.y + PAD_TOP) * P - rise * P;
    // Its shadow on the ground, which stays there as it is lifted
    const rows = rise > 0 ? SHADOW.lifted : SHADOW.rest;
    const half = rows[1][1] / 2;
    ctx.fillStyle = SHADOW_FILL;
    rows.forEach(([from, width], row) => {
      ctx.fillRect(grid.ax + (from - half) * P, grid.ay + (SHADOW.row + row) * P, width * P, P);
    });
    paint(ctx, memo.buf, x0, y0, P);
    ctx.restore();
  },

  busy(s, memo) {
    if (s.reduced) return false;
    return s.activity === "search" || memo.wantFacing !== memo.facing;
  },

  // Its "!", "?" and "z" sit just above its drum (and above it when lifted)
  bubbleAt(s) {
    return (ANCHOR.y + 2 + s.lift * LIFT_ART) * ART_PX + s.hop;
  },

  // The bubbles in its own pixel font, on its grid, faded in palette steps
  drawBubble(ctx, glyph, { x, y, size, alpha }, s) {
    // A "z" steps down a size as it rises (RobotLayer shrinks it 16 → 7)
    const name = glyph !== "z" ? glyph : size > 13 ? "zBig" : size > 10 ? "z" : "zSmall";
    const rows = GLYPHS[name];
    if (!rows || alpha <= 0.05) return;
    const grid = gridFor(ctx, s);
    const { P } = grid;
    const w = rows[0].length;
    const h = rows.length;
    // (x, y) is the glyph's foot, centred
    const gx = grid.ax + Math.round((x * grid.scale) / P - w / 2) * P;
    const gy = grid.ay + Math.round((y * grid.scale) / P - h) * P;
    const level = Math.ceil(Math.min(1, alpha) * 3) / 3; // 1/3, 2/3, 1
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = level * s.alpha;
    // Each pixel once (overlaps would darken at partial alpha): ink, and
    // the outline one art px around it
    let style = "";
    for (const [i, j, ink] of glyphPixels(name)) {
      const fill = ink ? INK_GREY : COLORS.o;
      if (fill !== style) {
        ctx.fillStyle = fill;
        style = fill;
      }
      ctx.fillRect(gx + i * P, gy + j * P, P, P);
    }
    ctx.restore();
  },
};

export default look;
