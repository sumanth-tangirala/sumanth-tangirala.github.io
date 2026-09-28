// The hero content as axis-aligned rectangles in hero-local px, inflated by
// `margin`: tight boxes around what is drawn (each line of text, and boxes
// for everything else). Elements opt in with data-planner-obstacle.
export const measureObstacles = (hero, margin) => {
  const origin = hero.getBoundingClientRect();
  const rects = [];
  hero.querySelectorAll("[data-planner-obstacle]").forEach((el) => {
    if (el.dataset.plannerObstacle === "text") {
      const range = document.createRange();
      range.selectNodeContents(el);
      rects.push(...range.getClientRects());
    } else {
      rects.push(el.getBoundingClientRect());
    }
  });
  return rects
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({
      left: r.left - origin.left - margin,
      right: r.right - origin.left + margin,
      top: r.top - origin.top - margin,
      bottom: r.bottom - origin.top + margin,
    }));
};
