// The pixel look's art (./pixel.js draws it). Hand-drawn pixel art of the
// robot in a 3/4 overworld view, as an old RPG draws its characters: seen
// from above and in front, so you see the top of its drum, its lidar puck
// and the face on the drum's side.
//
// It is drawn in layers, so that one drum serves every facing and the light
// stays on the top left in all eight of them:
//   DRUM    the body: the drum, its top lit from the top left, the lidar
//           puck on top casting a little shadow to the lower right. It is
//           round, so it is the same whichever way the robot faces.
//   FACE    per facing: where the visor sits on the drum's band ("v").
//   WHEELS  per facing: the wheels, drawn under the drum, peeking out.
//           "w" and "W" are the tread's two bands, which swap as it rolls.
//   EYES    per facing: where the two eyes sit in the visor.
// Five facings are drawn (S, SE, E, NE, N); SW, W and NW are their mirror
// images. Only the face and wheels are mirrored, never the drum or its
// light.

// The colours, keyed by the letters in the grids
export const COLORS = {
  o: "#0c0b0a", // the outline, near black
  h: "#fdcf7a", // amber, lit
  a: "#fbb13c", // amber (the site's)
  s: "#c88327", // amber, in shade
  d: "#242228", // dark: visor, lidar, wheels
  k: "#3e3b43", // dark, lit: the treads' light band
  g: "#6f6a73", // the lidar's top, lit
  e: "#ffeed0", // the eyes (the site's cream)
  m: "#a89a84", // the eyes, shut (dimmer)
};

export const W = 16; // art px across
export const H = 16; // art px tall, each layer
// Where it stands (the pose), in art px from the top left of a layer
export const ANCHOR = { x: 8, y: 8 };

const DRUM = [
  ".....oooooo.....",
  "...oohhaaaaoo...",
  "..ohhaddddaaao..",
  ".ohaadggggdaaao.",
  ".oaaadddddssaao.",
  ".oaaaasssssaaso.",
  ".oassaaaaaassso.",
  ".oassssssssssso.",
  ".oassssssssssso.",
  ".oassssssssssso.",
  "..osssssssssso..",
  "...oossssssoo...",
  ".....oooooo.....",
  "................",
  "................",
  "................",
];

// Camouflaged as the tagline's bullet (on load): tucked into a ball the
// bullet's size and amber, its visor (v) only a slit across its front, so
// only its two eyes give it away. The pose is at the ball's middle.
export const CAMO = [
  "...oooo...",
  ".oohhaaoo.",
  ".ohhaaaao.",
  "ohaaaaaaao",
  "oaaaaaaaso",
  "oavvvvvvso",
  "oassssssso",
  ".osssssso.",
  ".oossssoo.",
  "...oooo...",
];
export const CAMO_EYES = [[3, 5], [6, 5]]; // one pixel each, in the slit

// The five facings drawn. `face` marks the visor, `wheels` the wheels,
// `eyes` the top pixel of each eye (two, or one where the other is out of
// sight).
const FACINGS = {
  S: {
    face: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "...vv......vv...",
      "...vvvvvvvvvv...",
      "...vvvvvvvvvv...",
      "...vvvvvvvvvv...",
      ".....vvvvvv.....",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    wheels: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      ".oooo......oooo.",
      ".owwo......owwo.",
      ".oWWo......oWWo.",
      ".owwo......owwo.",
      ".oooo......oooo.",
      "................",
      "................",
    ],
    eyes: [[5, 8], [10, 8]],
  },
  SE: {
    face: [
      "................",
      "................",
      "................",
      "................",
      "................",
      ".............v..",
      "...........vvv..",
      "......vvvvvvvv..",
      "......vvvvvvvv..",
      "......vvvvvvv...",
      "......vvvvv.....",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    wheels: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "...oooooo.......",
      "...oddddo.......",
      "...owWwWo.......",
      "....oooo........",
      "................",
    ],
    eyes: [[8, 8], [12, 7]],
  },
  E: {
    face: [
      "................",
      "................",
      "................",
      "................",
      "................",
      ".............v..",
      "...........vvv..",
      "..........vvvv..",
      "..........vvvv..",
      "..........vvv...",
      "..........v.....",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    wheels: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "....oooooooo....",
      "....oddddddo....",
"....owWwWwWo....",
      ".....oooooo.....",
      "................",
    ],
    eyes: [[12, 7]],
  },
  NE: {
    face: [
      "................",
      "................",
      "................",
      "................",
      "................",
      ".............v..",
      ".............v..",
      ".............v..",
      ".............v..",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    wheels: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      ".......oooooo...",
      ".......oddddo...",
      ".......owWwWo...",
      "........oooo....",
      "................",
    ],
    eyes: [],
  },
  N: {
    face: null,
    wheels: null, // as S
    eyes: [],
  },
};
FACINGS.N.wheels = FACINGS.S.wheels;

// The eyes' expressions: the pixels of one eye, from its top pixel, as
// [dx, dy, colour]. The right eye uses the same pixels mirrored, so a
// shape that leans (a wide eye, a line) leans outward on both sides.
export const EXPRESSIONS = {
  open: [[0, 0, "e"], [0, 1, "e"]],
  half: [[0, 1, "e"]],
  shut: [],
  happy: [[-1, 1, "e"], [-1, 0, "e"], [0, 0, "e"], [1, 0, "e"], [1, 1, "e"]], // ∩ ∩, eyes closed in a smile
  wide: [[-1, 0, "e"], [0, 0, "e"], [-1, 1, "e"], [0, 1, "e"]], // startled
  dizzy: [[-1, 0, "e"], [1, 0, "e"], [0, 1, "e"], [-1, 2, "e"], [1, 2, "e"]], // x x
  asleep: [[-1, 1, "m"], [0, 1, "m"]], // – –
};
// Confused is lopsided: a different shape for each eye
export const LOPSIDED = { left: [[0, 0, "e"], [0, 1, "e"]], right: [[0, 1, "e"]] };

const parse = (rows) => (rows ? rows.map((row) => row.split("")) : null);
const DRUM_PX = parse(DRUM);
const DRAWN = ["S", "SE", "E", "NE", "N"].map((name) => ({
  face: parse(FACINGS[name].face),
  wheels: parse(FACINGS[name].wheels),
  eyes: FACINGS[name].eyes,
}));
// The eight facings, from heading east (0) clockwise in screen space:
// which drawing, and whether mirrored
export const OCTANTS = [
  { drawn: 2, mirror: false }, // E
  { drawn: 1, mirror: false }, // SE
  { drawn: 0, mirror: false }, // S
  { drawn: 1, mirror: true }, // SW
  { drawn: 2, mirror: true }, // W
  { drawn: 3, mirror: true }, // NW
  { drawn: 4, mirror: false }, // N
  { drawn: 3, mirror: false }, // NE
];

// The lidar glint's path round the puck (searching): along its lit top,
// then back along its near side
export const LIDAR_GLINT = [[6, 3], [7, 3], [8, 3], [9, 3], [9, 4], [8, 4], [7, 4], [6, 4]];

// Room around a layer in the composed sprite: rows above for the bob, rows
// below for wheels that dangle
export const PAD_TOP = 1;
export const PAD_BOTTOM = 2;
export const OUT_W = W;
export const OUT_H = H + PAD_TOP + PAD_BOTTOM;

// Compose the sprite into `out` (OUT_W × OUT_H colour letters, "" for
// none). `o`: { octant 0–7, tread 0|1, bob (art px up), dangle (art px the
// wheels hang down), eyes (an EXPRESSIONS name or "confused"), look { x, y }
// (art px the eyes shift), lidar (−1, or which of the puck's eight glints) }
export const compose = (out, o) => {
  out.fill("");
  const { drawn, mirror } = OCTANTS[o.octant];
  const art = DRAWN[drawn];
  const put = (x, y, c) => {
    if (x >= 0 && x < OUT_W && y >= 0 && y < OUT_H) out[y * OUT_W + x] = c;
  };
  const mx = (x) => (mirror ? W - 1 - x : x);
  // Wheels first: the drum covers them
  if (art.wheels) {
    const y0 = PAD_TOP + o.dangle;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let c = art.wheels[y][x];
        if (c === ".") continue;
        if (c === "w") c = o.tread ? "k" : "d";
        else if (c === "W") c = o.tread ? "d" : "k";
        put(mx(x), y0 + y, c);
      }
    }
  }
  const y0 = PAD_TOP - o.bob;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = DRUM_PX[y][x];
      if (c !== ".") put(x, y0 + y, c);
    }
  }
  if (!art.face) return out;
  const visor = (x, y) => y >= 0 && y < H && x >= 0 && x < W && art.face[y][mx(x)] === "v";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (art.face[y][x] === "v") put(mx(x), y0 + y, "d");
    }
  }
  // The eyes: only ever inside the visor
  art.eyes.forEach(([ex, ey], i) => {
    const x0 = mx(ex) + o.look.x;
    const y1 = ey + o.look.y;
    // The eye on the right of the screen mirrors its shape outward
    const right = art.eyes.length === 1 ? !mirror : i === (mirror ? 0 : 1);
    let shape = EXPRESSIONS[o.eyes] || EXPRESSIONS.open;
    if (o.eyes === "confused") shape = right ? LOPSIDED.right : LOPSIDED.left;
    for (const [dx, dy, c] of shape) {
      const x = x0 + (right ? -dx : dx);
      const y = y1 + dy;
      if (visor(x, y)) put(x, y0 + y, c);
    }
  });
  // The lidar's glint
  if (o.lidar >= 0) {
    const g = LIDAR_GLINT[o.lidar % LIDAR_GLINT.length];
    put(g[0], y0 + g[1], "a");
  }
  return out;
};

// The pixel font for its "!", "?" and "z": "x" is ink, drawn in the page's
// text grey with a near-black outline around it
export const GLYPHS = {
  "!": ["xx", "xx", "xx", "..", "xx"],
  "?": [".xxx.", "x...x", "...x.", "..x..", ".....", "..x.."],
  z: ["xxxx", "..x.", ".x..", "xxxx"],
  zSmall: ["xxx", "..x", ".x.", "xxx"],
};
