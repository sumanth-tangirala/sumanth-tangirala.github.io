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
// - Into the nav: one quick move, shrinking as it goes, from where the hero
//   name was when it set off. It waits there rather than scroll up into the
//   pill at full size, and leaves at once.
// - Back to the hero: it keeps the nav's size until it reaches the hero
//   name's place, and only then grows into it. It drops to the hero name's
//   line first and then travels across, below the photo, so it never
//   crosses the photo.
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
// A whole flight each way; a reversal part-way takes its share
const DOCK_MS = 360;
const RETURN_MS = 520;
const smoothstep = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - (1 - t) ** 3;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const between = (p, a, b) => smoothstep(clamp01((p - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;
// The return, as fractions of the flight's progress (0 = hero, 1 = nav), so
// read from 1 down: a quick drop to the hero name's line (the first DROP of
// it), then across (ACROSS), both at the nav's size, then grow in place
// (GROW). The drop is quick because the page is usually still scrolling: a
// slow one would trail above the hero name, over the photo, which on a phone
// leaves no room beside it. Growing, the words first drop into their lines
// (RISE), then slide apart (SLIDE).
const DROP = 0.15;
const ACROSS = [0.4, 0.9];
const GROW = [0, 0.4];
const SLIDE = [0, 0.22];
const RISE = [0.18, 0.4];
// The dock, as fractions of its eased progress: the words slide along, then
// rise into the nav line, while the name shrinks a little ahead of the move
const DOCK_SLIDE = [0, 0.55];
const DOCK_RISE = [0.55, 1];
const DOCK_SIZE = [0, 0.7];

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
    // move under way: { mode, setOffTop, from, to, startedAt, duration }
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
      // The hero name's centre, in page coordinates: the shrink happens
      // around it, and the small name travels to and from it
      const block = bounds(layout.map((w) => w.fromX), layout.map((w) => w.fromY));
      layout.centerX = first.startLeft + block.centerX;
      layout.centerY = first.startTop + block.centerY;
      // The lowest the small name's centre may ride up to: just under the bar
      layout.belowBar = bar.getBoundingClientRect().bottom + 4 + (to[0].height / 2);
      // Already past it (a reload part-way down): be there, without flying
      if (!tween) progress = scrollTop >= layout.flyAt ? 1 : 0;
      update();
    };

    // Where each word goes for a given flight progress `e`: the scale, each
    // word's offset from the first (in full-size units) and the first word's
    // glyph box (top-left, in the viewport)
    const placeDock = (e) => {
      const [first] = layout;
      const q = easeOut(e);
      const scale = lerp(1, layout.scale, between(q, ...DOCK_SIZE));
      const slide = between(q, ...DOCK_SLIDE);
      const rise = between(q, ...DOCK_RISE);
      const xs = layout.map((word) => lerp(word.fromX, word.toX, slide));
      const ys = layout.map((word) => lerp(word.fromY, 0, rise));
      const b = bounds(xs, ys);
      const viewport = document.documentElement.clientWidth;
      // Kept on screen while the words rearrange
      const left = Math.max(
        EDGE_MARGIN - b.minX * scale,
        Math.min(lerp(first.startLeft, first.endLeft, q), viewport - EDGE_MARGIN - b.maxX * scale),
      );
      // From where the hero name was when it set off (it waits there rather
      // than scroll up into the pill at full size); if the page heads back
      // down meanwhile, from where the hero name is now
      const heroTop = Math.max(tween.setOffTop, first.startTop - scroller.scrollTop);
      return { scale, xs, ys, left, top: lerp(heroTop, first.endTop, q) };
    };

    const placeReturn = (e) => {
      const [first] = layout;
      // Around the hero name's centre, where it is now, so it lands exactly
      // on it (but never up into the pill, if the page heads back down)
      const centerX = layout.centerX;
      const centerY = Math.max(layout.belowBar, layout.centerY - scroller.scrollTop);
      const grow = between(e, ...GROW); // 0 at full size, 1 at the nav's
      const scale = lerp(1, layout.scale, grow);
      const slide = between(e, ...SLIDE);
      const rise = between(e, ...RISE);
      const xs = layout.map((word) => lerp(word.fromX, word.toX, slide));
      const ys = layout.map((word) => lerp(word.fromY, 0, rise));
      const b = bounds(xs, ys);
      const viewport = document.documentElement.clientWidth;
      const left = Math.max(
        EDGE_MARGIN - b.minX * scale,
        Math.min(centerX - b.centerX * scale, viewport - EDGE_MARGIN - b.maxX * scale),
      );
      const top = centerY - b.centerY * scale;
      // From there to the nav: down/up and across at the nav's size
      return {
        scale,
        xs,
        ys,
        left: lerp(left, first.endLeft, between(e, ...ACROSS)),
        top: lerp(top, first.endTop, 1 - easeOut(clamp01((1 - e) / DROP))),
      };
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
        // (a frame's timestamp can predate the scroll that started the move)
        const t = Math.max(0, Math.min(1, (now - tween.startedAt) / tween.duration));
        // Linear in time: each stage eases itself, so a reversal part-way
        // carries on smoothly from wherever the name is
        progress = lerp(tween.from, tween.to, t);
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
          setOffTop: tween ? tween.setOffTop : first.startTop - s,
          from: progress,
          to: target,
          startedAt: performance.now(),
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
