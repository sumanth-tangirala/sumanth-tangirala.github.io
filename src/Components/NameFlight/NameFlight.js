import React, { memo, useEffect, useRef } from "react";
import text from "text";
import styles from "./nameFlight.module.scss";

// Moves the hero's name into the nav pill. The name scrolls with the page
// like any text until it comes within GAP px of the nav; then it flies into
// the nav in one quick move, and the pill appears. Scrolling back above that
// point flies it back to where the hero name is. The name can wrap in the
// hero (phones) but not in the nav, so the words move as a shrinking block:
// first each later word slides along to where it sits in the nav line (clear
// of the words before it, at any size), then it rises into that line. On
// one line there is nothing to rearrange. A copy flies; the real hero and
// nav names hide while it does, and it renders identically to both at the
// ends, so the hand-overs are invisible. With reduced motion the nav name
// simply appears once the hero name has scrolled out of view.

const WORDS = text.name.split(" ");
const EDGE_MARGIN = 16; // the name never gets closer than this to the screen edges
const GAP = 24; // px below the nav at which the name flies up into it
const FLIGHT_MS = 360; // a whole flight; a reversal part-way takes its share
const smoothstep = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) ** 3;
// Stages of the rearrangement, as fractions of the flight: slide, then rise
const SLIDE_END = 0.55;
const between = (p, a, b) => smoothstep(Math.min(1, Math.max(0, (p - a) / (b - a))));
const lerp = (a, b, t) => a + (b - a) * t;

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
    // move under way: { from, to, startedAt, duration }
    let progress = 0;
    let tween = null;

    const measure = () => {
      const scrollTop = scroller.scrollTop;
      const heroSize = parseFloat(getComputedStyle(hero).fontSize);
      const scale = parseFloat(getComputedStyle(nav).fontSize) / heroSize;
      // The hero's entrance slides it in; measure where it rests, not where
      // the slide happens to be
      const transform = getComputedStyle(hero).transform;
      const slide = transform === "none" ? { m41: 0, m42: 0 } : new DOMMatrixReadOnly(transform);
      const from = wordRects(hero).map((r) => ({ left: r.left - slide.m41, top: r.top - slide.m42, width: r.width }));
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
      // Already past it (a reload part-way down): be there, without flying
      if (!tween) progress = scrollTop >= layout.flyAt ? 1 : 0;
      update();
    };

    const render = () => {
      const e = progress;
      const s = scroller.scrollTop;
      const scale = lerp(1, layout.scale, e);
      const slide = between(e, 0, SLIDE_END);
      const rise = between(e, SLIDE_END, 1);
      const [first] = layout;
      const offsets = layout.map((word) => lerp(word.fromX, word.toX, slide));
      // Keep the whole name on screen while the words rearrange
      const leftmost = Math.min(...offsets);
      const rightmost = Math.max(...layout.map((word, i) => offsets[i] + word.width));
      const viewport = document.documentElement.clientWidth;
      const leftOfFirst = Math.max(
        EDGE_MARGIN - leftmost * scale,
        Math.min(lerp(first.startLeft, first.endLeft, e), viewport - EDGE_MARGIN - rightmost * scale),
      );
      // Up from where the hero name was when it set off; back down to where
      // the hero name is now, so it lands exactly on it
      const from = tween && tween.to === 1 ? tween.fromScroll : s;
      const heroTop = first.startTop - from;
      const topOfFirst = lerp(heroTop, first.endTop, e);
      layout.forEach((word, i) => {
        const left = leftOfFirst + offsets[i] * scale;
        const top = topOfFirst + lerp(word.fromY, 0, rise) * scale;
        word.el.style.transform =
          `translate(${left - word.offsetX * scale}px, ${top - word.offsetY * scale}px) scale(${scale})`;
      });
      // Hand over in the same frame (React updates the nav name's state a
      // render later, which would leave the pill empty for a frame)
      const flying = e > 0 && e < 1;
      for (const word of layout) word.el.style.visibility = flying ? "visible" : "hidden";
      hero.style.visibility = e > 0 ? "hidden" : "";
      nav.style.visibility = e === 1 ? "visible" : "hidden";
    };

    const step = (now) => {
      frame = 0;
      if (!layout) return;
      if (tween) {
        // (a frame's timestamp can predate the scroll that started the move)
        const t = Math.max(0, Math.min(1, (now - tween.startedAt) / tween.duration));
        progress = lerp(tween.from, tween.to, easeOut(t));
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
        tween = {
          from: progress,
          to: target,
          fromScroll: s,
          startedAt: performance.now(),
          duration: FLIGHT_MS * Math.abs(target - progress),
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
