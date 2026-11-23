import { AMBER, angleTo, BULLET_RADIUS, clamp01, CREAM, easeInOut, easeOut, GREY, HOP_PEAK, INK, lerp } from "./shared";

// A six-legged walking robot seen from above: an amber shell with a servo at
// each hip, a small dark sensor head on its front with two eyes, and six
// two-segment legs (femur, tibia) with servo knees. Its signature is its
// gait. Each foot is planted in the world while it bears weight and never
// slides: it keeps its page position (in `memo`) while the body moves over
// it, and its knee rises and falls to suit. Once a foot has fallen about
// half a stride behind the spot it would rest at, its tripod (front and back
// on one side, the middle on the other) lifts and sets down a little ahead
// along the motion, three legs at a time, the other three bearing the
// weight. Turning on the spot steps the same way. When it stops, its legs
// step back to rest.
//   waits:    still, legs at rest; watches you with its head; rarely, one
//             leg shifts its weight;
//   searches: its front legs tap, one and then the other, slowly;
//   happy:    a little hop: every leg lifts at once and sets down;
//   dizzy:    legs splayed, scrambling to keep up with the spin;
//   carried:  lifted, legs dangling close under it, paddling slowly;
//   confused: its head tilts one way and the other;
//   asleep:   legs folded under it, body lowered, eyes shut;
//   on load:  camouflaged as the tagline's bullet: its shell drawn in to the
//             bullet's disc, its legs folded out of sight under it; only its
//             head, where the bullet's mark would be, gives it away (it
//             watches you, and blinks). Breaking cover, its shell grows and
//             its legs unfold from under it.

// The body, px (x forward, y to its right)
const BODY = { a: 8.4, b: 6.0 }; // semi-axes of the shell
const SHELL_N = 2.6; // how square its oval is (2: an ellipse)
const OVAL_POINTS = 40;
const RIM = 1.5; // px: the top plate's edge, inside the shell's
// The head: a sensor turret on the front of the shell, turning on its pivot
const HEAD = { pivot: 4.1, back: 1.7, front: 2.1, half: 2.55, radius: 1.0 };
const EYE = { x: 1.2, y: 1.2, r: 0.7 };
const SERVO = { half: 1.0, radius: 0.45 }; // the hip servos on the shell's edge
const HEAD_TURN = 0.5; // rad, at most, either way
// Legs: where each hip is (on the shell's edge), where its foot rests, and
// its tripod. Left legs have y < 0.
const LEGS = [
  { hx: 4.4, hy: -5.1, fx: 8.4, fy: -9.3, group: 0 }, // left front
  { hx: 0, hy: -6.0, fx: 0.3, fy: -11.8, group: 1 }, // left middle
  { hx: -4.4, hy: -5.1, fx: -8.4, fy: -9.3, group: 0 }, // left back
  { hx: 4.4, hy: 5.1, fx: 8.4, fy: 9.3, group: 1 }, // right front
  { hx: 0, hy: 6.0, fx: 0.3, fy: 11.8, group: 0 }, // right middle
  { hx: -4.4, hy: 5.1, fx: -8.4, fy: 9.3, group: 1 }, // right back
];
const FEMUR = 3.8; // px
const TIBIA = 5.4;
const HIP_HEIGHT = 2.4; // px off the ground
const REACH = Math.sqrt((FEMUR + TIBIA) ** 2 - HIP_HEIGHT ** 2) - 0.3; // px from its hip: farther, a foot must step
const LEG_WIDTH = { femur: 1.9, tibia: 1.35, under: 1.4 }; // px; under: the dark stroke beyond each side
const KNEE_R = 1.15;
// The gait
const STRIDE = { slow: 4, fast: 5.6, at: 100 }; // px; fast from this speed (px/s) up
const STEP_MS = 120; // a step, unhurried
const MIN_STEP_MS = 45; // ... and as quick as it gets (faster, its feet are dragged a little)
const LEAD_S = 0.07; // a step lands this far ahead of where the foot rests (s of motion, at most half a stride)
const LIFT_PULL = 1.4; // px a lifted foot draws in toward its hip (seen from above)
const STEP_HEIGHT = 1.5; // px a stepping foot rises
const REST = { speed: 4, turn: 0.15, ms: 160 }; // px/s, rad/s: at rest after this long
const SETTLE_PX = 0.3; // a foot farther than this from rest steps there
const JUMP_PX = 50; // moved farther in one frame: it was carried or dropped
// A heading that jumps (a driver setting off in a new direction) is turned
// through instead, stepping: this quickly (rad/s), easing into place
const SNAP_RAD = 0.5;
const SNAP = { rate: 7, ms: 70 };
// Moods and states
const FIDGET_EVERY = [6000, 10000]; // ms
const FIDGET_MS = 320;
const TAP = { every: 1700, ms: 320, delay: 350, pull: 2.4 }; // searching: front legs tap in turn
const HOP_MS = 380; // happy
const HOP_SCALE = 0.05;
const DIZZY_SPLAY = 0.12; // the feet rest this much farther out
const CONFUSED_TILT = { rad: 0.38, ms: 1500 };
// Carried: feet this far out from the hips (px), swinging this far fore and
// aft (px), hanging this far below where the ground was (px)
const PADDLE = { out: 1.8, swing: 1.4, hang: 2.5, ms: 1500 };
const LIFT_SCALE = 0.06;
const SHADOW = { x: 2, y: 4.5, spread: 2.5, alpha: 0.5 }; // carried: px off, px wider than its shell
const TUCK = -1.3; // px out from its hip a folded foot rests (under the shell)
const SLEEP_SCALE = 0.05;
// Unfolding: its legs start this small, folded under the disc, and reach
// their size by this far through (0…1); they stand from this far through
const UNFOLD = { scale: 0.55, grow: 0.35, stand: 0.2 };

const FOOT_TO_HIP = LEGS.map((leg) => Math.hypot(leg.fx - leg.hx, leg.fy - leg.hy));
// Each leg's way out from its hip, at rest
const OUT = LEGS.map((leg, i) => ({ x: (leg.fx - leg.hx) / FOOT_TO_HIP[i], y: (leg.fy - leg.hy) / FOOT_TO_HIP[i] }));

// Where the knee is for a foot at (fx, fy), px in its frame, `up` px off the
// ground. Each leg swings in its own upright plane (its hip servo turns the
// plane toward the foot), so seen from above it is straight, its knee raised
// somewhere along it. A foot tucked in under the shell keeps the plane
// pointing out, so the knee folds up outside the shell. The legs keep their
// length (a foot is held within reach).
const solveLeg = (i, fx, fy, up, out) => {
  const leg = LEGS[i];
  const dx = fx - leg.hx;
  const dy = fy - leg.hy;
  const d = Math.hypot(dx, dy);
  // The plane: toward the foot, or straight out when the foot is tucked in
  // under the shell (on the hip's inner side)
  const outward = dy * Math.sign(leg.hy);
  const w = Math.max(clamp01((outward - 0.5) / 2), clamp01((d - 2.5) / 1.5));
  let px = OUT[i].x * (1 - w) + (d > 1e-3 ? (dx / d) * w : 0);
  let py = OUT[i].y * (1 - w) + (d > 1e-3 ? (dy / d) * w : 0);
  const norm = Math.hypot(px, py) || 1;
  px /= norm;
  py /= norm;
  const along = dx * px + dy * py;
  const drop = HIP_HEIGHT - up;
  const longest = FEMUR + TIBIA - 0.05;
  const reach = Math.min(along, Math.sqrt(Math.max(0, longest * longest - drop * drop)));
  const span = Math.max(Math.abs(FEMUR - TIBIA) + 0.2, Math.hypot(reach, drop));
  const cos = (FEMUR * FEMUR + span * span - TIBIA * TIBIA) / (2 * FEMUR * span);
  const angle = Math.atan2(-drop, reach) + Math.acos(Math.max(-1, Math.min(1, cos)));
  const knee = FEMUR * Math.cos(angle);
  out.kx = leg.hx + knee * px;
  out.ky = leg.hy + knee * py;
  out.fx = leg.hx + reach * px;
  out.fy = leg.hy + reach * py;
};

// The feet planted where the legs rest, page px
const seat = (memo, s, theta, splay) => {
  const c = Math.cos(theta);
  const sn = Math.sin(theta);
  memo.feet = LEGS.map((leg) => {
    const fx = leg.hx + (leg.fx - leg.hx) * splay;
    const fy = leg.hy + (leg.fy - leg.hy) * splay;
    return { x: s.x + fx * c - fy * sn, y: s.y + fx * sn + fy * c, swing: null, lift: 0 };
  });
};

// Advance the gait: steps land, and tripods that have fallen behind lift
const walk = (memo, s, theta, splay, calm) => {
  const t = s.t;
  const dt = Math.max(1, Math.min(50, t - memo.t));
  const c = Math.cos(theta);
  const sn = Math.sin(theta);
  // How it is moving: px/s, and rad/s from its own heading
  const omegaNow = (angleTo(memo.theta, theta) / dt) * 1000;
  memo.omega = lerp(memo.omega, omegaNow, 1 - Math.exp(-dt / 60));
  const speed = Math.hypot(s.vx, s.vy);
  const atRest = speed < REST.speed && Math.abs(memo.omega) < REST.turn;
  if (!atRest) memo.restSince = t;
  const settling = atRest && t - memo.restSince > REST.ms;

  // Where each foot would rest now, and how fast that spot moves (moving or
  // turning); its stride is longer the faster it goes
  let fastest = 0;
  for (let i = 0; i < 6; i++) {
    const rx = LEGS[i].fx * c - LEGS[i].fy * sn;
    const ry = LEGS[i].fx * sn + LEGS[i].fy * c;
    fastest = Math.max(fastest, Math.hypot(s.vx - memo.omega * ry, s.vy + memo.omega * rx));
  }
  const stride = lerp(STRIDE.slow, STRIDE.fast, clamp01(fastest / STRIDE.at));
  for (let i = 0; i < 6; i++) {
    const leg = LEGS[i];
    const lx = leg.hx + (leg.fx - leg.hx) * splay;
    const ly = leg.hy + (leg.fy - leg.hy) * splay;
    const rx = lx * c - ly * sn;
    const ry = lx * sn + ly * c;
    const foot = memo.feet[i];
    foot.nx = s.x + rx;
    foot.ny = s.y + ry;
    foot.vx = s.vx - memo.omega * ry;
    foot.vy = s.vy + memo.omega * rx;
    const v = Math.hypot(foot.vx, foot.vy);
    // A step lands ahead of the rest spot, along its motion
    const lead = settling ? 0 : Math.min(stride / 2, v * LEAD_S);
    foot.tx = foot.nx + (v > 1e-3 ? (foot.vx / v) * lead : 0);
    foot.ty = foot.ny + (v > 1e-3 ? (foot.vy / v) * lead : 0);
  }

  // Steps in the air: carried along toward where they land
  for (const foot of memo.feet) {
    const { swing } = foot;
    if (!swing) continue;
    const p = clamp01((t - swing.start) / swing.ms);
    if (p >= 1) {
      foot.x = foot.tx;
      foot.y = foot.ty;
      foot.swing = null;
      foot.lift = 0;
    } else {
      const k = easeInOut(p);
      foot.x = lerp(swing.x, foot.tx, k);
      foot.y = lerp(swing.y, foot.ty, k);
      foot.lift = Math.sin(Math.PI * p);
    }
  }

  // A planted foot the body has run away from (faster than it can step,
  // or spun) is dragged along at the end of its reach
  for (let i = 0; i < 6; i++) {
    const foot = memo.feet[i];
    if (foot.swing) continue;
    const hx = s.x + LEGS[i].hx * c - LEGS[i].hy * sn;
    const hy = s.y + LEGS[i].hx * sn + LEGS[i].hy * c;
    const d = Math.hypot(foot.x - hx, foot.y - hy);
    if (d > REACH) {
      foot.x = hx + ((foot.x - hx) / d) * REACH;
      foot.y = hy + ((foot.y - hy) / d) * REACH;
    }
  }

  // Which tripod should step: one that has fallen a stride behind where it
  // would land (or, at rest, one that is not yet at rest), once the other
  // is down. Steps are quicker the faster it goes.
  const ms = clamp01((0.8 * stride) / Math.max(1, fastest) / (STEP_MS / 1000)) * STEP_MS;
  const stepMs = Math.max(MIN_STEP_MS, ms);
  for (let n = 0; n < 2; n++) {
    const group = (memo.lastGroup + 1 + n) % 2;
    let drift = 0;
    let airborne = false;
    for (let i = 0; i < 6; i++) {
      const foot = memo.feet[i];
      if (foot.swing) airborne = true;
      if (LEGS[i].group === group) drift = Math.max(drift, Math.hypot(foot.x - foot.tx, foot.y - foot.ty));
    }
    if (airborne) break;
    const due = settling ? drift > SETTLE_PX : !calm && drift > stride;
    if (!due) continue;
    for (let i = 0; i < 6; i++) {
      if (LEGS[i].group !== group) continue;
      const foot = memo.feet[i];
      foot.swing = { x: foot.x, y: foot.y, start: t, ms: settling ? STEP_MS : stepMs };
    }
    memo.lastGroup = group;
    break;
  }
};

// An oval a little squarer than an ellipse (a superellipse, |x/a|^n +
// |y/b|^n = 1): a machined plate rather than a beetle's back. n = 2 is the
// bullet's disc.
const oval = (ctx, a, b, n) => {
  ctx.beginPath();
  for (let i = 0; i < OVAL_POINTS; i++) {
    const angle = (i / OVAL_POINTS) * 2 * Math.PI;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    const x = a * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = b * Math.sign(sn) * Math.abs(sn) ** (2 / n);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
};

// The shell: the oval, its dark edge first
const shell = (ctx, a, b, n, alpha) => {
  oval(ctx, a, b, n);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = INK(0.92 * alpha);
  ctx.stroke();
  // Over the page's own colour first, so the legs folded beneath it don't
  // show through: the same amber as the bullet's
  ctx.fillStyle = INK(alpha);
  ctx.fill();
  ctx.fillStyle = AMBER(0.95 * alpha);
  ctx.fill();
};

const look = {
  id: "hexapod",
  name: "Hexapod",
  radius: 9,
  reach: 11,
  extent: 21,
  bubbleAt: (s) => 17 + 3 * s.lift,

  busy(s, memo) {
    if (!memo.feet || s.reduced) return false;
    if (memo.feet.some((foot) => foot.swing)) return true;
    if (memo.unsettled) return true;
    // a fidget once it is due (it waits for a frame: the next blink)
    if (memo.fidget && memo.fidget.leg >= 0) return true;
    return s.activity === "search";
  },

  draw(ctx, s, memo) {
    const u = s.unfold;
    const t = s.t;
    const alpha = s.alpha;
    // Held up, or in a hop: its legs hang
    const lift = Math.max(easeOut(clamp01(s.lift)), clamp01(s.hop / HOP_PEAK));
    const sleep = s.reduced ? 0 : clamp01(s.sleep);
    const mood = s.mood;

    // A heading that jumps is turned through quickly instead
    if (memo.heading === undefined) {
      memo.heading = s.heading;
      memo.offset = 0;
    }
    const jump = angleTo(memo.heading, s.heading);
    memo.heading = s.heading;
    if (Math.abs(jump) > SNAP_RAD && !s.reduced) memo.offset = angleTo(0, memo.offset - jump);
    const dt = memo.t === undefined ? 16 : Math.max(1, Math.min(50, t - memo.t));
    if (memo.offset) {
      const step = Math.min((SNAP.rate * dt) / 1000, Math.abs(memo.offset) * (1 - Math.exp(-dt / SNAP.ms)));
      memo.offset = Math.abs(memo.offset) <= 0.002 ? 0 : memo.offset - Math.sign(memo.offset) * step;
    }
    const theta = s.theta + memo.offset;

    // Its feet: planted, stepping, or re-seated after a jump or a carry
    const splay = 1 + DIZZY_SPLAY * mood.dizzy;
    const jumped = memo.feet && Math.hypot(s.x - memo.x, s.y - memo.y) > JUMP_PX;
    if (!memo.feet || jumped || lift > 0 || s.reduced) {
      seat(memo, s, theta, splay);
      memo.t = t;
      memo.theta = theta;
      memo.omega = 0;
      memo.restSince = t;
      memo.lastGroup = 1;
    }
    // While happy the body twists on its planted feet rather than stepping
    walk(memo, s, theta, splay, mood.happy > 0);
    memo.t = t;
    memo.theta = theta;
    memo.x = s.x;
    memo.y = s.y;
    memo.unsettled = memo.feet.some((foot) => Math.hypot(foot.x - foot.nx, foot.y - foot.ny) > SETTLE_PX);

    // Moments of its own: a hop (happy), taps (searching), a fidget (waiting)
    if (mood.happy > 0 && !memo.happy && !s.hopping) memo.hopAt = t;
    memo.happy = mood.happy > 0;
    const hopP = memo.hopAt === undefined ? 1 : clamp01((t - memo.hopAt) / HOP_MS);
    const hop = Math.sin(Math.PI * hopP);
    if (s.activity === "search" && memo.activity !== "search") memo.searchAt = t;
    memo.activity = s.activity;
    const waiting = s.activity === "wait" && !s.carried && sleep === 0 && !s.reduced;
    if (!waiting || memo.unsettled) memo.fidget = null;
    else if (!memo.fidget) memo.fidget = { leg: -1, start: t + lerp(FIDGET_EVERY[0], FIDGET_EVERY[1], Math.random()) };
    else if (memo.fidget.leg < 0 && t >= memo.fidget.start) {
      // Due: not in the middle of a blink, though
      memo.fidget.leg = Math.floor(Math.random() * 6);
      memo.fidget.start = s.open < 1 ? t + 450 : t;
    } else if (memo.fidget.leg >= 0 && t > memo.fidget.start + FIDGET_MS) memo.fidget = null;

    // ---- drawing ----
    const scale = 1 + LIFT_SCALE * lift - SLEEP_SCALE * sleep + HOP_SCALE * hop * mood.happy;
    // Lifted: its shadow, left on the ground
    if (lift > 0) {
      ctx.save();
      ctx.translate(SHADOW.x * lift, SHADOW.y * lift);
      ctx.rotate(theta);
      oval(ctx, BODY.a + SHADOW.spread, BODY.b + SHADOW.spread, SHELL_N);
      ctx.fillStyle = `rgba(0, 0, 0, ${SHADOW.alpha * lift * alpha})`;
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.scale(scale, scale);
    ctx.rotate(theta);
    const c = Math.cos(theta);
    const sn = Math.sin(theta);

    // Each leg's hip, knee and foot in its own frame
    const legOut = memo.legOut || (memo.legOut = LEGS.map(() => ({ kx: 0, ky: 0, fx: 0, fy: 0, lift: 0 })));
    // Unfolding: the legs first grow out folded from under the disc, then
    // unfold to stand
    const unfold = easeInOut(clamp01((u - UNFOLD.stand) / (1 - UNFOLD.stand)));
    const legScale = lerp(UNFOLD.scale, 1, easeOut(clamp01(u / UNFOLD.grow)));
    const searching = s.activity === "search" && memo.searchAt !== undefined;
    const tapP = searching ? (t - memo.searchAt - TAP.delay) / TAP.every : -1;
    for (let i = 0; i < 6; i++) {
      const leg = LEGS[i];
      const foot = memo.feet[i];
      // Planted (or stepping), in its frame
      let fx = (foot.x - s.x) * c + (foot.y - s.y) * sn;
      let fy = -(foot.x - s.x) * sn + (foot.y - s.y) * c;
      let up = foot.lift;
      let raise = LIFT_PULL;
      // Searching: the front legs tap in turn, raised high
      if (tapP >= 0 && i % 3 === 0) {
        const phase = (tapP + (i === 3 ? 0.5 : 0)) % 1;
        const k = (phase * TAP.every) / TAP.ms;
        if (k < 1) {
          up = Math.max(up, Math.sin(Math.PI * k));
          raise = TAP.pull;
        }
      }
      if (memo.fidget && memo.fidget.leg === i) {
        const k = clamp01((t - memo.fidget.start) / FIDGET_MS);
        up = Math.max(up, Math.sin(Math.PI * k));
      }
      if (hopP < 1) up = Math.max(up, hop * mood.happy);
      // A lifted foot draws in toward its hip
      const toHip = Math.hypot(fx - leg.hx, fy - leg.hy) || 1;
      const pull = (Math.min(raise, toHip * 0.45) * up) / toHip;
      fx -= (fx - leg.hx) * pull;
      fy -= (fy - leg.hy) * pull;
      let height = STEP_HEIGHT * up;
      // Asleep: folded, its feet tucked in under the shell
      const tuckX = leg.hx + OUT[i].x * TUCK;
      const tuckY = leg.hy + OUT[i].y * TUCK;
      if (sleep > 0) {
        fx = lerp(fx, tuckX, sleep);
        fy = lerp(fy, tuckY, sleep);
      }
      // Carried: legs hanging close under it, paddling slowly
      if (lift > 0) {
        const paddle = Math.sin((2 * Math.PI * t) / PADDLE.ms + (leg.group ? Math.PI : 0) + i * 0.4) * PADDLE.swing;
        fx = lerp(fx, leg.hx + OUT[i].x * PADDLE.out + paddle, lift);
        fy = lerp(fy, leg.hy + OUT[i].y * PADDLE.out, lift);
        height = lerp(height, -PADDLE.hang, lift);
        up *= 1 - lift;
      }
      // Unfolding: from folded under the disc
      if (unfold < 1) {
        fx = lerp(tuckX, fx, unfold);
        fy = lerp(tuckY, fy, unfold);
      }
      solveLeg(i, fx, fy, height, legOut[i]);
      legOut[i].lift = up;
    }

    // Legs: their dark under-strokes, then the segments, then the joints
    ctx.save();
    ctx.scale(legScale, legScale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const leg = LEGS[i];
      const o = legOut[i];
      ctx.moveTo(leg.hx, leg.hy);
      ctx.lineTo(o.kx, o.ky);
      ctx.lineTo(o.fx, o.fy);
    }
    ctx.lineWidth = LEG_WIDTH.femur + 2 * LEG_WIDTH.under;
    ctx.strokeStyle = INK(0.92 * alpha);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const leg = LEGS[i];
      ctx.moveTo(leg.hx, leg.hy);
      ctx.lineTo(legOut[i].kx, legOut[i].ky);
    }
    ctx.lineWidth = LEG_WIDTH.femur;
    ctx.strokeStyle = GREY(0.55 * alpha);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const o = legOut[i];
      ctx.beginPath();
      ctx.moveTo(o.kx, o.ky);
      ctx.lineTo(o.fx, o.fy);
      ctx.lineWidth = LEG_WIDTH.tibia;
      ctx.strokeStyle = GREY((0.55 + 0.25 * o.lift) * alpha);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const o = legOut[i];
      ctx.beginPath();
      ctx.arc(o.kx, o.ky, KNEE_R, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(44, 44, 48, ${alpha})`;
      ctx.fill();
    }
    ctx.restore();

    // The shell, grown from the bullet's disc, its top plate inset
    const grow = easeOut(clamp01(u / 0.6));
    const a = lerp(BULLET_RADIUS, BODY.a, grow);
    const b = lerp(BULLET_RADIUS, BODY.b, grow);
    const n = lerp(2, SHELL_N, grow);
    shell(ctx, a, b, n, alpha);
    oval(ctx, a - RIM, b - RIM, n);
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = INK(0.3 * alpha * grow);
    ctx.stroke();
    // The hip servos on its edge, each turned along its leg
    const servo = clamp01((u - 0.5) / 0.4) * alpha;
    if (servo > 0) {
      for (let i = 0; i < 6; i++) {
        const leg = LEGS[i];
        const o = legOut[i];
        ctx.save();
        ctx.scale(legScale, legScale);
        ctx.translate(leg.hx, leg.hy);
        ctx.rotate(Math.atan2(o.ky - leg.hy, o.kx - leg.hx));
        ctx.beginPath();
        ctx.roundRect(-SERVO.half, -SERVO.half, 2 * SERVO.half, 2 * SERVO.half, SERVO.radius);
        ctx.fillStyle = `rgba(38, 38, 42, ${servo})`;
        ctx.fill();
        ctx.restore();
      }
    }

    // The head: toward what it watches; side to side when confused
    let yaw = s.reduced ? 0 : Math.max(-HEAD_TURN, Math.min(HEAD_TURN, angleTo(theta, s.gaze)));
    yaw *= 1 - 0.3 * lift;
    if (mood.confused > 0) {
      if (memo.confusedAt === undefined) memo.confusedAt = t;
      const wobble = Math.sin((2 * Math.PI * (t - memo.confusedAt)) / CONFUSED_TILT.ms) * CONFUSED_TILT.rad;
      yaw = lerp(yaw, wobble, mood.confused);
    } else memo.confusedAt = undefined;
    yaw *= 1 - sleep;
    {
      ctx.save();
      ctx.translate(HEAD.pivot, 0);
      ctx.rotate(yaw);
      ctx.beginPath();
      ctx.roundRect(-HEAD.back, -HEAD.half, HEAD.back + HEAD.front, 2 * HEAD.half, HEAD.radius);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = INK(0.95 * alpha);
      ctx.stroke();
      ctx.fillStyle = `rgba(30, 30, 33, ${alpha})`;
      ctx.fill();
      // Eyes, on its front: they close front to back
      const open = clamp01(s.open);
      const eyeAlpha = alpha;
      const depth = Math.max(0.42, 2 * EYE.r * open);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.roundRect(EYE.x - depth / 2, side * EYE.y - EYE.r, depth, 2 * EYE.r, depth / 2);
        ctx.fillStyle = CREAM((0.55 + 0.4 * open) * eyeAlpha);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  },
};

export default look;
