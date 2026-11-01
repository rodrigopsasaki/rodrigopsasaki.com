// Shared model for the embedding walkthrough: the drink table, the camera, the
// fit, and the vector math. Pure and DOM-free, with erasable syntax only, so the
// live pieces and the two Node scripts import the exact same numbers and the
// static plates can never disagree with the interactive figures.

export type DrinkId =
  | 'orange-juice'
  | 'lemon-juice'
  | 'first-coffee'
  | 'new-coffee'
  | 'latte'
  | 'hazelnut-latte';

export type SpriteId = 'orange-juice' | 'lemon-juice' | 'black-coffee' | 'latte' | 'hazelnut-latte';

export type CupId = 'gentle' | 'pronounced' | 'citrus-led';

// A taste address: sweetness, nuttiness, citrus brightness, each 0 to 1.
export type Taste = { s: number; n: number; c: number };

export type Drink = Taste & { label: string; sprite: SpriteId };

// One table for every piece, every static plate and the prose.
export const DRINKS: Record<DrinkId, Drink> = {
  'orange-juice': { label: 'orange juice', s: 0.8, n: 0, c: 0.7, sprite: 'orange-juice' },
  'lemon-juice': { label: 'lemon juice', s: 0.1, n: 0, c: 0.9, sprite: 'lemon-juice' },
  'first-coffee': { label: 'black coffee', s: 0.1, n: 0.6, c: 0.1, sprite: 'black-coffee' },
  // Same painted sprite as the first coffee until a citrus-coffee sprite exists.
  'new-coffee': { label: 'new coffee', s: 0.1, n: 0.6, c: 0.6, sprite: 'black-coffee' },
  latte: { label: 'latte', s: 0.4, n: 0.4, c: 0, sprite: 'latte' },
  'hazelnut-latte': { label: 'hazelnut latte', s: 0.6, n: 0.9, c: 0, sprite: 'hazelnut-latte' },
};

// Piece 3: three cups compared by straight-line distance and by direction.
export const CUPS: Record<CupId, Taste> = {
  gentle: { s: 0.1, n: 0.3, c: 0.3 },
  pronounced: { s: 0.2, n: 0.6, c: 0.6 },
  'citrus-led': { s: 0.1, n: 0.2, c: 0.6 },
};

// Piece 1: the new coffee starts on the first coffee, and every promise has a
// tolerance. home and tolerance make it impossible to keep all three promises.
export const PLACEMENT = {
  start: { s: 0.1, n: 0.6 },
  home: 0.05,
  tolerance: 0.03,
  trySpacing: 0.1,
  lemonReferenceDistance: 0.6,
} as const;

export const CAST: Record<SpriteId, string> = {
  'orange-juice': '/images/embedding-walkthrough/cast/orange-juice.png',
  'lemon-juice': '/images/embedding-walkthrough/cast/lemon-juice.png',
  'black-coffee': '/images/embedding-walkthrough/cast/black-coffee.png',
  latte: '/images/embedding-walkthrough/cast/latte.png',
  'hazelnut-latte': '/images/embedding-walkthrough/cast/hazelnut-latte.png',
};

// kN and kC say how much nuttiness and citrus the camera shows (0 collapses the
// axis). yaw and pitch are radians. Flat page: pitch 90 degrees looks straight down.
export type Camera = { kN: number; kC: number; yaw: number; pitch: number };

const radians = (degrees: number): number => (degrees * Math.PI) / 180;

export const FLAT: Camera = { kN: 1, kC: 0, yaw: 0, pitch: radians(90) };
export const ROOM: Camera = { kN: 1, kC: 1, yaw: radians(35), pitch: radians(30) };
// Piece 3 opens turned further: at 35 degrees the citrus-led arrow lies on top of the
// citrus axis, and from about 60 degrees on the two separate.
export const CUPS_YAW = radians(62);

export type Layout = 'wide' | 'compact';

// Scale K and the offsets cx, cy are fixed per layout and never change during
// motion. Every piece of a layout shares them, so a drink stands on the same
// pixel in each. What differs per piece is the window onto that drawing: the
// viewBox runs from y = top for height units and crops the headroom a piece
// never uses.
export type Fit = { K: number; cx: number; cy: number; width: number; top: number; height: number };

export type Projected = { x: number; y: number; depth: number };

// Larger depth means farther away: draw those first.
export function project(p: Taste, cam: Camera, fit: Fit): Projected {
  const s = p.s - 0.5;
  const n = cam.kN * p.n - 0.5;
  const cosYaw = Math.cos(cam.yaw);
  const sinYaw = Math.sin(cam.yaw);
  const right = s * cosYaw - n * sinYaw;
  const back = s * sinYaw + n * cosYaw;
  const lift = cam.kC * p.c;
  const sinPitch = Math.sin(cam.pitch);
  const cosPitch = Math.cos(cam.pitch);
  return {
    x: fit.cx + fit.K * right,
    y: fit.cy - fit.K * (back * sinPitch + lift * cosPitch),
    depth: back * cosPitch - lift * sinPitch,
  };
}

const WIDTH: Record<Layout, number> = { wide: 740, compact: 440 };
const SPRITE_HEIGHT: Record<Layout, number> = { wide: 64, compact: 48 };
// Piece 3's cups stand smaller than the drinks of pieces 1 and 2.
const CUP_SPRITE_HEIGHT: Record<Layout, number> = { wide: 48, compact: 40 };
const LABEL_BAND: Record<Layout, number> = { wide: 36, compact: 40 };
// Below the flat page: the names under the bottom row, the axis name and a bracket tag.
const PAGE_BOTTOM: Record<Layout, number> = { wide: 84, compact: 92 };
const PAGE_TOP = 16;
// The tallest stage, in user units, that the journey may need. A stage this tall
// renders about 520 CSS px high in the article column, so it fits a screen beside its controls.
const MAX_HEIGHT = 590;
const EDGE_MARGIN = 24;
// A floor corner or an axis tip carries no sprite, only an arrowhead.
const TIP_MARGIN = 12;
const TAG_GAP = 8;

export const layoutWidth = (layout: Layout): number => WIDTH[layout];
export const spriteHeight = (layout: Layout): number => SPRITE_HEIGHT[layout];
export const cupSpriteHeight = (layout: Layout): number => CUP_SPRITE_HEIGHT[layout];

// The cameras a piece can reach, which decide how much of the drawing it needs.
//   page:    the flat page (piece 1)
//   journey: the line, the page, the tilt and the room turned 10 to 80 degrees (piece 2)
// Piece 3 turns the room the same way but frames only its cups: fitCups.
export type Reach = 'page' | 'journey';

const FLOOR_CORNERS: readonly Taste[] = [
  { s: 0, n: 0, c: 0 },
  { s: 1, n: 0, c: 0 },
  { s: 0, n: 1, c: 0 },
  { s: 1, n: 1, c: 0 },
];
const AXIS_TIPS: readonly Taste[] = [
  { s: 1, n: 0, c: 0 },
  { s: 0, n: 1, c: 0 },
  { s: 0, n: 0, c: 1 },
];

// The room turned anywhere a reader can turn it, one camera per degree.
const roomCameras = (): Camera[] =>
  Array.from({ length: 71 }, (_, i) => ({ ...ROOM, yaw: radians(10 + i) }));

// The line, the page, the tilt between them, and the room before and after the
// drinks climb.
function journeyCameras(): Camera[] {
  const cams: Camera[] = [FLAT, { ...FLAT, kN: 0 }];
  for (let i = 1; i <= 20; i += 1) {
    const tilt = i / 20;
    cams.push({
      kN: 1,
      kC: 0,
      yaw: ROOM.yaw * tilt,
      pitch: FLAT.pitch + (ROOM.pitch - FLAT.pitch) * tilt,
    });
  }
  for (const cam of roomCameras()) cams.push({ ...cam, kC: 0 }, cam);
  return cams;
}

type Extent = { minX: number; maxX: number; minY: number; maxY: number };

// The bounding box of some taste points seen through some cameras, at K = 1.
function extent(points: readonly Taste[], cams: readonly Camera[]): Extent {
  const unit: Fit = { K: 1, cx: 0, cy: 0, width: 0, top: 0, height: 0 };
  const box: Extent = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const cam of cams) {
    for (const p of points) {
      const { x, y } = project(p, cam, unit);
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y);
      box.maxY = Math.max(box.maxY, y);
    }
  }
  return box;
}

const DRINK_POINTS: readonly Taste[] = Object.values(DRINKS);
const round3 = (v: number): number => Math.round(v * 1000) / 1000;

// Deterministic fit, a pure function of constants. K, cx and cy come from the
// journey: K is the larger scale at which its widest frame (the floor turned 45
// degrees) still fits the width and its tallest frame fits MAX_HEIGHT. Each
// reach then takes its own window: the bounding box of what that piece draws,
// plus margin.
//
// Margins:
//   horizontal: 24 + half a sprite on each side of a drink (sprites are centered
//               on the dot), and only 12 past a floor corner or an axis tip, where
//               no sprite stands. The wide stage is bound by its height either way;
//               the compact one is bound by its width, so this lets its room grow.
//   top:        24 + a full sprite + 8 for a tag (sprites stand above the dot)
//   bottom:     24 + a label band (36 wide, 40 compact: two 12px lines at worst)
// The journey's window keeps only 12 above its highest sprite (the orange juice
// in the room turned to 80 degrees): nothing is ever tagged above it. Its bottom
// keeps the full band, which the line (t = 0) fills with three stacked names.
// The flat page crops tighter: its tallest sprite is the hazelnut latte, and the
// names, the axis name and a bracket tag hang below the bottom row.
// K is floored and the offsets rounded to 3 decimals so every run, in the browser
// or in Node, prints the same bytes.
export function fitFor(layout: Layout, reach: Reach = 'journey'): Fit {
  const width = WIDTH[layout];
  const sprite = SPRITE_HEIGHT[layout];
  const marginX = EDGE_MARGIN + sprite / 2;
  const marginTop = EDGE_MARGIN + sprite + TAG_GAP;
  const cams = journeyCameras();
  const journey = extent([...FLOOR_CORNERS, ...AXIS_TIPS, ...DRINK_POINTS], cams);
  const drinks = extent(DRINK_POINTS, cams);
  const marginBottom = EDGE_MARGIN + LABEL_BAND[layout];
  const middle = (journey.minX + journey.maxX) / 2;
  const byWidth = Math.min(
    (width - 2 * TIP_MARGIN) / (journey.maxX - journey.minX),
    (width / 2 - marginX) / Math.max(middle - drinks.minX, drinks.maxX - middle)
  );
  const byHeight = (MAX_HEIGHT - marginTop - marginBottom) / (journey.maxY - journey.minY);
  const K = Math.floor(Math.min(byWidth, byHeight) * 1000) / 1000;
  const cx = round3(width / 2 - K * middle);
  const cy = round3(marginTop - K * journey.minY);

  let top = cy + K * journey.minY - sprite - TIP_MARGIN;
  let bottom = cy + K * journey.maxY + marginBottom;
  if (reach === 'page') {
    const corners = extent(FLOOR_CORNERS, [FLAT]);
    const drinks = extent(DRINK_POINTS, [FLAT]);
    top = Math.min(cy + K * corners.minY, cy + K * drinks.minY - sprite) - PAGE_TOP;
    bottom = cy + K * corners.maxY + PAGE_BOTTOM[layout];
  }
  const windowTop = Math.floor(top);
  return { K, cx, cy, width, top: windowTop, height: Math.ceil(bottom) - windowTop };
}

// How far piece 2 moves its drawing down once the page has lain back, so the
// room, turned anywhere, sits in the middle of the journey's window: the window
// is as tall as the page and the room together need, and the room alone, hung
// from its top, leaves an empty band under the floor.
export function roomDrop(fit: Fit, layout: Layout): number {
  const room = extent([...FLOOR_CORNERS, ...DRINK_POINTS], roomCameras());
  const top = fit.cy + fit.K * room.minY - SPRITE_HEIGHT[layout];
  const bottom = fit.cy + fit.K * room.maxY;
  return Math.max(0, fit.top + fit.height / 2 - (top + bottom) / 2);
}

// Piece 3 and plate 06 frame only this much of every axis: no cup scores above
// 0.6, so a frame sized for the whole cube draws the cups small.
export const CUPS_EXTENT = 0.65;

// The cast's cup sprite is painted from the bottom up: this share of its height
// is clear air above the cup, and may leave the frame before any paint does.
const CUP_AIR = 0.4;

// What piece 3 draws: the floor and the axes of the box from the origin to
// CUPS_EXTENT, and the three cups. Your cup at x2.00 and no lean is the
// pronounced cup, so the cups already hold that address.
const CUP_CORNERS: readonly Taste[] = [...FLOOR_CORNERS, { s: 0, n: 0, c: 1 }].map((p) => ({
  s: p.s * CUPS_EXTENT,
  n: p.n * CUPS_EXTENT,
  c: p.c * CUPS_EXTENT,
}));
const CUP_POINTS: readonly Taste[] = Object.values(CUPS);

// The highest a cup's dot may stand in piece 3's frame: the edge, the beam's
// label row, and the painted part of its sprite.
const cupLid = (layout: Layout): number =>
  EDGE_MARGIN + LABEL_BAND[layout] / 2 + (1 - CUP_AIR) * CUP_SPRITE_HEIGHT[layout];

// The fit for piece 3 and plate 06, which share it so the two agree in size and
// height. Unlike fitFor it has its own K, cx and cy: piece 3 is a scene of its
// own, and its cups need not stand on the pixels of pieces 1 and 2.
//
// Method: project what piece 3 draws through the room turned anywhere from 10 to
// 80 degrees, at K = 1. K is the larger scale at which the widest turn fits the
// width (a floor corner keeps TIP_MARGIN, a cup half a sprite) and the tallest
// turn, from the highest cup's painted top to the lowest floor corner, fits
// MAX_HEIGHT. The wide layout comes out bound by height, the compact one by
// width. cx centers the union of every turn, so the room never slides off to one
// side. cy stands the highest cup at the opening yaw with its whole sprite, air
// included, under the edge and the beam's label row, so the piece opens with its
// cups at the top; turned elsewhere, or stretched, the piece eases the drawing
// down by cupsLift. Rounded like fitFor, so the browser and Node print the same
// bytes.
export function fitCups(layout: Layout): Fit {
  const width = WIDTH[layout];
  const sprite = CUP_SPRITE_HEIGHT[layout];
  const marginX = EDGE_MARGIN + sprite / 2;
  const lid = cupLid(layout);
  const rest = lid + CUP_AIR * sprite;
  const marginBottom = EDGE_MARGIN + LABEL_BAND[layout];
  const cams = roomCameras();
  const floor = extent(CUP_CORNERS, cams);
  const cups = extent(CUP_POINTS, cams);
  const opening = extent(CUP_POINTS, [{ ...ROOM, yaw: CUPS_YAW }]).minY;
  const tallest = Math.max(
    ...cams.map((cam) => extent(CUP_CORNERS, [cam]).maxY - extent(CUP_POINTS, [cam]).minY)
  );
  const byWidth = Math.min(
    (width - 2 * TIP_MARGIN) / (floor.maxX - floor.minX),
    (width - 2 * marginX) / (cups.maxX - cups.minX)
  );
  const byHeight = Math.min(
    (MAX_HEIGHT - lid - marginBottom) / tallest,
    (MAX_HEIGHT - rest - marginBottom) / (floor.maxY - opening)
  );
  const K = Math.floor(Math.min(byWidth, byHeight) * 1000) / 1000;
  const left = Math.min(K * floor.minX - TIP_MARGIN, K * cups.minX - marginX);
  const right = Math.max(K * floor.maxX + TIP_MARGIN, K * cups.maxX + marginX);
  const cx = round3((width - left - right) / 2);
  const cy = round3(rest - K * opening);
  const bottom = Math.max(lid + K * tallest, cy + K * floor.maxY) + marginBottom;
  return { K, cx, cy, width, top: 0, height: Math.ceil(bottom) };
}

// How far piece 3 must move its drawing down so the highest of these cups keeps
// its painted top in frame through this camera: turning the room or stretching
// your cup can carry a cup above the lid.
export function cupsLift(fit: Fit, layout: Layout, cam: Camera, cups: readonly Taste[]): number {
  const highest = Math.min(...cups.map((cup) => project(cup, cam, fit).y));
  return Math.max(0, cupLid(layout) - highest);
}

// A place a label may stand: the end of its text that sits at (x, y), and (x, y)
// itself, the baseline.
export type Anchor = 'start' | 'middle' | 'end';
export type Spot = { x: number; y: number; anchor: Anchor };

// The places a tag of the line from a to b may stand, best first: beside each
// distance along the line (fractions, best first) at each offset from it (CSS
// px, nearest first), on the side away from `other`, then the other side. A tag
// beside a steep line hangs from its anchor (text to the right or left of it),
// so it clears the line however long it is. u is user units per CSS px.
export function lineSpots(
  a: { x: number; y: number },
  b: { x: number; y: number },
  other: { x: number; y: number },
  u: number,
  offsets: readonly number[],
  alongs: readonly number[]
): Spot[] {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / length;
  const ny = (b.x - a.x) / length;
  const away = nx * (b.x - other.x) + ny * (b.y - other.y) < 0 ? -1 : 1;
  return offsets.flatMap((off) =>
    alongs.flatMap((along) =>
      [away, -away].map((side) => {
        const sx = side * nx;
        const anchor: Anchor = Math.abs(sx) < 0.5 ? 'middle' : sx > 0 ? 'start' : 'end';
        return {
          x: a.x + (b.x - a.x) * along + sx * off * u,
          y: a.y + (b.y - a.y) * along + side * ny * off * u + 4 * u,
          anchor,
        };
      })
    )
  );
}

export function distance(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function normalize(v: readonly number[]): number[] {
  const length = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  return length === 0 ? v.map(() => 0) : v.map((x) => x / length);
}

// Cosine of the angle between two vectors: 1 means the same direction.
export function cosine(a: readonly number[], b: readonly number[]): number {
  const na = normalize(a);
  const nb = normalize(b);
  return na.reduce((sum, x, i) => sum + x * nb[i], 0);
}

// Piece 4: the shape of src/data/embedding-toy.json, objects only (JSON arrays
// of numbers are inferred as number[], never as tuples). Groups and the words of
// each card are not stored; the file holds what the page replays.
export type ToyPoint = { x: number; y: number };

export type ToyCard = { id: string; text: string; short: string };

// One card's address over the whole run: entry n is its address after n examples.
export type ToyTrack = { id: string; xs: number[]; ys: number[] };

// Example n (1 to 36): the wanted pair, the unwanted card, and the card that
// moved although it was not in the example. Step 0 has none of them.
export type ToyStep = {
  pair: { a: string; b: string } | null;
  unwanted: string | null;
  movedAlong: { card: string; word: string; sharedWith: string } | null;
};

export type ToyUnseen = ToyCard & { at: ToyPoint };

// The fit of the cloud to a frame: user units per toy unit, and the offset.
export type ToyFit = { scale: number; ox: number; oy: number };

// The fit of the cloud to one layout, and the height of the stage it is fitted to.
export type ToyView = ToyFit & { height: number };

export type ToyData = {
  cards: ToyCard[];
  tracks: ToyTrack[];
  steps: ToyStep[];
  unseen: ToyUnseen[];
  views: Record<Layout, ToyView>;
};
