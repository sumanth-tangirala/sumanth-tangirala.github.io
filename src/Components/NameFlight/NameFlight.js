import React, { memo, useEffect, useRef } from "react";
import text from "text";
import styles from "./nameFlight.module.scss";

// Moves the hero's name into the nav pill. The name scrolls with the page
// like any text until it comes within GAP px of the nav; then it docks into
// the nav, and the pill appears. Scrolling back above that point flies it
// back to where the hero name is.
//
// The two directions move differently, chosen when a flight sets off (a
// reversal part-way retraces the flight it interrupts):
// - Into the nav: one move, shrinking as it goes. It rides up with the page
//   (so the text below doesn't run into it), easing off before the nav line
//   rather than scroll up past it, and its size follows how far up it is,
//   so it never reaches the pill at full size. It slides across over the
//   flight's time, and while it would still cross the nav's links it eases
//   off below them instead, rising into the line once clear of them.
// - Back to the hero: it keeps the nav's size until it reaches the hero
//   name's place, and only then grows into it. It drops to the hero name's
//   line first and then travels across, below the photo, so it never
//   crosses the photo.
// Each part of the motion starts from rest, or moving with the page, and
// comes to rest, and the stages overlap a little, so nothing launches
// sideways at full speed or stops dead between stages.
// The name can wrap in the hero (phones) but not in the nav, so while it
// changes size the words also rearrange: each later word slides along to
// where it sits in the nav line (clear of the words before it), and rises
// into that line. A copy flies; the real hero and nav names hide while it
// does, and it renders identically to both at the ends, so the hand-overs
// are invisible. With reduced motion the nav name simply appears once the
// hero name has scrolled out of view.

const WORDS = text.name.split(" ");
const EDGE_MARGIN = 16; // the name never gets closer than this to the screen edges
const GAP = 24; // px below the nav at which the name flies up into it
// A whole flight each way; a reversal part-way takes its share. Long enough
// that the dock's 450px across a laptop screen peaks near 30px a frame (an
// ease-out over 360ms moved it 75px a frame, most of the way in four frames)
const DOCK_MS = 480;
const RETURN_MS = 640;
const FRAME_MS = 1000 / 60;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);
// Space kept between the docking name and the nav's first link (or button),
// where the nav itself leaves that much
const CONTROL_GAP = 12;
// Once clear of the links, it rises into the nav line over up to this many
// px of its travel across (the room left before its place in the nav): over
// less, at full speed, it would hop up in a frame
const CLEAR_EASE = 96;

// CSS's cubic-bezier(x1, y1, x2, y2), as a function of time (0 to 1)
const cubicBezier = (x1, y1, x2, y2) => {
  const at = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
};
// Starts from rest and settles gently
const glide = cubicBezier(0.3, 0, 0.4, 1);
// Leaves at speed, for the return's drop (see DROP)
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
// `ease` over the stretch of a flight's progress from a to b
const during = (p, a, b, ease = glide) => ease(clamp01((p - a) / (b - a)));
// The docking name's height above the nav line, given the hero name's (both
// as fractions of the height it set off at): the same while the hero name
// is above RIDE of it, then easing off exponentially, at the same height
// and speed at RIDE, so it never passes the nav line
const RIDE = 0.35;
const ride = (x) => (x >= RIDE ? x : RIDE * Math.exp((x - RIDE) / RIDE));

// The dock, as fractions of how far up the name is: its size settles ahead
// of it (DOCK_SIZE), so a name that wraps in the hero (phones) isn't still
// large as its top reaches the pill. On phones each later word also slides
// along, then rises into the nav line, the rise starting as the slide
// settles so the word never stops.
const DOCK_SIZE = [0, 0.6];
const DOCK_SLIDE = [0, 0.5];
const DOCK_RISE = [0.4, 0.9];
// The return, as fractions of its time, at the nav's size until the grow:
// a drop to the hero name's line (DROP), across (ACROSS), then the grow in
// place (GROW), which starts as the move across settles (within a few px).
// The drop alone leaves at speed, downward like the page it goes with: the
// page is usually still scrolling, bringing the photo down onto the nav
// name's line, and on a phone (no room beside the photo) a drop that started
// from rest would sit over it for a few frames. Growing, the words first drop
// into their lines (FALL), then slide apart (SPREAD), as fractions of the grow.
const DROP = [0, 0.25];
const ACROSS = [0.04, 0.7];
const GROW = [0.64, 1];
const FALL = [0, 0.55];
const SPREAD = [0.45, 1];

// Viewport rects of each word of an element's (single) text node
const wordRects = (element) => {
  const node = element.firstChild;
  const rects = [];
  let from = 0;
  WORDS.forEach((word) => {
    const start = node.textContent.indexOf(word, from);
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + word.length);
    rects.push(range.getBoundingClientRect());
    from = start + word.length;
  });
  return rects;
};

// `onStateChange({ pill, name })`: whether the nav pill, and the nav's own
// name, should show
function NameFlight({ heroNameRef, navNameRef, navBarRef, onStateChange }) {
  const wordRefs = useRef([]);

  useEffect(() => {
    const hero = heroNameRef.current;
    const nav = navNameRef.current;
    const bar = navBarRef.current;
    const scroller = document.getElementById("root");
    if (!hero || !nav || !bar || !scroller) return undefined;

    let reported = null;
    const report = (pill, name) => {
      if (reported && reported.pill === pill && reported.name === name) return;
      reported = { pill, name };
      onStateChange(reported);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const observer = new IntersectionObserver(([entry]) => report(!entry.isIntersecting, !entry.isIntersecting), {
        threshold: 0.5,
      });
      observer.observe(hero);
      return () => observer.disconnect();
    }

    let layout = null;
    let frame = 0;
    // The flight's progress, 0 (in the hero) to 1 (in the nav), and the
    // move under way: { mode, setOffY, from, to, startedAt, duration }
    let progress = 0;
    let tween = null;

    // The extent of the words at the given offsets from the first word (in
    // full-size units), and its centre
    const bounds = (xs, ys) => {
      const minX = Math.min(...xs);
      const maxX = Math.max(...layout.map((word, i) => xs[i] + word.width));
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys) + layout.glyphHeight;
      return { minX, maxX, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
    };

    const measure = () => {
      const scrollTop = scroller.scrollTop;
      const heroSize = parseFloat(getComputedStyle(hero).fontSize);
      const scale = parseFloat(getComputedStyle(nav).fontSize) / heroSize;
      // The hero's entrance slides it in; measure where it rests, not where
      // the slide happens to be
      const transform = getComputedStyle(hero).transform;
      const slide = transform === "none" ? { m41: 0, m42: 0 } : new DOMMatrixReadOnly(transform);
      const from = wordRects(hero).map((r) => ({
        left: r.left - slide.m41,
        top: r.top - slide.m42,
        width: r.width,
        height: r.height,
      }));
      const to = wordRects(nav);
      layout = wordRefs.current.map((el, i) => {
        // Where the copy's glyphs sit inside its own box, at full size
        el.style.fontSize = `${heroSize}px`;
        el.style.transform = "none";
        const box = el.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(el);
        const glyphs = range.getBoundingClientRect();
        return {
          el,
          offsetX: glyphs.left - box.left,
          offsetY: glyphs.top - box.top,
          width: from[i].width, // at full size
          startLeft: from[i].left,
          startTop: from[i].top + scrollTop, // in page coordinates
          endLeft: to[i].left,
          endTop: to[i].top,
        };
      });
      layout.scale = scale;
      layout.lineHeight = heroSize;
      // It flies once its first line comes this close to the nav
      const [first] = layout;
      layout.flyAtTop = bar.getBoundingClientRect().bottom + GAP;
      layout.flyAt = first.startTop - layout.flyAtTop; // scroll position
      // Each word's offset from the first, in full-size units: as laid out in
      // the hero, and as in the nav line
      for (const word of layout) {
        word.fromX = word.startLeft - first.startLeft;
        word.fromY = word.startTop - first.startTop;
        word.toX = (word.endLeft - first.endLeft) / scale;
      }
      layout.glyphHeight = from[0].height; // at full size
      // The hero name's centre, in page coordinates, and the nav name's, in
      // the viewport: the name travels between them, changing size around
      // its centre
      const block = bounds(layout.map((w) => w.fromX), layout.map((w) => w.fromY));
      layout.centerX = first.startLeft + block.centerX;
      layout.centerY = first.startTop + block.centerY;
      const line = bounds(layout.map((w) => w.toX), layout.map(() => 0));
      layout.navCenterX = first.endLeft + line.centerX * scale;
      layout.navCenterY = first.endTop + line.centerY * scale;
      layout.navHalfWidth = ((line.maxX - line.minX) * scale) / 2;
      // The nav's first link (or, on phones, button) after the name: the
      // docking name keeps below it until it's clear of it
      const control = nav.nextElementSibling && nav.nextElementSibling.firstElementChild;
      const dockedRight = layout.navCenterX + layout.navHalfWidth;
      layout.clearRight = Infinity;
      layout.clearEase = 1;
      layout.clearBelow = 0;
      if (control) {
        const range = document.createRange();
        range.selectNodeContents(control);
        const ink = range.getBoundingClientRect();
        // Its right edge, at the nav's size, clear of the link by the gap
        // (or half what the nav leaves, on narrow phones), and the room from
        // there to its place in the nav, which it rises over
        layout.clearRight = ink.left - Math.min(CONTROL_GAP, (ink.left - dockedRight) / 2);
        layout.clearEase = Math.min(CLEAR_EASE, layout.clearRight - dockedRight - 1);
        if (layout.clearEase > 0) {
          layout.clearBelow = ink.bottom - layout.navCenterY + CONTROL_GAP + (layout.glyphHeight * scale) / 2;
        }
      }
      // The lowest the small name's centre may ride up to: just under the bar
      layout.belowBar = bar.getBoundingClientRect().bottom + 4 + (to[0].height / 2);
      // Already past it (a reload part-way down): be there, without flying
      if (!tween) progress = scrollTop >= layout.flyAt ? 1 : 0;
      update();
    };

    // Where each word goes for the name's centre (in the viewport), scale
    // and arrangement (each word's offset from the first, in full-size
    // units): the scale, the offsets and the first word's glyph box
    // (top-left, in the viewport). Kept on screen while the words rearrange.
    const place = (centerX, centerY, scale, xs, ys) => {
      const b = bounds(xs, ys);
      const viewport = document.documentElement.clientWidth;
      const left = Math.max(
        EDGE_MARGIN - b.minX * scale,
        Math.min(centerX - b.centerX * scale, viewport - EDGE_MARGIN - b.maxX * scale),
      );
      return { scale, xs, ys, left, top: centerY - b.centerY * scale };
    };

    // For a given flight progress `e` (0 = hero, 1 = nav)
    const placeDock = (e) => {
      const navY = layout.navCenterY;
      const setOffAbove = Math.max(1, tween.setOffY - navY);
      const centerX = lerp(layout.centerX, layout.navCenterX, glide(e));
      // Kept below the nav's links until it's clear of them, then let up
      // into the line over the room left before its place
      const right = centerX + layout.navHalfWidth;
      const crossing = during(right, layout.clearRight - layout.clearEase, layout.clearRight, smoothstep);
      const floor = Math.min(setOffAbove / 2, layout.clearBelow * crossing);
      // Carried up with the page, easing off before that height, and drawn
      // into the nav over the flight's time. If the page heads back down
      // meanwhile, it heads back with it, to where the hero name is now.
      const heroAbove = layout.centerY - scroller.scrollTop - navY;
      const room = setOffAbove - floor;
      const centerY = navY + floor + room * ride((heroAbove - floor) / room) * (1 - glide(e));
      // How far up it is, which sets its size and arrangement
      const up = clamp01(1 - (centerY - navY) / setOffAbove);
      const slide = during(up, ...DOCK_SLIDE);
      const rise = during(up, ...DOCK_RISE);
      return place(
        centerX,
        centerY,
        lerp(1, layout.scale, during(up, ...DOCK_SIZE)),
        layout.map((word) => lerp(word.fromX, word.toX, slide)),
        layout.map((word) => lerp(word.fromY, 0, rise)),
      );
    };

    const placeReturn = (e) => {
      const r = 1 - e; // the return's own progress
      const grow = clamp01((r - GROW[0]) / (GROW[1] - GROW[0]));
      const fall = during(grow, ...FALL);
      const spread = during(grow, ...SPREAD);
      // To the hero name's centre, where it is now, so it lands exactly on
      // it (but never up into the pill, if the page heads back down)
      const heroY = Math.max(layout.belowBar, layout.centerY - scroller.scrollTop);
      return place(
        lerp(layout.navCenterX, layout.centerX, during(r, ...ACROSS)),
        lerp(layout.navCenterY, heroY, during(r, ...DROP, easeOutCubic)),
        lerp(layout.scale, 1, glide(grow)),
        layout.map((word) => lerp(word.toX, word.fromX, spread)),
        layout.map((word) => lerp(0, word.fromY, fall)),
      );
    };

    const render = () => {
      const e = progress;
      const flying = Boolean(tween) && e > 0 && e < 1;
      if (flying) {
        const { scale, xs, ys, left, top } = tween.mode === "dock" ? placeDock(e) : placeReturn(e);
        layout.forEach((word, i) => {
          const x = left + xs[i] * scale;
          const y = top + ys[i] * scale;
          word.el.style.transform =
            `translate(${x - word.offsetX * scale}px, ${y - word.offsetY * scale}px) scale(${scale})`;
        });
      }
      // Hand over in the same frame (React updates the nav name's state a
      // render later, which would leave the pill empty for a frame)
      for (const word of layout) word.el.style.visibility = flying ? "visible" : "hidden";
      hero.style.visibility = e > 0 ? "hidden" : "";
      nav.style.visibility = e === 1 ? "visible" : "hidden";
    };

    const step = (now) => {
      frame = 0;
      if (!layout) return;
      if (tween) {
        const t = Math.max(0, Math.min(1, (now - tween.startedAt) / tween.duration));
        // Linear in time: each stage eases itself, so a reversal part-way
        // carries on smoothly from wherever the name is
        progress = lerp(tween.from, tween.to, t);
        // It sets off from where the hero name is on the first frame it
        // flies: the page has usually scrolled on since the scroll that
        // started it, and its size counts from there
        if (tween.setOffY === null && progress > 0) tween.setOffY = layout.centerY - scroller.scrollTop;
        if (t >= 1) tween = null;
      }
      render();
      // The pill shows from the moment the name sets off for the nav, and
      // clears the moment it sets off back; the nav's own name shows once
      // the copy has landed in it
      const target = tween ? tween.to : progress;
      report(target === 1, progress === 1);
      if (tween) frame = requestAnimationFrame(step);
    };

    const update = () => {
      if (!layout) return;
      const s = scroller.scrollTop;
      const target = s >= layout.flyAt ? 1 : 0;
      const heading = tween ? tween.to : progress;
      // A jump that has already taken the hero name off screen: be there
      const [first] = layout;
      const offScreen = first.startTop - s + layout.lineHeight < 0;
      if (target === 1 && progress === 0 && offScreen) {
        tween = null;
        progress = 1;
      } else if (target !== heading) {
        // A reversal part-way retraces the flight it interrupts
        const mode = tween ? tween.mode : target === 1 ? "dock" : "return";
        tween = {
          mode,
          // The hero name's centre (in the viewport) when it set off (set on
          // its first frame)
          setOffY: tween ? tween.setOffY : null,
          from: progress,
          to: target,
          // As if a frame ago: the scroll that starts it is already on
          // screen in the next frame, and a frame spent at rest would leave
          // the name behind the page (on its way back, over the photo)
          startedAt: performance.now() - FRAME_MS,
          duration: (mode === "dock" ? DOCK_MS : RETURN_MS) * Math.abs(target - progress),
        };
      }
      if (!frame) frame = requestAnimationFrame(step);
    };

    let measureTimer = 0;
    const remeasure = () => {
      clearTimeout(measureTimer);
      measureTimer = setTimeout(measure, 100);
    };

    // Measure once fonts are in and the hero's entrance has settled
    document.fonts.ready.then(() => {
      measureTimer = setTimeout(measure, 900);
    });
    scroller.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(remeasure);
    resize.observe(hero);
    resize.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", update);
      resize.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(measureTimer);
      hero.style.visibility = "";
      nav.style.visibility = "";
    };
  }, [heroNameRef, navNameRef, navBarRef, onStateChange]);

  return (
    <div className={styles.flight} aria-hidden>
      {WORDS.map((word, i) => (
        <span key={word} ref={(el) => (wordRefs.current[i] = el)} className={styles.word}>
          {word}
        </span>
      ))}
    </div>
  );
}

export default memo(NameFlight);
