import { AMBER, BULLET_RADIUS, CREAM, GREY, INK, clamp01, easeInOut, HOP_PEAK, lerp } from "./shared";

// A small quadrotor, seen from above: an X frame with a prop at each end, an
// amber body, and a camera gimbal under its nose that turns to whatever it
// looks at. Its front motors are amber and its rear ones grey, so its
// heading reads the way a real drone's does. It flies, so it casts a
// shadow on the floor, down and to the right by its height: the shadow is
// what makes it read as off the ground.
//
// It only flies while it has something to do. Left waiting, it lands after a
// moment and its props spin down, so the page goes still; asked to search or
// drive, it spins up and lifts off. Flying, it leans into its acceleration,
// as a quadrotor steers (drawn foreshortened along the axis it leans on), and
// its shadow trails it a little.
//
// On load it is camouflaged as the tagline's bullet: landed, its arms folded
// under its body, drawn in to the bullet's disc; only its camera, where the
// bullet's mark would be, gives it away (it turns to you, and its lens
// blinks). Breaking cover, its body draws in to its plate, its arms reach
// out, and its props spin up.

// Its shape, px
const MOTOR = 7.6; // from the centre to each motor
const PROP = 4; // prop disc radius (and its guard's)
const GUARD_W = 0.75;
const BODY = { a: 4.1, b: 2.9, r: 2 }; // the amber plate: half its length, half its width, corners
const ARM_W = 1.7; // grey arm (a dark stroke under it)
const POD = 1.45; // motor radius
const BLADE = 0.82; // blade length, of the prop's radius (each side of the hub)
const GIMBAL = { x: 3.7, w: 2.5, h: 2.6, lens: 0.55 }; // under the nose; its lens
// The motors: front-left, front-right, rear-right, rear-left (radians from
// its heading; y points down, so −π/4 is ahead and to its left). Diagonal
// props turn the same way, as on a real quadrotor.
const MOTORS = [-Math.PI / 4, Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4];
const MX = MOTORS.map(Math.cos);
const MY = MOTORS.map(Math.sin);
const TURNS = [1, -1, 1, -1];
const REST = [0.4, 2.05, 1.15, 2.7]; // where its blades sit before they have spun

// Flying, px and ms
const HOVER = 5; // its height above the floor
const BOB = { px: 0.35, ms: 2600 }; // a slow rise and fall while it hovers
const CARRIED_HEIGHT = 12; // held up in the reader's hand
const LAND_AFTER_MS = 1500; // waiting with nothing to do, it lands
const SPIN_UP_MS = 400;
const SPIN_DOWN_MS = 750;
const LIFT_OFF_SPIN = 0.6; // it rises once its props are this fast
const TOUCH_DOWN = 0.2; // px: this low, it has landed, and its props stop
const CLIMB_RATE = 9; // 1/s: how quickly its height follows (critically damped)
// Nearer the eye as it rises, it is drawn larger: this much on the floor, and
// this much more per px of height (+6% held up)
const SCALE = { floor: 0.97, perPx: 0.0075 };
// How its props look turning: a blade turns this fast at full speed (rad/s;
// real props are far faster, so this is the impression of one), with a faint
// blur behind it
const PROP_RATE = 15;
const BLUR_ARC = 0.75; // rad behind each blade
// It leans toward its acceleration plus a little into its speed (against the
// air), by (a + drag·v) / gravity, at most 1; leaning fully it is drawn this
// much shorter along the lean
const LEAN = { gravity: 760, drag: 1.2, smoothMs: 110, squash: 0.3 };
// Its shadow: down and to the right of it, by its height (+ a little, so it
// shows when it has landed), trailing it by its speed × this (at most px)
const SHADOW = { x: 0.6, y: 0.8, base: 0.6, lagS: 0.03, maxLag: 4 };
// It is the frame's outline, faintly dark, with a blur round it that softens
// as it rises: its darkness in the middle (on the floor … held up high), and
// px of softness
const SHADOW_ALPHA = { floor: 0.38, high: 0.2 };
const SHADOW_BLUR = { floor: 0.8, perPx: 0.17 };
// The gimbal turns to where it looks, up to this far either side (rad)
const GIMBAL_YAW = 1.25;
const GIMBAL_RATE = 14; // 1/s
const SCAN = { rad: 0.45, ms: 2400 }; // searching, it sweeps around the goal
// Moods
const HOP = { px: 5, ms: 460 }; // happy: a quick hop
const WOBBLE = { lean: 0.85, wander: 1.4, ms: 720 }; // dizzy
const PUZZLED = { drift: 1.8, driftMs: 1900, lean: 0.35, swivel: 0.95, swivelMs: 1300 }; // confused
const ASLEEP_LIGHTS = 0.5; // its lights dim to this

const TAU = 2 * Math.PI;

// Critically damped approach of a spring { x, v } toward a target, over dt
// ms at a rate w (1/s): it never overshoots, and it comes to rest exactly
const approach = (spring, target, w, dt) => {
  const t = dt / 1000;
  const e = spring.x - target;
  const k = spring.v + w * e;
  const decay = Math.exp(-w * t);
  spring.x = target + (e + k * t) * decay;
  spring.v = (spring.v - w * k * t) * decay;
  if (Math.abs(spring.x - target) < 0.002 && Math.abs(spring.v) < 0.02) {
    spring.x = target;
    spring.v = 0;
  }
  return spring.x;
};

// How blurred its props are at a speed 0…1: solid blades when slow
const blurAt = (spin) => easeInOut(clamp01((spin - 0.15) / 0.6));

// Its state between frames: how fast its props turn, how high it is, where
// its blades are and where its gimbal looks
const start = (memo, s, flying) => {
  memo.ready = true;
  memo.spin = flying ? 1 : 0;
  memo.height = { x: flying ? HOVER : 0, v: 0 };
  memo.yaw = { x: s.look * 1.2, v: 0 };
  memo.phase = REST.slice();
  memo.engagedAt = flying ? s.t : -Infinity;
  memo.ax = 0;
  memo.ay = 0;
  memo.vx = s.vx;
  memo.vy = s.vy;
  memo.hopAt = -Infinity;
  memo.hopWanted = false;
  memo.happy = false;
  memo.moving = false;
};

// Whether it has a reason to be in the air: a trip under way (which it
// finishes even if it is falling asleep, rather than land and slide), being
// held up, or a mood
const underway = (s) =>
  s.activity === "search" || s.activity === "drive" || s.activity === "wake" || s.carried || s.lift > 0 || s.hopping || s.speed > 3;
const moved = (s) => s.mood.happy > 0 || s.mood.dizzy > 0 || s.mood.confused > 0 || s.mood.startled > 0;

// Advance its flight by one frame; returns what to draw
const fly = (s, memo, out) => {
  const { t } = s;
  const dt = Math.max(1, s.dt);
  const asleep = s.sleep > 0.02;
  const trip = underway(s);
  if (trip || (moved(s) && !asleep)) memo.engagedAt = t;
  const wantsAir = trip || (!asleep && t - memo.engagedAt < LAND_AFTER_MS);

  // Props first: up before it rises, down once it has landed
  if (wantsAir) memo.spin = Math.min(1, memo.spin + dt / SPIN_UP_MS);
  else if (memo.height.x <= TOUCH_DOWN) memo.spin = Math.max(0, memo.spin - dt / SPIN_DOWN_MS);
  for (let i = 0; i < 4; i++) memo.phase[i] = (memo.phase[i] + TURNS[i] * PROP_RATE * memo.spin * (dt / 1000)) % TAU;

  // Its height: hovering (bobbing slowly), or on the floor
  const hover = HOVER + BOB.px * Math.sin((TAU * t) / BOB.ms);
  const height = approach(memo.height, wantsAir && memo.spin >= LIFT_OFF_SPIN ? hover : 0, CLIMB_RATE, dt);
  // ... held up by the reader's hand, however fast its props are
  let h = Math.max(height, s.lift * CARRIED_HEIGHT);
  // ... and a hop when it is pleased, once its props can lift it
  if (s.mood.happy > 0 && !memo.happy && !s.hopping) memo.hopWanted = true;
  memo.happy = s.mood.happy > 0;
  if (memo.hopWanted && memo.spin >= LIFT_OFF_SPIN) {
    memo.hopWanted = false;
    memo.hopAt = t;
  }
  const hop = (t - memo.hopAt) / HOP.ms;
  const hopping = hop >= 0 && hop < 1;
  if (hopping) h += HOP.px * 4 * hop * (1 - hop);
  // ... or the layer's hop, booped (as high as its own)
  h += (HOP.px * s.hop) / HOP_PEAK;
  const air = clamp01(h / 2); // how far off the floor it is, for leaning

  // Leaning: into its acceleration (smoothed) and its speed
  const ax = (s.vx - memo.vx) / (dt / 1000);
  const ay = (s.vy - memo.vy) / (dt / 1000);
  memo.vx = s.vx;
  memo.vy = s.vy;
  const k = 1 - Math.exp(-dt / LEAN.smoothMs);
  memo.ax = lerp(memo.ax, ax, k);
  memo.ay = lerp(memo.ay, ay, k);
  let lx = ((memo.ax + LEAN.drag * s.vx) / LEAN.gravity) * air;
  let ly = ((memo.ay + LEAN.drag * s.vy) / LEAN.gravity) * air;
  let ox = 0;
  let oy = 0;
  // Dizzy: it wobbles round as it is spun, and wanders
  const dizzy = s.mood.dizzy * air;
  if (dizzy > 0) {
    const a = (TAU * t) / WOBBLE.ms;
    lx += WOBBLE.lean * dizzy * Math.cos(a);
    ly += WOBBLE.lean * dizzy * Math.sin(a);
    ox += WOBBLE.wander * dizzy * Math.cos(a * 0.5);
    oy += WOBBLE.wander * dizzy * Math.sin(a * 0.5);
  }
  // Confused: it drifts from side to side, leaning back toward the middle
  const puzzled = s.mood.confused * air;
  if (puzzled > 0) {
    const d = Math.sin((TAU * t) / PUZZLED.driftMs);
    const sx = -Math.sin(s.theta);
    const sy = Math.cos(s.theta);
    ox += sx * PUZZLED.drift * d * puzzled;
    oy += sy * PUZZLED.drift * d * puzzled;
    lx -= sx * PUZZLED.lean * d * puzzled;
    ly -= sy * PUZZLED.lean * d * puzzled;
  }
  const lean = Math.min(1, Math.hypot(lx, ly));

  // Its gimbal: toward what it looks at; sweeping while it searches;
  // swivelling when puzzled; ahead when it sleeps
  let yaw = s.look * 1.2;
  if (s.activity === "search") yaw += SCAN.rad * Math.sin((TAU * t) / SCAN.ms);
  if (s.mood.confused > 0) yaw = lerp(yaw, PUZZLED.swivel * Math.sin((TAU * t) / PUZZLED.swivelMs), s.mood.confused);
  yaw = Math.max(-GIMBAL_YAW, Math.min(GIMBAL_YAW, yaw)) * (1 - s.sleep) * (1 - s.mood.dizzy);
  approach(memo.yaw, yaw, GIMBAL_RATE, dt);

  // Its shadow trails it by its speed while it flies
  let tx = -s.vx * SHADOW.lagS * air;
  let ty = -s.vy * SHADOW.lagS * air;
  const lag = Math.hypot(tx, ty);
  if (lag > SHADOW.maxLag) {
    tx *= SHADOW.maxLag / lag;
    ty *= SHADOW.maxLag / lag;
  }

  memo.moving =
    memo.spin > 0 || memo.height.v !== 0 || memo.height.x !== 0 || memo.yaw.v !== 0 || hopping || memo.hopWanted;
  out.h = h;
  out.spin = memo.spin;
  out.lean = lean;
  out.leanAt = lean > 0 ? Math.atan2(ly, lx) : 0;
  out.ox = ox;
  out.oy = oy;
  out.tx = tx;
  out.ty = ty;
  out.yaw = memo.yaw.x;
  return out;
};

// Foreshorten along the direction it leans (world radians), as a tilted
// frame looks from above
const leanInto = (ctx, lean, at) => {
  if (lean <= 0) return;
  ctx.rotate(at);
  ctx.scale(1 - LEAN.squash * lean, 1);
  ctx.rotate(-at);
};

// The frame's shadow: one shape (so its overlaps don't darken twice), filled
// faintly and blurred round its edge by the canvas's own shadow, which
// doubles its darkness inside (alpha a reads as about a·(2 − a))
const drawShadow = (ctx, s, f, arms, px) => {
  const h = f.h;
  const reach = SHADOW.base + h;
  const alpha = lerp(SHADOW_ALPHA.floor, SHADOW_ALPHA.high, clamp01(h / CARRIED_HEIGHT)) * arms;
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(f.ox + SHADOW.x * reach + f.tx, f.oy + SHADOW.y * reach + f.ty);
  leanInto(ctx, f.lean, f.leanAt);
  ctx.rotate(s.theta);
  const scale = SCALE.floor + SCALE.perPx * h;
  ctx.scale(scale, scale);
  ctx.shadowBlur = (SHADOW_BLUR.floor + SHADOW_BLUR.perPx * h) * px; // device px
  ctx.shadowColor = "#000";
  ctx.beginPath();
  ctx.roundRect(-BODY.a - 0.3, -BODY.b - 0.3, 2 * BODY.a + 0.6, 2 * BODY.b + 0.6, BODY.r + 0.3);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate(MOTORS[i]);
    ctx.rect(0, -1.1, MOTOR * arms, 2.2);
    ctx.restore();
    ctx.moveTo(MX[i] * MOTOR * arms + POD + 0.3, MY[i] * MOTOR * arms);
    ctx.arc(MX[i] * MOTOR * arms, MY[i] * MOTOR * arms, POD + 0.3, 0, TAU);
  }
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fill();
  // The props and their guards, faintly
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const x = MX[i] * MOTOR * arms;
    const y = MY[i] * MOTOR * arms;
    ctx.moveTo(x + PROP * arms, y);
    ctx.arc(x, y, PROP * arms, 0, TAU);
  }
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha * (0.25 + 0.1 * blurAt(f.spin))})`;
  ctx.fill();
  ctx.restore();
};

// The quadrotor itself, in its own frame (x ahead). `arms` 0…1: how far its
// arms are out (unfolding); `body` 0…1: the bullet's disc become its body.
// Bottom to top: a dark disc inside each guard, the arms and motors, the
// props, their guards, then the body and its gimbal over all of it.
const drawCraft = (ctx, s, f, memo, arms, body) => {
  const lights = lerp(1, ASLEEP_LIGHTS, s.sleep);
  const blur = blurAt(f.spin) * arms;
  const reach = MOTOR * arms;
  const prop = PROP * arms;
  ctx.lineCap = "round";

  if (arms > 0) {
    // A dark disc inside each guard, so it reads over the lines behind it
    // (darker while the props spin)
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(MX[i] * reach + prop, MY[i] * reach);
      ctx.arc(MX[i] * reach, MY[i] * reach, prop, 0, TAU);
    }
    ctx.fillStyle = INK(0.35 + 0.25 * blur);
    ctx.fill();

    // The arms: dark under-strokes, grey arms
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(0, 0);
      ctx.lineTo(MX[i] * reach, MY[i] * reach);
    }
    ctx.lineWidth = ARM_W + 2;
    ctx.strokeStyle = INK(0.95);
    ctx.stroke();
    ctx.lineWidth = ARM_W;
    ctx.strokeStyle = GREY(0.6);
    ctx.stroke();
    // The motors: the front two amber, as its arms' tips, so its heading reads
    const pod = POD * Math.min(1, arms * 1.6);
    for (let i = 0; i < 4; i++) {
      const x = MX[i] * reach;
      const y = MY[i] * reach;
      ctx.beginPath();
      ctx.arc(x, y, pod + 0.9, 0, TAU);
      ctx.fillStyle = INK(0.95);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, pod, 0, TAU);
      ctx.fillStyle = i < 2 ? AMBER(0.95 * lights) : GREY(0.6);
      ctx.fill();
    }

    // The props: a faint disc and a blurred blade while they spin, the
    // blades themselves once they stop
    const blade = prop * BLADE;
    for (let i = 0; i < 4; i++) {
      const x = MX[i] * reach;
      const y = MY[i] * reach;
      const p = memo.phase[i];
      if (blur > 0) {
        ctx.beginPath();
        ctx.arc(x, y, prop, 0, TAU);
        ctx.fillStyle = GREY(0.05 * blur);
        ctx.fill();
        // the blur behind each blade
        const back = -TURNS[i] * BLUR_ARC;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, blade, p + back, p, TURNS[i] < 0);
        ctx.closePath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, blade, p + Math.PI + back, p + Math.PI, TURNS[i] < 0);
        ctx.closePath();
        ctx.fillStyle = GREY(0.1 * blur);
        ctx.fill();
      }
      const cx = Math.cos(p) * blade;
      const cy = Math.sin(p) * blade;
      ctx.beginPath();
      ctx.moveTo(x - cx, y - cy);
      ctx.lineTo(x + cx, y + cy);
      if (blur < 1) {
        ctx.lineWidth = 2.1;
        ctx.strokeStyle = INK(0.85 * (1 - blur));
        ctx.stroke();
      }
      ctx.lineWidth = lerp(1, 0.8, blur);
      ctx.strokeStyle = GREY(lerp(0.72, 0.3, blur));
      ctx.stroke();
    }

    // The guards round the props
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(MX[i] * reach + prop, MY[i] * reach);
      ctx.arc(MX[i] * reach, MY[i] * reach, prop, 0, TAU);
    }
    ctx.lineWidth = GUARD_W + 1.2;
    ctx.strokeStyle = INK(0.8);
    ctx.stroke();
    ctx.lineWidth = GUARD_W;
    ctx.strokeStyle = GREY(lerp(0.3, 0.34, blur));
    ctx.stroke();
  }

  // The body: the bullet's disc, drawn in to a rounded plate
  const a = lerp(BULLET_RADIUS, BODY.a, body);
  const b = lerp(BULLET_RADIUS, BODY.b, body);
  ctx.beginPath();
  ctx.roundRect(-a, -b, 2 * a, 2 * b, lerp(BULLET_RADIUS, BODY.r, body));
  ctx.lineWidth = lerp(3, 2.4, body);
  ctx.strokeStyle = INK(0.9);
  ctx.stroke();
  ctx.fillStyle = AMBER(0.95);
  ctx.fill();

  // The gimbal: a dark camera under its nose, its lens toward what it looks at
  ctx.save();
  ctx.translate(GIMBAL.x, 0);
  ctx.rotate(f.yaw);
  ctx.beginPath();
  ctx.roundRect(-GIMBAL.w / 2, -GIMBAL.h / 2, GIMBAL.w, GIMBAL.h, 1);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = INK(0.9);
  ctx.stroke();
  ctx.fillStyle = "#222226";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(GIMBAL.w / 2 - 0.6, 0, GIMBAL.lens * (0.45 + 0.55 * s.open), 0, TAU);
  ctx.fillStyle = CREAM(0.95 * lights);
  ctx.fill();
  ctx.restore();
};

const frame = {}; // what fly() returns, reused each frame

const look = {
  id: "quad",
  name: "Quadrotor",
  radius: 9,
  reach: 11.5, // its props reach past its body
  extent: 36, // its shadow, when it is held up high
  hitScale: 1.1,
  bubbleAt: (s) => 15 + s.lift * 4,
  draw(ctx, s, memo) {
    // Camouflaged as the tagline's bullet: on the floor, folded into the
    // bullet's disc, its camera turned to you
    if (s.unfold <= 0 || s.activity === "bullet") {
      start(memo, s, false);
      const yaw = s.reduced ? 0 : Math.max(-GIMBAL_YAW, Math.min(GIMBAL_YAW, s.look * 1.2));
      ctx.save();
      ctx.globalAlpha *= s.alpha;
      ctx.rotate(s.theta);
      drawCraft(ctx, s, Object.assign(frame, { h: 0, spin: 0, yaw }), memo, 0, 0);
      ctx.restore();
      return;
    }
    if (!memo.ready) start(memo, s, !s.reduced && (underway(s) || (moved(s) && s.sleep === 0)));
    let f;
    if (s.reduced) {
      // Still: landed, its props stopped, looking ahead
      memo.moving = false;
      f = Object.assign(frame, { h: 0, spin: 0, lean: 0, leanAt: 0, ox: 0, oy: 0, tx: 0, ty: 0, yaw: 0 });
    } else {
      f = fly(s, memo, frame);
    }

    // Unfolding: the disc draws in to its body, its arms reach out from under
    // it, and only then do its props spin up and it lifts off
    const u = s.unfold;
    const body = easeInOut(clamp01(u / 0.55));
    const arms = easeInOut(clamp01((u - 0.2) / 0.6));
    if (u < 1) {
      f.spin = Math.min(f.spin, clamp01((u - 0.6) / 0.4));
      f.h *= easeInOut(clamp01((u - 0.65) / 0.35));
      f.lean *= u;
    }

    const m = ctx.getTransform();
    const px = Math.hypot(m.a, m.b);
    ctx.save();
    ctx.globalAlpha *= s.alpha;
    drawShadow(ctx, s, f, arms, px);
    ctx.translate(f.ox, f.oy);
    leanInto(ctx, f.lean, f.leanAt);
    ctx.rotate(s.theta);
    const scale = SCALE.floor + SCALE.perPx * f.h;
    ctx.scale(scale, scale);
    drawCraft(ctx, s, f, memo, arms, body);
    ctx.restore();
  },
  // Frames while its props turn, it climbs or lands, or its gimbal turns
  busy: (s, memo) => !!memo.moving,
};

export default look;
