import { AMBER, angleTo, clamp01, CREAM, easeOut, HOP_PEAK, INK, lerp } from "./shared";

// A modular snake robot (a research platform: a chain of identical joint
// modules), seen from above: amber modules with dark joints between them,
// and a slightly larger head module with a dark sensor face and two eyes.
// Its signature: its body lies along the path its head actually travelled.
// It keeps a trail of where its head has been (in `memo`, page px, every
// TRAIL_STEP px) and places each module a fixed distance back along it, so
// the body follows the route around every bend. With no trail yet, the body
// lies straight behind it. The head may turn on its neck so far; turning
// further on the spot swings the body around behind it.
//   drives:   a lateral undulation, as such robots crawl: a wave fixed on
//             the ground, so it runs down the body as the head moves on,
//             deeper the faster it goes;
//   waits:    still; its head turns on its neck to watch you;
//   searches: its head sways, scanning;
//   happy:    a ripple runs down its body;
//   dizzy:    its head loops on its neck, its body wobbling;
//   carried:  it dangles from its head, its body hanging down the screen and
//             swinging a little;
//   hop:      all of it at once, as it lies (it doesn't turn in the air);
//   confused: its head tilts;
//   asleep:   it coils up, its tail tucked in by its head, eyes shut.

// Its parts, px (x forward)
const HEAD = { back: 3.3, front: 3.8, half: 3.0, radius: 1.6 };
const FACE = { depth: 2.0, inset: 0.75, radius: 1.3 }; // the dark sensor face at its front
const EYE = { x: 2.55, y: 1.25, r: 0.72 };
const MODULES = 6;
const MODULE = { length: 4.3, half: 2.2, radius: 0.8 };
const NECK = 6.2; // px from the head's centre back to the first module's
const SPACING = 5.3; // px between modules' centres (the rest is a dark joint)
const BODY_LENGTH = NECK + (MODULES - 1) * SPACING;
const EDGE = 1.4; // px: the dark edge kept around it, over the tree lines
const SPINE = { width: 2.2, rgb: "46, 46, 50" }; // the joints, seen between modules
// The trail of where its head has been
const TRAIL_STEP = 1.5; // px between its points
const TRAIL_POINTS = Math.ceil((BODY_LENGTH + 2 * SPACING) / TRAIL_STEP);
const JUMP_PX = 50; // moved farther in one frame: it was carried or dropped
// Turning: the head turns on its neck this far beside the body (rad); turned
// further, the body swings around behind it. A heading that jumps (a driver
// setting off in a new direction) is turned through instead, quickly.
const NECK_TURN = 1.2;
const SNAP_RAD = 0.5;
const SNAP = { rate: 9, ms: 70 }; // rad/s, then easing into place
// Crawling: a wave fixed on the ground, this long (px), this deep at
// cruising speed and above (px, px/s), growing from nothing behind the head
const WAVE = { length: 36, depth: 2.0, at: 110, ms: 160 };
const WAVE_FROM = { start: 3, full: 12 }; // px back along the body
// Moods and states
const LOOK_TURN = 0.8; // rad its head turns to watch, at most
const SCAN = { rad: 0.4, ms: 2200 }; // searching: its head sways
const RIPPLE = { px: 2.4, ms: 380, lag: 0.16 }; // happy: a bump running down it, px deep
const LOOP_RADIUS = 3.9; // dizzy: px from its neck to its head's centre
const WOBBLE = { px: 1.8, ms: 420, lag: 1.1 };
const TILT = 0.42; // confused, rad
const HANG = { sway: 0.5, per: 260, stiffness: 70, damping: 4.5 }; // carried: rad, px/s per rad, 1/s², 1/s
const LIFT_SCALE = 0.06;
const SHADOW = { x: 2, y: 4.5, alpha: 0.5 }; // px, carried
// Asleep: coiled, its head on a spiral this far from the middle (px),
// tightening this much (px per rad) toward its tail
const COIL = { radius: 7.4, tighten: 0.5 };
const SLEEP_SCALE = 0.03;
// Unfolding: the disc becomes its head by this far through (0…1); its body
// slides out from this far through to the end

const wrap = (angle) => angleTo(0, angle);

// The trail: a ring of points, newest first, TRAIL_STEP apart
const newTrail = () => ({ xs: new Float64Array(TRAIL_POINTS), ys: new Float64Array(TRAIL_POINTS), first: 0, count: 0 });
const pointOf = (trail, k) => (trail.first + k) % TRAIL_POINTS;
const record = (trail, x, y) => {
  trail.first = (trail.first - 1 + TRAIL_POINTS) % TRAIL_POINTS;
  trail.xs[trail.first] = x;
  trail.ys[trail.first] = y;
  trail.count = Math.min(TRAIL_POINTS, trail.count + 1);
};
// A body laid straight behind (x, y), facing `heading`
const seed = (trail, x, y, heading) => {
  trail.count = 0;
  for (let k = TRAIL_POINTS; k >= 1; k--) {
    record(trail, x - Math.cos(heading) * k * TRAIL_STEP, y - Math.sin(heading) * k * TRAIL_STEP);
  }
};
// Where the body is `arc` px back from the head at (hx, hy): out.x, out.y
const along = (trail, hx, hy, arc, out) => {
  const p0 = pointOf(trail, 0);
  const first = Math.hypot(trail.xs[p0] - hx, trail.ys[p0] - hy);
  if (arc <= first) {
    const k = first > 1e-6 ? arc / first : 0;
    out.x = lerp(hx, trail.xs[p0], k);
    out.y = lerp(hy, trail.ys[p0], k);
    return;
  }
  const steps = (arc - first) / TRAIL_STEP;
  let i = Math.floor(steps);
  let frac = steps - i;
  // Beyond the oldest point: straight on
  if (i >= trail.count - 1) {
    frac += i - (trail.count - 2);
    i = trail.count - 2;
  }
  const a = pointOf(trail, i);
  const b = pointOf(trail, i + 1);
  out.x = lerp(trail.xs[a], trail.xs[b], frac);
  out.y = lerp(trail.ys[a], trail.ys[b], frac);
};
const rotateTrail = (trail, cx, cy, angle) => {
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  for (let k = 0; k < trail.count; k++) {
    const p = pointOf(trail, k);
    const dx = trail.xs[p] - cx;
    const dy = trail.ys[p] - cy;
    trail.xs[p] = cx + dx * c - dy * sn;
    trail.ys[p] = cy + dx * sn + dy * c;
  }
};

// The coil it sleeps in, as bends: its head on the outside of a spiral that
// winds inward, so the tail ends tucked in beside its neck
const COIL_BENDS = (() => {
  // Walk the spiral r = radius - tighten·φ (around its left side) from the
  // head, marking each module's centre by arc length
  const xs = [];
  const ys = [];
  const marks = [0];
  for (let i = 1; i <= MODULES; i++) marks.push(NECK + (i - 1) * SPACING);
  let phi = 0;
  let walked = 0;
  let next = 0;
  const at = (a) => COIL.radius - COIL.tighten * a;
  while (next < marks.length) {
    if (walked >= marks[next]) {
      xs.push(at(phi) * Math.sin(phi));
      ys.push(-at(phi) * Math.cos(phi));
      next += 1;
      continue;
    }
    const da = 0.004;
    walked += at(phi) * da;
    phi += da;
  }
  // The head faces back along the spiral, away from its body (+x at φ = 0)
  const bends = [];
  let previous = 0;
  for (let i = 1; i <= MODULES; i++) {
    const beta = Math.atan2(ys[i - 1] - ys[i], xs[i - 1] - xs[i]);
    bends.push(angleTo(previous, beta));
    previous = beta;
  }
  return bends;
})();

// A rounded module, its dark edge drawn separately
const moduleAt = (ctx, x, y, angle, tail) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  const { length, half, radius } = MODULE;
  ctx.roundRect(-length / 2, -half, length, 2 * half, tail ? [half * 0.9, radius, radius, half * 0.9] : radius);
  ctx.restore();
};

const look = {
  id: "snake",
  name: "Snake",
  radius: 8,
  reach: 8,
  extent: 46,
  hopTurn: false,
  // On the diagonal, smaller, its head up and right: all of it in the picture
  icon: { heading: -Math.PI / 4, scale: 0.72, x: 8, y: -8 },
  // Above its head, and above its coil when it sleeps
  bubbleAt: (s) => 14 + 10 * s.sleep + 3 * Math.max(s.lift, clamp01(s.hop / HOP_PEAK)),

  busy(s, memo) {
    if (s.reduced || !memo.trail) return false;
    return memo.wave > 0.01 || memo.swinging || Math.abs(memo.offset || 0) > 0 || s.activity === "search";
  },

  draw(ctx, s, memo) {
    const t = s.t;
    const alpha = s.alpha;
    const lift = easeOut(clamp01(s.lift));
    // In a hop: off the ground (its shadow, nearer), its body following
    // its head through the air rather than hanging
    const air = clamp01(s.hop / HOP_PEAK);
    const raised = Math.max(lift, air);
    const sleep = s.reduced ? 0 : clamp01(s.sleep);
    const mood = s.mood;
    const dt = memo.t === undefined ? 16 : Math.max(1, Math.min(50, t - memo.t));
    memo.t = t;

    // The heading its body goes by: without the moods' turns (the layer's
    // happy wiggle and dizzy spin move its head, not its body)
    const moodTurn = mood.happy > 0 || mood.dizzy > 0 ? angleTo(s.heading, s.theta) : 0;
    let heading = s.theta - moodTurn;

    // Its trail: started straight behind it, re-laid after a carry or a jump
    const jumped = memo.trail && Math.hypot(s.x - memo.x, s.y - memo.y) > JUMP_PX;
    if (!memo.trail) memo.trail = newTrail();
    if (memo.trail.count === 0 || jumped || s.lift > 0 || s.reduced) {
      seed(memo.trail, s.x, s.y, heading);
      memo.heading = s.heading;
      memo.offset = 0;
      memo.odometer = 0;
      memo.wave = 0;
    }
    const trail = memo.trail;
    // A heading that jumps: the whole of it turns there, quickly, about its head
    const jump = angleTo(memo.heading, s.heading);
    memo.heading = s.heading;
    if (Math.abs(jump) > SNAP_RAD) {
      rotateTrail(trail, s.x, s.y, jump);
      memo.offset = wrap(memo.offset - jump);
    }
    if (memo.offset) {
      const step = Math.min((SNAP.rate * dt) / 1000, Math.abs(memo.offset) * (1 - Math.exp(-dt / SNAP.ms)));
      memo.offset = Math.abs(memo.offset) <= 0.002 ? 0 : memo.offset - Math.sign(memo.offset) * step;
    }
    // In a hop it goes as one, through the air: all of it moves with its head
    if (s.hopping && memo.x !== undefined) {
      const dx = s.x - memo.x;
      const dy = s.y - memo.y;
      for (let k = 0; k < trail.count; k++) {
        const p = pointOf(trail, k);
        trail.xs[p] += dx;
        trail.ys[p] += dy;
      }
    }
    // Where its head goes, the trail follows
    const p0 = pointOf(trail, 0);
    let gap = Math.hypot(s.x - trail.xs[p0], s.y - trail.ys[p0]);
    const moved = memo.x === undefined || s.hopping ? 0 : Math.hypot(s.x - memo.x, s.y - memo.y);
    while (gap >= TRAIL_STEP) {
      const q = pointOf(trail, 0);
      const k = TRAIL_STEP / gap;
      record(trail, lerp(trail.xs[q], s.x, k), lerp(trail.ys[q], s.y, k));
      gap -= TRAIL_STEP;
    }
    memo.x = s.x;
    memo.y = s.y;
    memo.odometer += moved;
    // Turned beyond its neck: the body swings around behind it
    const point = memo.point || (memo.point = { x: 0, y: 0 });
    along(trail, s.x, s.y, SPACING, point);
    const neck = angleTo(Math.atan2(s.y - point.y, s.x - point.x), heading);
    memo.swinging = Math.abs(neck) > NECK_TURN;
    if (memo.swinging) rotateTrail(trail, s.x, s.y, neck - Math.sign(neck) * NECK_TURN);
    heading += memo.offset;

    // Crawling: how deep its wave is, from how fast its head moves
    const speed = (moved / dt) * 1000;
    const wanted = s.reduced ? 0 : WAVE.depth * clamp01(speed / WAVE.at);
    memo.wave = lerp(memo.wave, wanted, 1 - Math.exp(-dt / WAVE.ms));
    if (memo.wave < 0.01 && wanted === 0) memo.wave = 0;

    // ---- its chain: head at 0, modules 1…MODULES ----
    const n = MODULES;
    if (!memo.cx) {
      memo.cx = new Float64Array(n + 1);
      memo.cy = new Float64Array(n + 1);
      memo.bend = new Float64Array(n + 1);
      memo.link = new Float64Array(n + 1);
    }
    const { cx, cy, bend, link } = memo;
    // Moods move it sideways: a ripple running down it (happy), a wobble
    // (dizzy)
    if (mood.happy > 0 && !memo.happy) memo.happyAt = t;
    memo.happy = mood.happy > 0;
    const ripple = memo.happyAt === undefined ? Infinity : (t - memo.happyAt) / RIPPLE.ms;
    const rippling = ripple < 1 + n * RIPPLE.lag;
    // On the ground: along the trail, with its wave
    cx[0] = s.x;
    cy[0] = s.y;
    for (let i = 1; i <= n; i++) {
      const arc = NECK + (i - 1) * SPACING;
      along(trail, s.x, s.y, arc, point);
      let x = point.x;
      let y = point.y;
      let side = 0;
      if (memo.wave > 0) {
        const reach = clamp01((arc - WAVE_FROM.start) / (WAVE_FROM.full - WAVE_FROM.start));
        side += memo.wave * reach * Math.sin((2 * Math.PI * (memo.odometer - arc)) / WAVE.length);
      }
      if (rippling) {
        const p = ripple - (i - 1) * RIPPLE.lag;
        if (p > 0 && p < 1) side += RIPPLE.px * Math.sin(Math.PI * p) * (1 - 0.4 * p);
      }
      if (mood.dizzy > 0) side += WOBBLE.px * mood.dizzy * Math.sin((2 * Math.PI * t) / WOBBLE.ms - i * WOBBLE.lag);
      if (side) {
        // across the trail here
        along(trail, s.x, s.y, arc + 1, point);
        const tx = x - point.x;
        const ty = y - point.y;
        const tl = Math.hypot(tx, ty) || 1;
        x += (-ty / tl) * side;
        y += (tx / tl) * side;
      }
      cx[i] = x;
      cy[i] = y;
    }
    // As bends: each link's turn from the one before (a link points from a
    // module toward the one ahead of it), in the frame of its heading, so
    // other shapes can be blended in. The trail turns by memo.offset too.
    let previous = heading - memo.offset;
    for (let i = 1; i <= n; i++) {
      const dx = cx[i - 1] - cx[i];
      const dy = cy[i - 1] - cy[i];
      const beta = Math.atan2(dy, dx);
      bend[i] = angleTo(previous, beta);
      link[i] = Math.hypot(dx, dy);
      previous = beta;
    }

    // Asleep: coiled up
    if (sleep > 0) {
      if (memo.coil === undefined) {
        // around the side it already curves toward
        let sum = 0;
        for (let i = 1; i <= n; i++) sum += bend[i];
        memo.coil = sum > 0 ? -1 : 1;
      }
      for (let i = 1; i <= n; i++) {
        bend[i] = lerp(bend[i], COIL_BENDS[i - 1] * memo.coil, sleep);
        link[i] = lerp(link[i], i === 1 ? NECK : SPACING, sleep);
      }
    } else memo.coil = undefined;
    // Carried: hanging down from its head, which turns up to the hand
    let base = heading;
    if (lift > 0) {
      // A pendulum, swung by how it is carried across
      const target = Math.max(-HANG.sway, Math.min(HANG.sway, -s.vx / HANG.per));
      memo.swing = memo.swing || { angle: 0, rate: 0 };
      const sw = memo.swing;
      const h = dt / 1000;
      sw.rate += (HANG.stiffness * (target - sw.angle) - HANG.damping * sw.rate) * h;
      sw.angle += sw.rate * h;
      base = heading + angleTo(heading, -Math.PI / 2) * lift;
      const hangFirst = angleTo(base, -Math.PI / 2 - sw.angle);
      for (let i = 1; i <= n; i++) {
        const hang = i === 1 ? hangFirst : -sw.angle * 0.12;
        bend[i] = lerp(bend[i], hang, lift);
        link[i] = lerp(link[i], i === 1 ? NECK : SPACING, lift);
      }
      memo.swinging = memo.swinging || Math.abs(sw.rate) > 0.01;
    } else memo.swing = null;
    // Rebuild the chain from its bends
    previous = base;
    for (let i = 1; i <= n; i++) {
      const beta = previous + bend[i];
      cx[i] = cx[i - 1] - Math.cos(beta) * link[i];
      cy[i] = cy[i - 1] - Math.sin(beta) * link[i];
      previous = beta;
    }

    // Its head: turned on its neck toward what it watches
    let yaw = s.reduced ? 0 : Math.max(-LOOK_TURN, Math.min(LOOK_TURN, angleTo(heading, s.gaze)));
    if (s.activity === "search") yaw += SCAN.rad * Math.sin((2 * Math.PI * t) / SCAN.ms);
    // Confused: a tilt to one side, held
    if (mood.confused > 0) {
      if (!memo.tilt) memo.tilt = Math.random() < 0.5 ? -1 : 1;
      yaw = lerp(yaw, TILT * memo.tilt, mood.confused);
    } else memo.tilt = 0;
    yaw = lerp(yaw, 0, sleep) * (1 - lift) + mood.happy * moodTurn;
    let headAngle = base + yaw;
    let headX = 0;
    let headY = 0;
    if (mood.dizzy > 0) {
      // the head loops about its neck
      const nx = -Math.cos(base) * LOOP_RADIUS;
      const ny = -Math.sin(base) * LOOP_RADIUS;
      headAngle = base + moodTurn;
      headX = nx + Math.cos(headAngle) * LOOP_RADIUS;
      headY = ny + Math.sin(headAngle) * LOOP_RADIUS;
    }

    // ---- drawing ----
    const scale = 1 + LIFT_SCALE * raised - SLEEP_SCALE * sleep;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.lineJoin = "round";
    const x0 = s.x;
    const y0 = s.y;
    const angleOf = (i) => {
      // a module lies along the links either side of it
      const ax = cx[i - 1] - cx[i];
      const ay = cy[i - 1] - cy[i];
      if (i === n) return Math.atan2(ay, ax);
      const bx = cx[i] - cx[i + 1];
      const by = cy[i] - cy[i + 1];
      return Math.atan2(ay / (link[i] || 1) + by / (link[i + 1] || 1), ax / (link[i] || 1) + bx / (link[i + 1] || 1));
    };
    const headShape = () => {
      ctx.beginPath();
      ctx.roundRect(-HEAD.back, -HEAD.half, HEAD.back + HEAD.front, 2 * HEAD.half, HEAD.radius);
    };

    // Lifted: its shadow, left on the ground
    if (raised > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${SHADOW.alpha * raised * alpha})`;
      for (let i = n; i >= 1; i--) {
        moduleAt(ctx, cx[i] - x0 + SHADOW.x * raised, cy[i] - y0 + SHADOW.y * raised, angleOf(i), i === n);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(headX + SHADOW.x * raised, headY + SHADOW.y * raised);
      ctx.rotate(headAngle);
      headShape();
      ctx.fill();
      ctx.restore();
    }
    // Its dark edge, all around
    ctx.strokeStyle = INK(0.92 * alpha);
    ctx.lineWidth = 2 * EDGE;
    for (let i = n; i >= 1; i--) {
      moduleAt(ctx, cx[i] - x0, cy[i] - y0, angleOf(i), i === n);
      ctx.stroke();
    }
    // Its spine: the joints between modules, dark
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    for (let i = 1; i <= n; i++) ctx.lineTo(cx[i] - x0, cy[i] - y0);
    ctx.lineWidth = SPINE.width;
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(${SPINE.rgb}, ${alpha})`;
    ctx.stroke();
    ctx.strokeStyle = INK(0.92 * alpha);
    // The modules, tail first, each edged in dark where it meets the next
    for (let i = n; i >= 1; i--) {
      moduleAt(ctx, cx[i] - x0, cy[i] - y0, angleOf(i), i === n);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = INK(alpha);
      ctx.fill();
      ctx.fillStyle = AMBER(0.95 * alpha);
      ctx.fill();
    }
    // The head, its dark face at the front
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(headAngle);
    headShape();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK(0.92 * alpha);
    ctx.stroke();
    ctx.fillStyle = INK(alpha);
    ctx.fill();
    ctx.fillStyle = AMBER(0.95 * alpha);
    ctx.fill();
    {
      const front = HEAD.front;
      const across = HEAD.half - FACE.inset;
      ctx.beginPath();
      ctx.roundRect(front - FACE.inset - FACE.depth, -across, FACE.depth, 2 * across, FACE.radius);
      ctx.fillStyle = `rgba(30, 30, 33, ${alpha})`;
      ctx.fill();
      // Eyes: they close front to back
      const open = clamp01(s.open);
      const eyes = alpha;
      const depth = Math.max(0.42, 2 * EYE.r * open);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.roundRect(front - HEAD.front + EYE.x - depth / 2, side * EYE.y - EYE.r, depth, 2 * EYE.r, depth / 2);
        ctx.fillStyle = CREAM((0.55 + 0.4 * open) * eyes);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.restore();
  },
};

export default look;
