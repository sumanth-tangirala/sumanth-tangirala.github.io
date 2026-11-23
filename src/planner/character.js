// The robot's character, whatever it looks like: when it blinks, how it
// feels, whether it is asleep, being carried. Its drivers move it; this
// keeps what happens to it besides moving, and RobotLayer draws both.
//
// Moods are short: happy (booped), dizzy (booped too often), startled (picked
// up), confused (sent somewhere it can't reach). Each rises quickly, holds,
// and fades. Left alone, it dozes off once it is standing still: in the
// hero after a few queries with no input (its driver says when), further
// down the page after a while. Any input wakes it with a start: its eyes
// snap open, it is startled, and it comes round slowly.

const BLINK_EVERY = [2400, 6200]; // ms between blinks
const BLINK_MS = 150;
const DOUBLE_BLINK = 0.2; // the share of blinks that come in twos
const SLEEP_AFTER_MS = 25000;
const FALL_ASLEEP_MS = 1400;
const WAKE_MS = 700;
const EYES_WAKE_MS = 90; // woken with a start
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
// While it sleeps a "z" rises this often and lasts this many times as long,
// so three float up at a time; when it wakes they fade out where they are
const SNORE_EVERY_MS = 850;
const SNORE_LIFE = 3;
const SNORE_FADE_MS = 80;

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

const listeners = new Set();
const emit = (event) => listeners.forEach((listener) => listener(event));

let lastInput = performance.now();
let asleep = false;
let sleepChangedAt = -Infinity;
let sleptAt = -Infinity;
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
      character.feel("startled", now);
      emit("wake");
    }
  },
  // Advance its clock: blinks, and falling asleep if it `mayDoze` now
  update(now, mayDoze) {
    if (mayDoze && now - lastInput > SLEEP_AFTER_MS) character.doze(now);
    if (now >= nextBlinkAt) {
      blinks.push(now);
      if (Math.random() < DOUBLE_BLINK) blinks.push(now + BLINK_MS + 90);
      scheduleBlink(now);
    }
    blinks = blinks.filter((start) => now - start < BLINK_MS);
  },
  // Fall asleep now (unless it is in hand)
  doze(now = performance.now()) {
    if (asleep || carried) return;
    asleep = true;
    sleepChangedAt = now;
    sleptAt = now;
    emit("sleep");
  },
  get asleep() {
    return asleep;
  },
  // When the reader last did anything
  get lastInput() {
    return lastInput;
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
    const t = now - sleepChangedAt;
    const shut = asleep ? character.sleep(now) : 1 - easeOut(clamp01(t / EYES_WAKE_MS));
    return open * (1 - shut);
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
  // The "z"s rising while it sleeps, and fading once it wakes:
  // [{ age 0…1, index, alpha }]
  snores(now) {
    const alpha = asleep ? 1 : 1 - (now - sleepChangedAt) / SNORE_FADE_MS;
    if (alpha <= 0) return [];
    const since = now - sleptAt - FALL_ASLEEP_MS;
    const last = Math.floor(((asleep ? now : sleepChangedAt) - sleptAt - FALL_ASLEEP_MS) / SNORE_EVERY_MS);
    const out = [];
    for (let i = Math.max(0, last - SNORE_LIFE + 1); i <= last; i++) {
      const age = (since - i * SNORE_EVERY_MS) / (SNORE_EVERY_MS * SNORE_LIFE);
      if (age >= 0 && age <= 1) out.push({ age, index: i, alpha });
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
    // (Past its bedtime but not where it may doze, its driver's next report
    // brings the frame that puts it to sleep)
    const bedtime = lastInput + SLEEP_AFTER_MS;
    return Math.min(nextBlinkAt, bedtime > now ? bedtime : Infinity);
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
