// The robot's character, whatever it looks like: when it blinks, how it
// feels, whether it is asleep, being carried. Its drivers move it; this
// keeps what happens to it besides moving, and RobotLayer draws both.
//
// Moods are short: happy (booped), dizzy (booped too often), startled (picked
// up), confused (sent somewhere it can't reach). Each rises quickly, holds,
// and fades. With no input at all for a while it falls asleep; any input
// wakes it, slowly.

const BLINK_EVERY = [2400, 6200]; // ms between blinks
const BLINK_MS = 150;
const DOUBLE_BLINK = 0.2; // the share of blinks that come in twos
const SLEEP_AFTER_MS = 25000;
const FALL_ASLEEP_MS = 1400;
const WAKE_MS = 700;
const MOODS = {
  happy: 1400, // it hops out from under the pointer first (RobotLayer)
  dizzy: 2000,
  startled: 700,
  confused: 1800,
};
const MOOD_IN_MS = 120;
const MOOD_OUT_MS = 320;
const DIZZY_BOOPS = 4;
const DIZZY_WINDOW_MS = 3600; // long enough to catch it after each hop
const LIFT_MS = 220; // picked up, or set down
const SNORE_EVERY_MS = 3200; // a "z" rises while it sleeps

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

const listeners = new Set();
const emit = (event) => listeners.forEach((listener) => listener(event));

let lastInput = performance.now();
let asleep = false;
let sleepChangedAt = -Infinity;
let blinks = []; // start times
let nextBlinkAt = performance.now() + 2000;
const moods = {}; // name → { from, until }
let boops = [];
let carried = false;
let carryChangedAt = -Infinity;

const scheduleBlink = (now) => {
  nextBlinkAt = now + BLINK_EVERY[0] + Math.random() * (BLINK_EVERY[1] - BLINK_EVERY[0]);
};

const moodLevel = (name, now) => {
  const mood = moods[name];
  if (!mood || now >= mood.until) return 0;
  const rise = clamp01((now - mood.from) / MOOD_IN_MS);
  const fall = clamp01((mood.until - now) / MOOD_OUT_MS);
  return easeOut(Math.min(rise, fall));
};

export const character = {
  // Something the reader did (pointer, scroll, key, touch): it stays awake,
  // or wakes
  input(now = performance.now()) {
    lastInput = now;
    if (asleep) {
      asleep = false;
      sleepChangedAt = now;
      emit("wake");
    }
  },
  // Advance its clock: blinks, and falling asleep
  update(now) {
    if (!asleep && !carried && now - lastInput > SLEEP_AFTER_MS) {
      asleep = true;
      sleepChangedAt = now;
      emit("sleep");
    }
    if (now >= nextBlinkAt) {
      blinks.push(now);
      if (Math.random() < DOUBLE_BLINK) blinks.push(now + BLINK_MS + 90);
      scheduleBlink(now);
    }
    blinks = blinks.filter((start) => now - start < BLINK_MS);
  },
  get asleep() {
    return asleep;
  },
  // 0 awake … 1 asleep, eased through falling asleep and waking
  sleep(now) {
    const t = now - sleepChangedAt;
    if (asleep) return easeInOut(clamp01(t / FALL_ASLEEP_MS));
    return 1 - easeOut(clamp01(t / WAKE_MS));
  },
  // How open its eyes are, 0…1: blinks, sleep
  open(now) {
    let open = 1;
    for (const start of blinks) {
      const k = clamp01((now - start) / BLINK_MS);
      if (k >= 0 && k <= 1) open = Math.min(open, Math.abs(1 - 2 * k));
    }
    return open * (1 - character.sleep(now));
  },
  mood: moodLevel,
  // How far through a mood it is, 0…1 (1 once it is over)
  progress(name, now) {
    const mood = moods[name];
    if (!mood) return 1;
    return clamp01((now - mood.from) / (mood.until - mood.from));
  },
  moods(now) {
    const out = {};
    for (const name of Object.keys(MOODS)) out[name] = moodLevel(name, now);
    return out;
  },
  feel(name, now = performance.now()) {
    moods[name] = { from: now, until: now + MOODS[name] };
  },
  // Tapped: happy, or dizzy after several taps in a row
  boop(now = performance.now()) {
    character.input(now);
    boops = boops.filter((t) => now - t < DIZZY_WINDOW_MS);
    boops.push(now);
    if (boops.length >= DIZZY_BOOPS) {
      boops = [];
      delete moods.happy;
      character.feel("dizzy", now);
    } else if (moodLevel("dizzy", now) === 0) {
      character.feel("happy", now);
    }
  },
  pickUp(now = performance.now()) {
    character.input(now);
    carried = true;
    carryChangedAt = now;
    character.feel("startled", now);
  },
  setDown(now = performance.now()) {
    carried = false;
    carryChangedAt = now;
  },
  get carried() {
    return carried;
  },
  // 0 on the floor … 1 held up
  lift(now) {
    const k = easeOut(clamp01((now - carryChangedAt) / LIFT_MS));
    return carried ? k : 1 - k;
  },
  // The "z"s rising while it sleeps: [{ age 0…1, index }]
  snores(now) {
    if (!asleep) return [];
    const since = now - sleepChangedAt - FALL_ASLEEP_MS;
    if (since < 0) return [];
    const out = [];
    const index = Math.floor(since / SNORE_EVERY_MS);
    for (let i = Math.max(0, index - 1); i <= index; i++) {
      const age = (since - i * SNORE_EVERY_MS) / (SNORE_EVERY_MS * 0.55);
      if (age >= 0 && age <= 1) out.push({ age, index: i });
    }
    return out;
  },
  // Whether anything about it is changing now (so it needs frames)
  animating(now) {
    if (blinks.length) return true;
    if (now - sleepChangedAt < Math.max(FALL_ASLEEP_MS, WAKE_MS) + 50) return true;
    if (now - carryChangedAt < LIFT_MS + 50) return true;
    if (Object.keys(MOODS).some((name) => moodLevel(name, now) > 0)) return true;
    return character.snores(now).length > 0;
  },
  // When it next needs a frame while nothing else is changing
  nextEventAt(now) {
    if (asleep) {
      const since = now - sleepChangedAt - FALL_ASLEEP_MS;
      return now + Math.max(16, SNORE_EVERY_MS - (since % SNORE_EVERY_MS));
    }
    return Math.min(nextBlinkAt, lastInput + SLEEP_AFTER_MS);
  },
  // Fall asleep now, as if left alone (for checking it in development)
  sleepNow(now = performance.now()) {
    lastInput = now - SLEEP_AFTER_MS - 1;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
