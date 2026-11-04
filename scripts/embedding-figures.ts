// Writes every static plate of "From a Line to an Embedding" into
// public/images/embedding-walkthrough/. Run it on Node 24, which strips types
// natively (the repo itself stays on Node 20, and the outputs are committed):
//
//   mise exec node@24 -- pnpm figures:embedding
//
// The plates read the same drink table, cups and camera as the live pieces
// (src/scripts/embedding-walkthrough/model.ts), so a static plate can never
// disagree with its interactive twin. 03b, 04 and 06 are the no-JavaScript
// fallbacks of the three taste pieces. Every plate is written twice from one
// palette parameter: NAME.svg on the light card and NAME-dark.svg on the dark
// card, with identical geometry and height. Output is deterministic: no clocks,
// no randomness, coordinates rounded to 3 decimals, a fixed element order.

import { readFileSync, writeFileSync } from 'node:fs';
import {
  CAST,
  CUPS,
  CUPS_EXTENT,
  CUPS_YAW,
  DRINKS,
  FLAT,
  ROOM,
  cosine,
  distance,
  fitCups,
  fitFor,
  lineSpots,
  project,
  spriteHeight,
} from '../src/scripts/embedding-walkthrough/model.ts';
import type {
  Camera,
  CupId,
  DrinkId,
  Fit,
  Projected,
  Spot,
  SpriteId,
  Taste,
} from '../src/scripts/embedding-walkthrough/model.ts';

// ---------------------------------------------------------------------------
// Files

const PUBLIC = new URL('../public/', import.meta.url);
const OUT = new URL('images/embedding-walkthrough/', PUBLIC);

// ---------------------------------------------------------------------------
// Palette: the theme tokens as literals, because an SVG loaded through <img>
// cannot see the page's CSS variables. `paper` is the literal of --c-bg-card in
// src/styles/theme.css for each theme; the text, border and accent literals are
// the :root values for light and the .dark values for dark (the accents are the
// sRGB hex of their oklch tokens). Sprites are the same painted PNGs in both.

type Ink = {
  paper: string;
  text: string;
  secondary: string;
  muted: string;
  border: string;
  borderStrong: string;
  green: string;
  amber: string;
  blue: string;
  red: string;
};

const LIGHT: Ink = {
  paper: '#faf5eb',
  text: '#1a1814',
  secondary: '#5c584f',
  muted: '#948c7d',
  border: 'rgba(26,24,20,.12)',
  borderStrong: 'rgba(26,24,20,.22)',
  green: '#00722e',
  amber: '#a75d00',
  blue: '#0064a3',
  red: '#ba2b2e',
};

const DARK: Ink = {
  paper: '#1c1c20',
  text: '#e6e4df',
  secondary: '#9a9690',
  muted: '#5c5a55',
  border: 'rgba(230,228,223,.10)',
  borderStrong: 'rgba(230,228,223,.20)',
  green: '#6fd087',
  amber: '#f3b94c',
  blue: '#64c4f0',
  red: '#f97770',
};

const VARIANTS: readonly { suffix: string; ink: Ink }[] = [
  { suffix: '', ink: LIGHT },
  { suffix: '-dark', ink: DARK },
];

const FONT = 'JetBrains Mono, ui-monospace, monospace';

// ---------------------------------------------------------------------------
// Tiny SVG writer

type Attrs = Readonly<Record<string, string | number | undefined>>;
type Point = { x: number; y: number };

const num = (v: number): string => String(Math.round(v * 1000) / 1000);

const escapeXml = (s: string): string =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function attrString(attrs: Attrs): string {
  return Object.entries(attrs)
    .map(([key, value]) => {
      if (value === undefined) return '';
      return ` ${key}="${typeof value === 'number' ? num(value) : escapeXml(value)}"`;
    })
    .join('');
}

const el = (name: string, attrs: Attrs, inner?: string): string =>
  inner === undefined
    ? `<${name}${attrString(attrs)}/>`
    : `<${name}${attrString(attrs)}>${inner}</${name}>`;

const line = (a: Point, b: Point, attrs: Attrs): string =>
  el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...attrs });

const circle = (c: Point, r: number, attrs: Attrs): string =>
  el('circle', { cx: c.x, cy: c.y, r, ...attrs });

type TextOptions = {
  size: number;
  fill: string;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number;
  // Knocks the lines behind the text out with a paper-colored outline.
  halo?: boolean;
  // Degrees, turned around the text's own anchor point.
  rotate?: number;
};

function text(at: Point, content: string, o: TextOptions): string {
  return el(
    'text',
    {
      x: at.x,
      y: at.y,
      'font-size': o.size,
      fill: o.fill,
      'text-anchor': o.anchor,
      'font-weight': o.weight,
      class: o.halo ? 'h' : undefined,
      transform:
        o.rotate === undefined ? undefined : `rotate(${num(o.rotate)} ${num(at.x)} ${num(at.y)})`,
    },
    escapeXml(content)
  );
}

// A filled head at `to` and a shaft that stops inside it, so the line never
// pokes through the point.
function arrow(
  from: Point,
  to: Point,
  o: { color: string; width: number; head: number; dash?: string; opacity?: number }
): string {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;
  const base = { x: to.x - ux * o.head, y: to.y - uy * o.head };
  const half = o.head * 0.45;
  const left = { x: base.x - uy * half, y: base.y + ux * half };
  const right = { x: base.x + uy * half, y: base.y - ux * half };
  const shaftEnd = { x: to.x - ux * o.head * 0.8, y: to.y - uy * o.head * 0.8 };
  return [
    line(from, shaftEnd, {
      stroke: o.color,
      'stroke-width': o.width,
      'stroke-linecap': 'round',
      'stroke-dasharray': o.dash,
      opacity: o.opacity,
    }),
    el('polygon', {
      points: `${num(to.x)},${num(to.y)} ${num(left.x)},${num(left.y)} ${num(right.x)},${num(right.y)}`,
      fill: o.color,
      opacity: o.opacity,
    }),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Sprites: each painted PNG is embedded once per plate as a data URI inside
// <defs> and stood up with <use>. A missing cast file throws, which is the gate.

function spriteDefs(ids: readonly SpriteId[], size: number): string {
  return ids
    .map((id) => {
      const png = readFileSync(new URL(`.${CAST[id]}`, PUBLIC));
      return el('image', {
        id: `s-${id}`,
        href: `data:image/png;base64,${png.toString('base64')}`,
        x: -size / 2,
        y: -size,
        width: size,
        height: size,
      });
    })
    .join('\n');
}

const use = (id: SpriteId, at: Point, opacity?: number): string =>
  el('use', { href: `#s-${id}`, x: at.x, y: at.y, opacity });

// ---------------------------------------------------------------------------
// The label book: the live pieces' collision search, in plate units. Lines and
// sprites are claimed first, then each label takes the first of its spots that
// covers nothing, or the one that covers least.

const CHAR_WIDTH = 7.8; // JetBrains Mono at 13px

type Rect = { x0: number; x1: number; y0: number; y1: number };

const covered = (a: Rect, b: Rect): number =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) *
  Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

function boxOf(label: string, spot: Spot): Rect {
  const width = label.length * CHAR_WIDTH;
  const left = spot.anchor === 'start' ? spot.x : spot.anchor === 'end' ? spot.x - width : spot.x - width / 2;
  return { x0: left - 2, x1: left + width + 2, y0: spot.y - 11, y1: spot.y + 3 };
}

class Book {
  private readonly taken: Rect[] = [];

  avoid(rect: Rect): void {
    this.taken.push(rect);
  }

  avoidLine(a: Point, b: Point, pad = 4): void {
    const pieces = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12));
    for (let i = 0; i < pieces; i += 1) {
      const p = { x: a.x + ((b.x - a.x) * i) / pieces, y: a.y + ((b.y - a.y) * i) / pieces };
      const q = { x: a.x + ((b.x - a.x) * (i + 1)) / pieces, y: a.y + ((b.y - a.y) * (i + 1)) / pieces };
      this.taken.push({
        x0: Math.min(p.x, q.x) - pad,
        x1: Math.max(p.x, q.x) + pad,
        y0: Math.min(p.y, q.y) - pad,
        y1: Math.max(p.y, q.y) + pad,
      });
    }
  }

  // The label's own box is claimed, so the labels after it keep off, with `air`
  // more above and below it.
  put(label: string, spots: readonly Spot[], air = 0): Spot {
    const scored = spots.map((spot) => {
      const box = boxOf(label, spot);
      return { spot, box, area: this.taken.reduce((sum, t) => sum + covered(box, t), 0) };
    });
    const first = scored.at(0);
    if (!first) throw new Error(`no place to stand for "${label}"`);
    const best = scored.find((s) => s.area === 0) ?? scored.reduce((a, s) => (s.area < a.area ? s : a), first);
    this.taken.push({ ...best.box, y0: best.box.y0 - air, y1: best.box.y1 + air });
    return best.spot;
  }
}

// A sprite's painted cup, as the live pieces claim it.
const spriteBox = (at: Point, size: number): Rect => ({
  x0: at.x - 0.4 * size,
  x1: at.x + 0.4 * size,
  y0: at.y - size,
  y1: at.y,
});

// A drink's name stands under its dot, or beside its sprite at the middle of its
// height, or a row or two lower (and a little to either side).
function nameSpots(at: Point, size: number): Spot[] {
  const row = (drop: number): Spot[] => {
    const y = at.y + 18 + drop;
    return [
      { x: at.x, y, anchor: 'middle' },
      { x: at.x + 8, y, anchor: 'start' },
      { x: at.x - 8, y, anchor: 'end' },
    ];
  };
  const edge = 0.4 * size + 6;
  return [
    ...row(0),
    { x: at.x + edge, y: at.y - size / 2 + 4, anchor: 'start' },
    { x: at.x - edge, y: at.y - size / 2 + 4, anchor: 'end' },
    ...row(16),
    ...row(32),
  ];
}

const spotText = (label: string, spot: Spot, fill: string, extra: Partial<TextOptions> = {}): string =>
  text(spot, label, { size: 13, fill, anchor: spot.anchor, halo: true, ...extra });

// ---------------------------------------------------------------------------
// Plates

type Plate = {
  // The file's name without extension: NAME.svg is the light plate, NAME-dark.svg the dark one.
  file: string;
  header: string;
  title: string;
  desc: string;
  width: number;
  height: number;
  sprites: readonly SpriteId[];
  spriteSize: number;
  body: readonly string[];
};

// The alt text of every plate in the markdown, verbatim: each plate's <desc> is the same string
// (the light and dark files share it).
const ALT = {
  '02-sweetness-line':
    "How sweet is it? A horizontal line labeled sweetness, running from less at 0 to more at 1, with an arrow pointing toward more. Tick marks sit at 0, 0.1, 0.4, 0.6, 0.8 and 1. Illustrated drinks stand above the line, each with a short stem running down to its tick. Lemon juice and black coffee stand side by side at 0.1, their stems meeting at one point. The latte stands at 0.4, the hazelnut latte at 0.6 and the orange juice at 0.8.",
  '03-nuttiness-map':
    "A page with sweetness running across and nuttiness running up, each from 0 to 1. Lemon juice sits at sweetness 0.1 and nuttiness 0, with black coffee directly above it at nuttiness 0.6. Orange juice sits at sweetness 0.8 and nuttiness 0. The latte sits at sweetness 0.4 and nuttiness 0.4, a little below the black coffee. The hazelnut latte sits at sweetness 0.6 and nuttiness 0.9.",
  '03b-placement-experiment':
    "A trial on the existing sweetness-and-nuttiness map. The original coffee stays at its nutty address. The new coffee's previous position is ghosted there. A guide arrow moves the new coffee toward lemon juice by lowering its nuttiness score, keeping sweetness unchanged. It is closer to lemon juice, but the map now calls it less nutty even though tasting says the coffees are equally nutty.",
  '04-citrus-space':
    "The taste map as a room. The sweetness-and-nuttiness page has become the floor. Every drink stands on its old spot and rises by how citrusy it tastes. The two black coffees share one spot on the floor, but the new coffee rises much higher, nearer the lemon juice.",
  '04b-taste-shape':
    "The new coffee drawn twice as a taste shape. Left, three spokes for sweetness, nuttiness, and citrus brightness, scored 0.1, 0.6 and 0.6, joined into a triangle. Right, the same coffee with twelve spokes, the first three unchanged and nine more imagined questions, joined into an irregular blob.",
  '05-taste-profiles':
    "Three black coffees drawn as taste shapes on one set of three spokes for sweetness, nuttiness, and citrus brightness. Gentle: 0.1, 0.3 and 0.3. Pronounced: 0.2, 0.6 and 0.6. Citrus-led: 0.1, 0.2 and 0.6. The pronounced outline is the gentle outline at twice the size; the citrus-led outline reaches farther along the citrus spoke.",
  '06-taste-directions':
    "A view of three-part taste addresses with arrows from one start. The gentle and pronounced coffee profiles point in exactly the same direction, with the pronounced profile's arrow twice as long. The citrus-led profile points in a different direction. Small equal-sized coffee cups identify the destinations. Measured by straight-line nearness, the citrus-led cup is closer to the gentle one.",
} as const;

function render(p: Plate, variant: { suffix: string; ink: Ink }): string {
  const { ink, suffix } = variant;
  const svg = el(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: p.width,
      height: p.height,
      viewBox: `0 0 ${p.width} ${p.height}`,
      role: 'img',
      'aria-labelledby': 'title desc',
      'font-family': FONT,
    },
    [
      el('title', { id: 'title' }, escapeXml(p.title)),
      el('desc', { id: 'desc' }, escapeXml(p.desc)),
      el(
        'defs',
        {},
        [
          el(
            'style',
            {},
            `.h{stroke:${ink.paper};stroke-width:4;stroke-linejoin:round;paint-order:stroke}`
          ),
          spriteDefs(p.sprites, p.spriteSize),
        ].join('\n')
      ),
      el('rect', { width: p.width, height: p.height, fill: ink.paper }),
      text({ x: 24, y: 34 }, p.header, { size: 13, fill: ink.secondary, weight: 700 }),
      ...p.body,
    ].join('\n')
  );
  writeFileSync(new URL(`${p.file}${suffix}.svg`, OUT), `${svg}\n`);
  return `${p.width}x${p.height}`;
}

// ---------------------------------------------------------------------------
// Scenes: the camera, projected. Used by 03, 03b, 04 and 06.

type Scene = { cam: Camera; fit: Fit };

const at = (sc: Scene, p: Taste): Projected => project(p, sc.cam, sc.fit);
const scaled = (t: Taste, k: number): Taste => ({ s: t.s * k, n: t.n * k, c: t.c * k });
const onFloor = (sc: Scene, p: Taste): Projected =>
  project({ s: p.s, n: p.n, c: 0 }, sc.cam, sc.fit);

// The 4x4 floor, on the page or in the room. `extent` shortens it to the framed
// box (plate 06 draws only as far as its cups can stand).
function floorGrid(sc: Scene, ink: Ink, extent = 1): string[] {
  const out: string[] = [];
  for (let i = 0; i <= 4; i += 1) {
    const t = (i / 4) * extent;
    const attrs = { stroke: ink.border, 'stroke-width': 1.2 };
    out.push(
      line(onFloor(sc, { s: t, n: 0, c: 0 }), onFloor(sc, { s: t, n: extent, c: 0 }), attrs)
    );
    out.push(
      line(onFloor(sc, { s: 0, n: t, c: 0 }), onFloor(sc, { s: extent, n: t, c: 0 }), attrs)
    );
  }
  return out;
}

// The axes as the live pieces draw them (drawAxes in stage.ts): an arrow from the
// start corner to the end of each axis, and names that run along the sweetness
// and nuttiness axes on the side away from the floor, with citrus brightness
// above its tip.
const AXIS_NAMES = [
  { end: { s: 1, n: 0, c: 0 }, name: 'sweetness', along: 0.5, offset: 30, color: 'secondary' },
  { end: { s: 0, n: 1, c: 0 }, name: 'nuttiness', along: 0.85, offset: 18, color: 'secondary' },
  { end: { s: 0, n: 0, c: 1 }, name: 'citrus brightness', along: 1, offset: 44, color: 'amber' },
] as const;

// The two lines every axis draws, claimed in a book before any name is placed.
function claimAxes(sc: Scene, book: Book, withCitrus: boolean, extent = 1): void {
  const origin = at(sc, { s: 0, n: 0, c: 0 });
  for (const spec of AXIS_NAMES.slice(0, withCitrus ? 3 : 2)) {
    book.avoidLine(origin, at(sc, scaled(spec.end, extent)));
  }
}

// The third axis name, placed through the book once the drinks have settled: above
// its arrowhead, or beside it, or a row higher.
function citrusName(sc: Scene, ink: Ink, book: Book, extent = 1): string {
  const spec = AXIS_NAMES[2];
  const end = at(sc, scaled(spec.end, extent));
  const above = end.y - (extent < 1 ? 10 : spec.offset);
  const spots: Spot[] = [
    { x: end.x, y: above, anchor: 'middle' },
    { x: end.x + 10, y: end.y + 4, anchor: 'start' },
    { x: end.x + 10, y: end.y - 14, anchor: 'start' },
    { x: end.x - 10, y: end.y + 4, anchor: 'end' },
    { x: end.x - 10, y: end.y - 14, anchor: 'end' },
    { x: end.x, y: above - 16, anchor: 'middle' },
  ];
  return spotText(spec.name, book.put(spec.name, spots), ink[spec.color]);
}

// `extent` stops every axis short of the unit cube, as plate 06 does. Given a book,
// the turned names claim their space in it, and the third name is left to
// citrusName, which the plate calls after the drinks.
function axes(sc: Scene, ink: Ink, withCitrus: boolean, extent = 1, book?: Book): string[] {
  const origin = at(sc, { s: 0, n: 0, c: 0 });
  const center = onFloor(sc, { s: 0.5, n: 0.5, c: 0 });
  const out: string[] = [];
  for (const spec of AXIS_NAMES.slice(0, withCitrus ? 3 : 2)) {
    const color = ink[spec.color];
    const end = at(sc, scaled(spec.end, extent));
    out.push(arrow(origin, end, { color, width: 2, head: 9 }));
    if (spec.name === 'citrus brightness') {
      if (!book) {
        out.push(
          text({ x: end.x, y: end.y - spec.offset }, spec.name, {
            size: 13,
            fill: color,
            anchor: 'middle',
            halo: true,
          })
        );
      }
      continue;
    }
    const mid = { x: origin.x + (end.x - origin.x) * spec.along, y: origin.y + (end.y - origin.y) * spec.along };
    const length = Math.hypot(end.x - origin.x, end.y - origin.y);
    let nx = -(end.y - origin.y) / length;
    let ny = (end.x - origin.x) / length;
    if (nx * (mid.x - center.x) + ny * (mid.y - center.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    let angle = (Math.atan2(end.y - origin.y, end.x - origin.x) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    const at2 = { x: mid.x + nx * spec.offset, y: mid.y + ny * spec.offset + 4 };
    if (book) {
      // The turned name claims the box that holds it.
      const w = spec.name.length * CHAR_WIDTH;
      const turn = (angle * Math.PI) / 180;
      const hw = (w * Math.abs(Math.cos(turn)) + 13 * Math.abs(Math.sin(turn))) / 2;
      const hh = (w * Math.abs(Math.sin(turn)) + 13 * Math.abs(Math.cos(turn))) / 2;
      book.avoid({ x0: at2.x - hw, x1: at2.x + hw, y0: at2.y - 4 - hh, y1: at2.y - 4 + hh });
    }
    out.push(text(at2, spec.name, { size: 13, fill: color, anchor: 'middle', rotate: angle }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// One drink standing on its dot

type Stand = {
  at: Point;
  depth: number;
  sprite: SpriteId;
  name: string;
  nameFill?: string;
  ring?: boolean;
  // The name never starts left of this x (keeps it off an axis line), nor ends
  // right of labelMax (keeps it off a neighbor's sprite).
  labelMin?: number;
  labelMax?: number;
  // Places for the name to try before the usual ones (a placing book only).
  nameTries?: readonly Spot[];
  // Where the name stands, instead of under the dot (without a placing book).
  nameAt?: Spot;
  // The sprite and its name slide this far sideways while the dot stays put
  // (drinks that share a spot spread apart, as they do in the live piece).
  dx?: number;
  // Rows below the first at which the name is written (names of one spot stack).
  row?: number;
  // The sprite is drawn this faint, with no dot.
  faint?: number;
  // A dashed ring round the sprite instead of the amber one.
  dashed?: boolean;
};

// The sprite, its dot and its rings.
function standBody(s: Stand, ink: Ink): string {
  const dx = s.dx ?? 0;
  const sprite: Point = { x: s.at.x + dx, y: s.at.y };
  return [
    use(s.sprite, sprite, s.faint),
    s.faint === undefined
      ? circle(s.at, 5, { fill: ink.text, stroke: ink.paper, 'stroke-width': 1.5 })
      : '',
    s.ring ? circle(s.at, 9, { fill: 'none', stroke: ink.amber, 'stroke-width': 2 }) : '',
    s.dashed
      ? circle({ x: sprite.x, y: sprite.y - SPRITE / 2 }, SPRITE / 2, {
          fill: 'none',
          stroke: ink.borderStrong,
          'stroke-width': 1.5,
          'stroke-dasharray': '4 4',
        })
      : '',
  ]
    .filter((part) => part !== '')
    .join('\n');
}

function standName(s: Stand, ink: Ink, labelMin: number | undefined): string {
  const x = s.at.x + (s.dx ?? 0);
  const y = s.at.y + 18 + (s.row ?? 0) * 16;
  const fill = s.nameFill ?? ink.secondary;
  if (s.nameAt) return spotText(s.name, s.nameAt, s.nameFill ?? ink.secondary);
  const half = (s.name.length * CHAR_WIDTH) / 2;
  return text(
    { x: Math.min(Math.max(x, (labelMin ?? -Infinity) + half), (s.labelMax ?? Infinity) - half), y },
    s.name,
    { size: 13, fill, anchor: 'middle', halo: true }
  );
}

// Every sprite first, then every name, so a name is never covered by the drink
// in front of it (the live pieces draw their names on top the same way). Given a
// book and the sprite size, the sprites are claimed first and each name takes the
// first spot that covers nothing.
function drawStands(
  stands: readonly Stand[],
  ink: Ink,
  labelMin?: number,
  placing?: { book: Book; size: number; air?: number }
): string[] {
  const bodies = stands.map((s) => standBody(s, ink));
  if (!placing) return [...bodies, ...stands.map((s) => standName(s, ink, labelMin))];
  for (const s of stands) placing.book.avoid(spriteBox(s.at, placing.size));
  const names = stands.map((s) =>
    spotText(
      s.name,
      placing.book.put(s.name, [...(s.nameTries ?? []), ...nameSpots(s.at, placing.size)], placing.air),
      s.nameFill ?? ink.secondary
    )
  );
  return [...bodies, ...names];
}

// Farthest first, so nearer drinks cover farther ones. On the flat page every
// depth ties, so the lower drink (larger y) goes on top.
function paintOrder(stands: readonly Stand[]): Stand[] {
  return [...stands].sort((a, b) =>
    Math.abs(a.depth - b.depth) > 1e-6 ? b.depth - a.depth : a.at.y - b.at.y
  );
}

function drinkStand(
  sc: Scene,
  id: DrinkId,
  extra: { name?: string; nameFill?: string; ring?: boolean } = {}
): Stand {
  const d = DRINKS[id];
  const p = at(sc, d);
  return { at: p, depth: p.depth, sprite: d.sprite, name: d.label, ...extra };
}

const SHADOW_RX = 15;
const SHADOW_RY = 5;

// A soft shadow on the floor and a dashed drop line up to the dot.
function dropLine(sc: Scene, ink: Ink, p: Taste): string[] {
  const floor = onFloor(sc, p);
  const top = at(sc, p);
  const out = [
    el('ellipse', { cx: floor.x, cy: floor.y, rx: SHADOW_RX, ry: SHADOW_RY, fill: ink.border }),
  ];
  if (Math.abs(top.y - floor.y) > 6) {
    out.push(
      line(floor, top, { stroke: ink.borderStrong, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' })
    );
  }
  return out;
}

// ---------------------------------------------------------------------------
// 02: the one-question line

function sweetnessLine(ink: Ink): Plate {
  const width = 740;
  const height = 480;
  const spriteSize = 104;
  const x0 = 56;
  const x1 = 684;
  const lineY = 372;
  const spriteBase = 236;
  const xOf = (sweetness: number): number => x0 + sweetness * (x1 - x0);

  const order: readonly DrinkId[] = [
    'lemon-juice',
    'first-coffee',
    'latte',
    'hazelnut-latte',
    'orange-juice',
  ];
  const names: Record<DrinkId, readonly string[]> = {
    'lemon-juice': ['lemon', 'juice'],
    'first-coffee': ['black', 'coffee'],
    'new-coffee': ['new', 'coffee'],
    latte: ['latte'],
    'hazelnut-latte': ['hazelnut', 'latte'],
    'orange-juice': ['orange', 'juice'],
  };
  // Lemon juice and black coffee share the 0.1 tick: their sprites stand
  // shoulder to shoulder, one on each side of it.
  const SHOULDER = 57;
  const standX = (id: DrinkId): number => {
    if (id === 'lemon-juice') return xOf(DRINKS[id].s) - SHOULDER;
    if (id === 'first-coffee') return xOf(DRINKS[id].s) + SHOULDER;
    return xOf(DRINKS[id].s);
  };

  const body: string[] = [
    text({ x: 24, y: 84 }, 'How sweet is it?', { size: 28, fill: ink.text, weight: 700 }),
    line(
      { x: x0, y: lineY },
      { x: x1, y: lineY },
      { stroke: ink.secondary, 'stroke-width': 2.5, 'stroke-linecap': 'round' }
    ),
    line(
      { x: x0, y: lineY - 9 },
      { x: x0, y: lineY + 9 },
      { stroke: ink.secondary, 'stroke-width': 2.5, 'stroke-linecap': 'round' }
    ),
    line(
      { x: x1, y: lineY - 9 },
      { x: x1, y: lineY + 9 },
      { stroke: ink.secondary, 'stroke-width': 2.5, 'stroke-linecap': 'round' }
    ),
  ];

  for (const id of order) {
    const sx = standX(id);
    const tick: Point = { x: xOf(DRINKS[id].s), y: lineY };
    body.push(
      line(
        { x: sx, y: 300 },
        { x: tick.x, y: lineY - 6 },
        { stroke: ink.secondary, 'stroke-width': 1.5 }
      )
    );
    names[id].forEach((word, i) => {
      body.push(
        text({ x: sx, y: spriteBase + 28 + i * 22 }, word, {
          size: 18,
          fill: ink.text,
          anchor: 'middle',
        })
      );
    });
    body.push(use(DRINKS[id].sprite, { x: sx, y: spriteBase }));
  }
  for (const id of order) {
    body.push(
      circle({ x: xOf(DRINKS[id].s), y: lineY }, 6, {
        fill: ink.text,
        stroke: ink.paper,
        'stroke-width': 2,
      })
    );
  }

  const ticks = [0, 0.1, 0.4, 0.6, 0.8, 1];
  for (const t of ticks) {
    body.push(
      text({ x: xOf(t), y: lineY + 38 }, String(t), {
        size: 16,
        fill: ink.secondary,
        anchor: 'middle',
      })
    );
  }
  body.push(text({ x: x0, y: lineY + 80 }, 'less', { size: 16, fill: ink.secondary, anchor: 'start' }));
  body.push(text({ x: x1, y: lineY + 80 }, 'more', { size: 16, fill: ink.secondary, anchor: 'end' }));
  body.push(
    text({ x: 370, y: lineY + 80 }, 'sweetness', { size: 20, fill: ink.text, anchor: 'middle' })
  );
  body.push(
    arrow(
      { x: 446, y: lineY + 74 },
      { x: 488, y: lineY + 74 },
      { color: ink.text, width: 2, head: 9 }
    )
  );

  return {
    file: '02-sweetness-line',
    header: '02 / ONE QUESTION, ONE LINE',
    title: 'Five drinks on one sweetness line',
    desc: ALT['02-sweetness-line'],
    width,
    height,
    sprites: ['lemon-juice', 'black-coffee', 'latte', 'hazelnut-latte', 'orange-juice'],
    spriteSize,
    body,
  };
}

// ---------------------------------------------------------------------------
// 03 and 03b: the flat page. Each plate is the window its live piece uses: the
// same scale and the same offsets as every piece (fitFor), cropped to the same
// top and height, so a plate and its live twin have equal dimensions and a drink
// stands on the same pixel in both.

const PAGE = fitFor('wide', 'page');
const JOURNEY = fitFor('wide', 'journey');
const SPRITE = spriteHeight('wide');
const CUP_SPRITE = 48;
// The red ring hugs the sprite and stops above the name under the dot.
const RING_SCALE = 0.6;

// The plate's own coordinates start at the crop's top edge.
const sceneOf = (cam: Camera, fit: Fit): Scene => ({ cam, fit: { ...fit, cy: fit.cy - fit.top } });

const pageLeft = (sc: Scene): number => onFloor(sc, { s: 0, n: 0, c: 0 }).x;

const PAGE_SPRITES: readonly SpriteId[] = [
  'orange-juice',
  'lemon-juice',
  'black-coffee',
  'latte',
  'hazelnut-latte',
];

function nuttinessMap(ink: Ink): Plate {
  const sc = sceneOf(FLAT, PAGE);
  const stands = paintOrder(
    (['orange-juice', 'lemon-juice', 'first-coffee', 'latte', 'hazelnut-latte'] as const).map(
      (id) => drinkStand(sc, id)
    )
  );
  return {
    file: '03-nuttiness-map',
    header: '03 / GIVE NUTTINESS ITS OWN DIRECTION',
    title: 'A taste map on a page',
    desc: ALT['03-nuttiness-map'],
    width: PAGE.width,
    height: PAGE.height,
    sprites: PAGE_SPRITES,
    spriteSize: SPRITE,
    body: [
      ...floorGrid(sc, ink),
      ...axes(sc, ink, false),
      ...drawStands(stands, ink, pageLeft(sc) + 8),
    ],
  };
}

// 03b: the new coffee dragged straight down toward the lemon juice, to (0.1, 0.3).
// It keeps its sweetness and gives up nuttiness, so one promise is broken. At 0.3 the
// cup stands clear above the lemon juice glass, and the guide arrow still has a run.
const MOVED = { s: 0.1, n: 0.3, c: 0 } as const;
// Drinks within a sprite of each other spread this far apart, as in the live piece.
const SPREAD = 18;
// An arrow shorter than this, once the names under the ghost are taken out of its run, is not drawn.
const MIN_CLEAR_ARROW = 24;
// The black coffee cup's painted top, as a share of the sprite's box above its base: the
// cast PNG paints from row 107 of 256, so the top 42 percent of the box is empty. The
// guide arrow ends at the painted cup, not at the box.
const COFFEE_PAINTED_TOP = 1 - 107 / 256;
// Air between the arrow and the text above it or the cup below it.
const ARROW_AIR = 3;
const NAME_ROW_PX = 16;

function placementExperiment(ink: Ink): Plate {
  const sc = sceneOf(FLAT, PAGE);
  const start = at(sc, DRINKS['first-coffee']);
  const moved = at(sc, MOVED);
  const left = pageLeft(sc);

  // The first coffee and the ghost of where the new coffee started share the
  // spot: the coffee stands left of the dot and the faded copy right of it. The
  // coffee's name hangs under the spot and ends left of the latte's cup; the
  // ghost's name stands right of its dashed ring, halfway up, as in the live piece.
  const latte = at(sc, DRINKS.latte);
  const labelMax = spriteBox(latte, SPRITE).x0 - 6;
  const first: Stand = { ...drinkStand(sc, 'first-coffee', { name: 'first coffee' }), dx: -SPREAD, labelMax };
  const ghost: Stand = {
    nameAt: { x: start.x + SPREAD + SPRITE / 2 + 6, y: start.y - SPRITE / 2 + 4, anchor: 'start' },
    at: start,
    depth: start.depth,
    sprite: DRINKS['new-coffee'].sprite,
    name: 'where it started',
    nameFill: ink.secondary,
    dx: SPREAD,
    faint: 0.35,
    dashed: true,
  };
  const moving: Stand = {
    at: moved,
    depth: moved.depth,
    sprite: DRINKS['new-coffee'].sprite,
    name: DRINKS['new-coffee'].label,
    nameFill: ink.amber,
    ring: true,
  };
  const stands = paintOrder([
    drinkStand(sc, 'orange-juice'),
    drinkStand(sc, 'lemon-juice'),
    ghost,
    first,
    moving,
    drinkStand(sc, 'latte'),
    drinkStand(sc, 'hazelnut-latte'),
  ]);

  // The red bracket runs up the left axis from the start value to the current
  // one, with dotted guides across to the two dots and its tag outside the axis.
  const cap = 5;
  const bracket = el('path', {
    d: `M${num(left - cap)},${num(start.y)} L${num(left + cap)},${num(start.y)} M${num(left)},${num(start.y)} L${num(left)},${num(moved.y)} M${num(left - cap)},${num(moved.y)} L${num(left + cap)},${num(moved.y)}`,
    fill: 'none',
    stroke: ink.red,
    'stroke-width': 2,
    'stroke-linejoin': 'round',
  });
  const dotted = {
    stroke: ink.muted,
    'stroke-width': 1,
    'stroke-dasharray': '1 4',
    'stroke-linecap': 'round',
  } as const;
  const guides = [start, moved].map((p) => line({ x: left, y: p.y }, p, dotted));
  const tag = text({ x: left - 34, y: (start.y + moved.y) / 2 }, 'less nutty than it tastes', {
    size: 13,
    fill: ink.red,
    anchor: 'middle',
    halo: true,
    rotate: -90,
  });
  // The guide runs from just under the first coffee's name, which stands across the
  // shaft's x below the shared dot, down to the painted top of the new coffee. A run
  // with less than MIN_CLEAR_ARROW left is not drawn at all.
  const lastBaseline = start.y + 18 + (first.row ?? 0) * NAME_ROW_PX;
  const guideFrom: Point = { x: start.x, y: lastBaseline + ARROW_AIR + 1 };
  const guideTo: Point = { x: moved.x, y: moved.y - COFFEE_PAINTED_TOP * SPRITE - ARROW_AIR };
  const guide =
    guideTo.y - guideFrom.y < MIN_CLEAR_ARROW
      ? []
      : [arrow(guideFrom, guideTo, { color: ink.amber, width: 2, head: 9, dash: '5 5' })];

  return {
    file: '03b-placement-experiment',
    header: '03B / TRY A DIFFERENT PLACEMENT',
    title: 'Try moving the new coffee toward the lemon',
    desc: ALT['03b-placement-experiment'],
    width: PAGE.width,
    height: PAGE.height,
    sprites: PAGE_SPRITES,
    spriteSize: SPRITE,
    body: [
      ...floorGrid(sc, ink),
      ...axes(sc, ink, false),
      ...guides,
      ...guide,
      bracket,
      ...drawStands(stands, ink, left + 8),
      tag,
    ],
  };
}

// ---------------------------------------------------------------------------
// 04: the room

const ROOM_SCENE: Scene = sceneOf(ROOM, JOURNEY);
const DRINK_IDS: readonly DrinkId[] = [
  'orange-juice',
  'lemon-juice',
  'first-coffee',
  'new-coffee',
  'latte',
  'hazelnut-latte',
];

// Where the tags of the nearer and farther lines may stand, in CSS px at u = 1.
const LINK_OFFSETS = [14, 24, 36];
const LINK_ALONGS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8];

function citrusSpace(ink: Ink): Plate {
  const sc = ROOM_SCENE;
  const lemon = at(sc, DRINKS['lemon-juice']);
  const fresh = at(sc, DRINKS['new-coffee']);
  const first = at(sc, DRINKS['first-coffee']);
  const dotted = {
    stroke: ink.muted,
    'stroke-width': 1.5,
    'stroke-dasharray': '2 5',
    'stroke-linecap': 'round',
  } as const;

  const nearer = line(lemon, fresh, dotted);
  const farther = line(lemon, first, dotted);

  const shadows = DRINK_IDS.flatMap((id) => dropLine(sc, ink, DRINKS[id]));
  const stands = paintOrder(
    DRINK_IDS.map((id) =>
      drinkStand(
        sc,
        id,
        id === 'new-coffee'
          ? { nameFill: ink.amber, ring: true }
          : id === 'first-coffee'
            ? { name: 'first coffee' }
            : {}
      )
    )
  );

  // The live piece's order: the axes and the two dotted lines are claimed first, then
  // the sprites and the names, then the tags of the dotted lines and the citrus axis name.
  const book = new Book();
  claimAxes(sc, book, true);
  const axisParts = axes(sc, ink, true, 1, book);
  book.avoidLine(lemon, fresh);
  book.avoidLine(lemon, first);
  // Each name keeps a row of air above and below it, so a tag never stacks on a
  // name and reads as a second line of it, as in the live piece.
  const standing = drawStands(stands, ink, undefined, { book, size: SPRITE, air: 6 });
  // The new coffee's drop line is claimed once the names are down: a tag beside it
  // would read as the gap between the two coffees.
  book.avoidLine(fresh, onFloor(sc, DRINKS['new-coffee']));
  const tagFor = (to: Point, other: Point, label: string): string =>
    spotText(label, book.put(label, lineSpots(lemon, to, other, 1, LINK_OFFSETS, LINK_ALONGS)), ink.secondary);
  const tagNearer = tagFor(fresh, first, 'nearer');
  const tagFarther = tagFor(first, fresh, 'farther');
  const citrus = citrusName(sc, ink, book);

  return {
    file: '04-citrus-space',
    header: '04 / WHAT MAKES THESE COFFEES DIFFERENT?',
    title: 'The taste map as a room',
    desc: ALT['04-citrus-space'],
    width: JOURNEY.width,
    height: JOURNEY.height,
    sprites: PAGE_SPRITES,
    spriteSize: SPRITE,
    body: [
      ...floorGrid(sc, ink),
      ...axisParts,
      ...shadows,
      nearer,
      farther,
      ...standing,
      tagNearer,
      tagFarther,
      citrus,
    ],
  };
}

// ---------------------------------------------------------------------------
// Taste shapes: one spoke per question, a mark along each spoke at its score,
// the marks joined into an outline. Spokes turn counterclockwise from straight
// up, so three questions put sweetness on top, nuttiness lower left and citrus
// brightness lower right. The order of the spokes is a convention; the
// comparison of two shapes does not depend on it.

type Radar = { center: Point; radius: number; count: number };
type Spoke = { name: string; score: number };

const RING_LEVELS = [0.2, 0.4, 0.6, 0.8, 1] as const;
const SPOKE_NAME_GAP = 12;

const threeSpokes = (t: Taste): Spoke[] => [
  { name: 'sweetness', score: t.s },
  { name: 'nuttiness', score: t.n },
  { name: 'citrus brightness', score: t.c },
];

// Nine more questions for the new coffee, imagined: plausible for a nutty coffee with
// a citrus finish, each score between 0 and 1.
const IMAGINED_SPOKES: readonly Spoke[] = [
  { name: 'body', score: 0.5 },
  { name: 'bitterness', score: 0.5 },
  { name: 'roast', score: 0.5 },
  { name: 'creaminess', score: 0.1 },
  { name: 'smokiness', score: 0.2 },
  { name: 'chocolate', score: 0.4 },
  { name: 'floral', score: 0.2 },
  { name: 'acidity', score: 0.5 },
  { name: 'aftertaste', score: 0.5 },
];

// `reach` is in plate units along the spoke from the center.
function spokeAt(r: Radar, index: number, reach: number): Point {
  const angle = -Math.PI / 2 - (index * 2 * Math.PI) / r.count;
  return { x: r.center.x + reach * Math.cos(angle), y: r.center.y + reach * Math.sin(angle) };
}

const spokeIndexes = (r: Radar): number[] => Array.from({ length: r.count }, (_, i) => i);

// The rings and the spokes, in the muted grid colors.
function radarGrid(r: Radar, ink: Ink): string[] {
  const rings = RING_LEVELS.map((level) =>
    circle(r.center, level * r.radius, {
      fill: 'none',
      stroke: level === 1 ? ink.borderStrong : ink.border,
      'stroke-width': 1.2,
    })
  );
  const spokes = spokeIndexes(r).map((i) =>
    line(r.center, spokeAt(r, i, r.radius), { stroke: ink.borderStrong, 'stroke-width': 1.2 })
  );
  return [...rings, ...spokes];
}

// The outline joining the marks, filled thinly, with a dot on each score.
function radarShape(
  r: Radar,
  scores: readonly number[],
  color: string,
  o: { paper: string; fillOpacity: number; dot: number }
): string[] {
  const marks = scores.map((score, i) => spokeAt(r, i, score * r.radius));
  return [
    el('polygon', {
      points: marks.map((m) => `${num(m.x)},${num(m.y)}`).join(' '),
      fill: color,
      'fill-opacity': o.fillOpacity,
      stroke: color,
      'stroke-width': 2.5,
      'stroke-linejoin': 'round',
    }),
    ...marks.map((m) => circle(m, o.dot, { fill: color, stroke: o.paper, 'stroke-width': 1.5 })),
  ];
}

// Each name stands outside the outer ring on its spoke's line. Spokes on the right half of
// the circle anchor the name at its start, on the left half at its end, and the ones near
// the top and bottom center it, so a name always grows away from the circle. Its baseline
// drops with the spoke's height: a name above the center sits on its point, one below hangs from it.
function spokeNames(r: Radar, names: readonly string[], fill: string, size: number): string[] {
  return names.map((name, i) => {
    const p = spokeAt(r, i, r.radius + SPOKE_NAME_GAP);
    const side = (p.x - r.center.x) / (r.radius + SPOKE_NAME_GAP);
    const rise = (p.y - r.center.y) / (r.radius + SPOKE_NAME_GAP);
    const anchor = side > 0.3 ? 'start' : side < -0.3 ? 'end' : 'middle';
    return text({ x: p.x, y: p.y + size * 0.35 + size * 0.45 * rise }, name, { size, fill, anchor });
  });
}

// ---------------------------------------------------------------------------
// 04b: the same coffee as a triangle and as a blob

const SHAPE_RADIUS = 100;
const SHAPE_NAME_SIZE = 11;
const SHAPE_CENTER_Y = 310;

function tasteShape(ink: Ink): Plate {
  const width = 740;
  const height = 520;
  const spriteSize = 72;
  const coffee = DRINKS['new-coffee'];
  const panels: readonly { title: string; x: number; spokes: readonly Spoke[]; dot: number }[] = [
    { title: 'Three questions', x: 175, spokes: threeSpokes(coffee), dot: 4.5 },
    {
      title: 'Twelve questions',
      x: 565,
      spokes: [...threeSpokes(coffee), ...IMAGINED_SPOKES],
      dot: 3.5,
    },
  ];

  const body = panels.flatMap((panel) => {
    const radar: Radar = {
      center: { x: panel.x, y: SHAPE_CENTER_Y },
      radius: SHAPE_RADIUS,
      count: panel.spokes.length,
    };
    return [
      text({ x: panel.x, y: 76 }, panel.title, {
        size: 20,
        fill: ink.text,
        anchor: 'middle',
        weight: 700,
      }),
      use('black-coffee', { x: panel.x, y: 156 }),
      ...radarGrid(radar, ink),
      ...radarShape(
        radar,
        panel.spokes.map((spoke) => spoke.score),
        ink.amber,
        { paper: ink.paper, fillOpacity: 0.18, dot: panel.dot }
      ),
      ...spokeNames(
        radar,
        panel.spokes.map((spoke) => spoke.name),
        ink.secondary,
        SHAPE_NAME_SIZE
      ),
    ];
  });
  body.push(
    text({ x: 370, y: 494 }, 'Imagined taste ratings.', {
      size: 14,
      fill: ink.secondary,
      anchor: 'middle',
    })
  );

  return {
    file: '04b-taste-shape',
    header: '04b / THE SAME DRINK, DRAWN AS A SHAPE',
    title: 'The new coffee drawn as a taste shape',
    desc: ALT['04b-taste-shape'],
    width,
    height,
    sprites: ['black-coffee'],
    spriteSize,
    body,
  };
}

// ---------------------------------------------------------------------------
// 05: the three cups laid over one another on one radar

function tasteProfiles(ink: Ink): Plate {
  const width = 740;
  const height = 520;
  const spriteSize = 80;
  const radar: Radar = { center: { x: 230, y: 300 }, radius: 125, count: 3 };
  const legendX = 520;
  // The smallest outline is painted last, so it stays visible over the larger ones.
  const cups: readonly { id: CupId; title: string; color: string }[] = [
    { id: 'gentle', title: 'Gentle', color: ink.blue },
    { id: 'pronounced', title: 'Pronounced', color: ink.secondary },
    { id: 'citrus-led', title: 'Citrus-led', color: ink.amber },
  ];

  const shapes = [...cups].reverse().flatMap((cup) => {
    const taste = CUPS[cup.id];
    return radarShape(radar, [taste.s, taste.n, taste.c], cup.color, {
      paper: ink.paper,
      fillOpacity: 0.14,
      dot: 4.5,
    });
  });
  const legend = cups.flatMap((cup, i) => {
    const y = 262 + i * 52;
    const taste = CUPS[cup.id];
    return [
      el('rect', { x: legendX, y: y - 12, width: 14, height: 14, rx: 3, fill: cup.color }),
      text({ x: legendX + 24, y }, cup.title, { size: 16, fill: ink.text, weight: 700 }),
      text({ x: legendX + 24, y: y + 20 }, `${taste.s}, ${taste.n}, ${taste.c}`, {
        size: 13,
        fill: ink.secondary,
      }),
    ];
  });

  return {
    file: '05-taste-profiles',
    header: '05 / THE SAME BALANCE, AT A DIFFERENT INTENSITY',
    title: 'The same taste balance at a different intensity',
    desc: ALT['05-taste-profiles'],
    width,
    height,
    sprites: ['black-coffee'],
    spriteSize,
    body: [
      text({ x: 24, y: 84 }, 'Three black coffees, poured the same size', {
        size: 26,
        fill: ink.text,
        weight: 700,
      }),
      ...radarGrid(radar, ink),
      ...shapes,
      ...spokeNames(radar, threeSpokes(CUPS.gentle).map((spoke) => spoke.name), ink.secondary, 14),
      use('black-coffee', { x: legendX + 40, y: 190 }),
      text({ x: legendX, y: 226 }, 'sweetness, nuttiness, citrus', { size: 12, fill: ink.secondary }),
      ...legend,
      text({ x: 370, y: 494 }, 'Imagined taste ratings.', {
        size: 14,
        fill: ink.secondary,
        anchor: 'middle',
      }),
    ],
  };
}

// ---------------------------------------------------------------------------
// 06: three cups in the room, by ruler and by arrow

const CUP_IDS: readonly CupId[] = ['gentle', 'pronounced', 'citrus-led'];

// Plate 06 uses the live piece's own fit, the camera framed to a box from the origin to
// CUPS_EXTENT on every axis, at the opening yaw. The axes and the floor stop at that box.
const CUPS_FIT = fitCups('wide');
// The beam stops here at the highest, which keeps its label under the header line.
const BEAM_TOP = 60;

const vector = (t: Taste): number[] => [t.s, t.n, t.c];

// A ruler between two cups, drawn the way a drawing dimensions a length: a line
// beside the segment, offset RULER_OFFSET to the side away from `other`, with a short
// cap at each end and a thin witness line back to each cup. Beside the segment, not on
// it, so a ruler along an arrow is not hidden by the arrow. Returns the parts and the
// ends of the ruler line.
const RULER_OFFSET = 12;

function ruler(
  ink: Ink,
  from: Point,
  to: Point,
  other: Point
): { parts: string[]; a: Point; b: Point } {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const nx = -(to.y - from.y) / length;
  const ny = (to.x - from.x) / length;
  // The side lineSpots calls away.
  const side = nx * (to.x - other.x) + ny * (to.y - other.y) < 0 ? -1 : 1;
  const shift = (p: Point): Point => ({ x: p.x + side * nx * RULER_OFFSET, y: p.y + side * ny * RULER_OFFSET });
  const a = shift(from);
  const b = shift(to);
  const cap = (p: Point): string =>
    line(
      { x: p.x - side * nx * 5, y: p.y - side * ny * 5 },
      { x: p.x + side * nx * 5, y: p.y + side * ny * 5 },
      { stroke: ink.secondary, 'stroke-width': 1.5 }
    );
  const witness = (dot: Point, p: Point): string =>
    line(dot, p, { stroke: ink.secondary, 'stroke-width': 1, opacity: 0.6 });
  return {
    parts: [
      witness(from, a),
      witness(to, b),
      line(a, b, { stroke: ink.secondary, 'stroke-width': 1.5 }),
      cap(a),
      cap(b),
    ],
    a,
    b,
  };
}

// Where the numbers of the two rulers may stand, in CSS px at u = 1.
const RULER_OFFSETS = [14, 26, 40];
const RULER_ALONGS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.85, 0.2, 0.15];

function tasteDirections(ink: Ink): Plate {
  const sc = sceneOf({ ...ROOM, yaw: CUPS_YAW }, CUPS_FIT);
  const origin: Taste = { s: 0, n: 0, c: 0 };
  const start = at(sc, origin);

  const gentle = CUPS.gentle;
  const pronounced = CUPS.pronounced;
  const citrusLed = CUPS['citrus-led'];
  const near = distance(vector(gentle), vector(citrusLed));
  const far = distance(vector(gentle), vector(pronounced));
  if (near >= far || cosine(vector(gentle), vector(pronounced)) < 0.999) {
    throw new Error(
      '06 expects the citrus-led cup nearer and the gentle and pronounced cups on one direction'
    );
  }

  const dotOf = (id: CupId): Projected => at(sc, CUPS[id]);
  const gentleDot = dotOf('gentle');
  const pronouncedDot = dotOf('pronounced');
  const citrusDot = dotOf('citrus-led');

  // The shared direction runs on to the edge of the cube, where the first score hits 1,
  // or as far as the frame allows: it stops at BEAM_TOP, below the header line.
  const reach = 1 / Math.max(pronounced.s, pronounced.n, pronounced.c);
  const cubeEdge = at(sc, scaled(pronounced, reach));
  const share =
    cubeEdge.y < BEAM_TOP
      ? Math.max(0, (pronouncedDot.y - BEAM_TOP) / (pronouncedDot.y - cubeEdge.y))
      : 1;
  const beamEnd: Point = {
    x: pronouncedDot.x + (cubeEdge.x - pronouncedDot.x) * share,
    y: pronouncedDot.y + (cubeEdge.y - pronouncedDot.y) * share,
  };

  const farRuler = ruler(ink, gentleDot, pronouncedDot, citrusDot);
  const nearRuler = ruler(ink, gentleDot, citrusDot, pronouncedDot);

  const shadows = CUP_IDS.flatMap((id) => dropLine(sc, ink, CUPS[id]));
  const ringCentre = { x: citrusDot.x, y: citrusDot.y - CUP_SPRITE / 2 };
  const ringRadius = CUP_SPRITE * RING_SCALE;
  // The citrus-led name starts clear of the red ring around its cup.
  const beyondRing = ringCentre.x + ringRadius + 6;
  const stands = paintOrder(
    CUP_IDS.map((id): Stand => {
      const p = dotOf(id);
      const nameTries: Spot[] =
        id === 'citrus-led'
          ? [
              { x: beyondRing, y: ringCentre.y + 4, anchor: 'start' },
              { x: beyondRing, y: p.y + 4, anchor: 'start' },
            ]
          : [];
      return { at: p, depth: p.depth, sprite: 'black-coffee', name: id, nameTries };
    })
  );
  const arrowTips = [citrusDot, pronouncedDot, gentleDot];
  const arrows = arrowTips.map((to) => arrow(start, to, { color: ink.blue, width: 2.5, head: 11 }));


  // The live piece's order: every line is claimed first (the axes, the three arrows, the
  // beam, both rulers and the drop lines), then the sprites and the names, then the
  // numbers of the rulers, the tags, and the citrus axis name above its arrowhead.
  const book = new Book();
  claimAxes(sc, book, true, CUPS_EXTENT);
  const axisParts = axes(sc, ink, true, CUPS_EXTENT, book);
  for (const to of arrowTips) book.avoidLine(start, to);
  book.avoidLine(pronouncedDot, beamEnd);
  book.avoidLine(farRuler.a, farRuler.b);
  book.avoidLine(nearRuler.a, nearRuler.b);
  book.avoidLine(gentleDot, citrusDot);
  for (const id of CUP_IDS) book.avoidLine(dotOf(id), onFloor(sc, CUPS[id]));
  book.avoid({
    x0: ringCentre.x - ringRadius,
    x1: ringCentre.x + ringRadius,
    y0: ringCentre.y - ringRadius,
    y1: ringCentre.y + ringRadius,
  });
  const standing = drawStands(stands, ink, undefined, { book, size: CUP_SPRITE });
  const startTag = spotText(
    'start: every score zero',
    book.put('start: every score zero', [
      { x: start.x + 12, y: start.y + 20, anchor: 'start' },
      { x: start.x - 12, y: start.y + 20, anchor: 'end' },
      { x: start.x + 12, y: start.y + 36, anchor: 'start' },
    ]),
    ink.secondary
  );
  // Each number stands beside its own ruler line, on the side away from the other ruler,
  // or, when the arrows crowd every such spot, right of the cup the ruler ends on, on
  // rows that stay above the citrus axis tip. Never a spot beside another ruler.
  const rulerTag = (
    r: { a: Point; b: Point },
    other: Point,
    label: string,
    beyond: readonly Spot[] = []
  ): string =>
    spotText(
      label,
      book.put(label, [...lineSpots(r.a, r.b, other, 1, RULER_OFFSETS, RULER_ALONGS), ...beyond]),
      ink.secondary
    );
  const farTag = rulerTag(farRuler, citrusDot, `${far.toFixed(2)} apart`);
  const nearTag = rulerTag(
    nearRuler,
    pronouncedDot,
    `${near.toFixed(2)} apart`,
    [4, 20, 36].map((drop): Spot => ({ x: beyondRing, y: citrusDot.y + drop, anchor: 'start' }))
  );
  // Above the ring, on the side away from the cup, or beside it when the arrows crowd it.
  const nearestAbove = ringCentre.y - ringRadius - 8;
  const nearestTag = spotText(
    'nearest',
    book.put('nearest', [
      { x: ringCentre.x, y: nearestAbove, anchor: 'middle' },
      { x: ringCentre.x + ringRadius + 6, y: ringCentre.y + 4, anchor: 'start' },
      { x: ringCentre.x - ringRadius - 6, y: ringCentre.y + 4, anchor: 'end' },
    ]),
    ink.red
  );
  const beamTag = spotText(
    'one direction',
    book.put('one direction', [
      { x: beamEnd.x + 12, y: beamEnd.y + 4, anchor: 'start' },
      { x: beamEnd.x - 12, y: beamEnd.y + 4, anchor: 'end' },
      { x: beamEnd.x, y: beamEnd.y - 8, anchor: 'middle' },
    ]),
    ink.blue
  );
  const citrus = citrusName(sc, ink, book, CUPS_EXTENT);

  return {
    file: '06-taste-directions',
    header: '06 / THE SAME MAP, A DIFFERENT QUESTION',
    title: 'Compare the balance of three flavor notes by direction',
    desc: ALT['06-taste-directions'],
    width: CUPS_FIT.width,
    height: CUPS_FIT.height,
    sprites: ['black-coffee'],
    spriteSize: CUP_SPRITE,
    body: [
      ...floorGrid(sc, ink, CUPS_EXTENT),
      ...axisParts,
      ...shadows,
      ...farRuler.parts,
      ...nearRuler.parts,
      line(pronouncedDot, beamEnd, {
        stroke: ink.blue,
        'stroke-width': 1.5,
        'stroke-dasharray': '6 5',
        opacity: 0.6,
      }),
      ...arrows,
      circle(start, 5, { fill: ink.text, stroke: ink.paper, 'stroke-width': 1.5 }),
      ...standing,
      circle(ringCentre, ringRadius, { fill: 'none', stroke: ink.red, 'stroke-width': 2 }),
      startTag,
      beamTag,
      farTag,
      nearTag,
      nearestTag,
      citrus,
    ],
  };
}

// ---------------------------------------------------------------------------

const PLATES: readonly { id: string; plate: (ink: Ink) => Plate }[] = [
  { id: '02', plate: sweetnessLine },
  { id: '03', plate: nuttinessMap },
  { id: '03b', plate: placementExperiment },
  { id: '04', plate: citrusSpace },
  { id: '04b', plate: tasteShape },
  { id: '05', plate: tasteProfiles },
  { id: '06', plate: tasteDirections },
];

// Each plate is built once per palette. The geometry never reads a color, so the two
// files must come out the same size; a plate that drifts between themes is a bug.
for (const { id, plate } of PLATES) {
  const sizes = VARIANTS.map((variant) => render(plate(variant.ink), variant));
  const [light, dark] = sizes;
  if (light !== dark) throw new Error(`${id}: light is ${light} but dark is ${dark}`);
  console.log(`${id}: ${light}`);
}
