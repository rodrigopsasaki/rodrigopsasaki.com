// Trains the toy behind "Watch a map learn" (piece 4 of "From a Line to an
// Embedding") and writes what the page needs:
//
//   src/data/embedding-toy.json                                       the whole run
//   public/images/embedding-walkthrough/07-learning-the-map.svg       the no-JS plate, light
//   public/images/embedding-walkthrough/07-learning-the-map-dark.svg  the same plate, dark
//
// Run it on Node 24, which strips types natively (the repo itself stays on
// Node 20, and the outputs are committed):
//
//   mise exec node@24 -- pnpm train:embedding-toy
//
// The rule is deliberately tiny. Every word has a two-number address, and a card's
// address is the average of its words' addresses. One training example is an
// anchor, a wanted partner and one unwanted card. The step nudges the words so
// the wanted pair gets closer and the unwanted card moves away from the anchor:
// the loss is a two-way softmax over negative squared distance, minimized by
// plain gradient descent. Nothing places a card. The run is seeded (mulberry32)
// and follows a fixed schedule, so the output is byte-for-byte reproducible.
//
// Before anything is written, five story conditions are asserted on the numbers
// that will ship (the rounded ones: three decimals; at two, some examples move a card too little to show and the pair is no longer visibly closer). If any fails, the script exits non-zero and
// writes nothing. The remedy is to retune SEED, LEARNING_RATE or TEMPERATURE,
// never to move a card by hand.

import { writeFileSync } from 'node:fs';
import { layoutWidth } from '../src/scripts/embedding-walkthrough/model.ts';
import type {
  Layout,
  ToyCard,
  ToyData,
  ToyPoint,
  ToyStep,
  ToyView,
} from '../src/scripts/embedding-walkthrough/model.ts';
import {
  REFERENCE_U,
  STAGE_HEIGHT,
  cardFrame,
  cardOptions,
  declutter,
  fitToy,
  leaderFor,
  nearestTo,
  positionsAt,
  slotsFor,
  viewPoint,
} from '../src/scripts/embedding-walkthrough/toy-layout.ts';
import type { Place, ToyBounds } from '../src/scripts/embedding-walkthrough/toy-layout.ts';

// ---------------------------------------------------------------------------
// Tuning: the three knobs the story assertions are tuned with.

const SEED = 2059740;
const LEARNING_RATE = 0.5;
const TEMPERATURE = 1;
// Standard deviation of the untrained word addresses.
const INITIAL_SPREAD = 1;
const STEPS = 36;

// ---------------------------------------------------------------------------
// Files

const DATA_FILE = new URL('../src/data/embedding-toy.json', import.meta.url);
const PLATE_FILE = new URL(
  '../public/images/embedding-walkthrough/07-learning-the-map.svg',
  import.meta.url
);
const PLATE_FILE_DARK = new URL(
  '../public/images/embedding-walkthrough/07-learning-the-map-dark.svg',
  import.meta.url
);

// ---------------------------------------------------------------------------
// The cards. Each card's words are written out; there is no tokenizer. The group
// is the script's own bookkeeping for the assertions: it is never stored in the
// JSON and never shown, because the clusters must emerge from the training.

type Group = 'coffee' | 'latte' | 'visit';

type CardSpec = {
  id: string;
  text: string;
  short: string;
  words: string[];
  group: Group;
};

const CARDS: readonly CardSpec[] = [
  {
    id: 'request',
    text: 'a nutty coffee with a little brightness',
    short: 'the request',
    words: ['nutty', 'coffee', 'bright'],
    group: 'coffee',
  },
  {
    id: 'hazelnut',
    text: 'hazelnut roast, lemony finish',
    short: 'hazelnut roast',
    words: ['hazelnut', 'roast', 'lemony', 'finish'],
    group: 'coffee',
  },
  {
    id: 'almond',
    text: 'almond notes, citrus finish',
    short: 'almond notes',
    words: ['almond', 'notes', 'citrus', 'finish'],
    group: 'coffee',
  },
  {
    id: 'toasted',
    text: 'toasted nuts, bright and clean',
    short: 'toasted nuts',
    words: ['toasted', 'nuts', 'bright', 'clean'],
    group: 'coffee',
  },
  {
    id: 'caramel',
    text: 'sweet caramel latte',
    short: 'caramel latte',
    words: ['sweet', 'caramel', 'latte'],
    group: 'latte',
  },
  {
    id: 'creamy',
    text: 'creamy latte, gently sweet',
    short: 'creamy latte',
    words: ['creamy', 'latte', 'gently', 'sweet'],
    group: 'latte',
  },
  {
    id: 'opening',
    text: 'opening hours: seven to three',
    short: 'opening hours',
    words: ['opening', 'hours', 'seven', 'three'],
    group: 'visit',
  },
  {
    id: 'closed',
    text: 'closed on Mondays',
    short: 'closed Mondays',
    words: ['closed', 'mondays'],
    group: 'visit',
  },
];

type UnseenSpec = { id: string; text: string; short: string; words: string[]; group: Group };

// Descriptions made only of trained words, held out of every example.
const UNSEEN_CARDS: readonly UnseenSpec[] = [
  {
    id: 'almond-roast',
    text: 'almond roast, lemony and bright',
    short: 'almond roast',
    words: ['almond', 'roast', 'lemony', 'bright'],
    group: 'coffee',
  },
  {
    id: 'creamy-caramel',
    text: 'creamy caramel, sweet',
    short: 'creamy caramel',
    words: ['creamy', 'caramel', 'sweet'],
    group: 'latte',
  },
  {
    id: 'closed-opening',
    text: 'closed: opening hours',
    short: 'closed: opening hours',
    words: ['closed', 'opening', 'hours'],
    group: 'visit',
  },
];

// The wanted pairs, in the fixed order the schedule cycles through. Every
// cycle but the first swaps anchor and partner on alternate rounds.
const WANTED: readonly (readonly [string, string])[] = [
  ['request', 'hazelnut'],
  ['opening', 'closed'],
  ['request', 'almond'],
  ['caramel', 'creamy'],
  ['hazelnut', 'almond'],
  ['request', 'toasted'],
  ['almond', 'toasted'],
];

const REQUEST = 'request';
const OPENING = 'opening';

// ---------------------------------------------------------------------------
// Seeded randomness and small geometry helpers

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

const squared = (a: ToyPoint, b: ToyPoint): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

function byId<T extends { id: string }>(items: readonly T[], id: string): T {
  const found = items.find((item) => item.id === id);
  if (!found) throw new Error(`unknown id: ${id}`);
  return found;
}

function pointOf(positions: Readonly<Record<string, ToyPoint>>, id: string): ToyPoint {
  const p = positions[id];
  if (!p) throw new Error(`no position for ${id}`);
  return p;
}

// ---------------------------------------------------------------------------
// Training

type Positions = Record<string, ToyPoint>;

type RawStep = {
  positions: Positions;
  pair: { a: string; b: string } | null;
  unwanted: string | null;
};

const vocabulary: string[] = [...new Set(CARDS.flatMap((card) => card.words))];

function train(): { raw: RawStep[]; unseen: { spec: UnseenSpec; at: ToyPoint }[] } {
  const random = mulberry32(SEED);
  const gaussian = (): number => {
    const u = Math.max(random(), 1e-12);
    const v = random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const words = new Map<string, ToyPoint>();
  for (const word of vocabulary) {
    words.set(word, { x: gaussian() * INITIAL_SPREAD, y: gaussian() * INITIAL_SPREAD });
  }
  const wordPoint = (word: string): ToyPoint => {
    const p = words.get(word);
    if (!p) throw new Error(`unknown word: ${word}`);
    return p;
  };
  const addressOf = (wordList: readonly string[]): ToyPoint => {
    let x = 0;
    let y = 0;
    for (const word of wordList) {
      const p = wordPoint(word);
      x += p.x;
      y += p.y;
    }
    return { x: x / wordList.length, y: y / wordList.length };
  };
  const snapshot = (): Positions => {
    const out: Positions = {};
    for (const card of CARDS) out[card.id] = addressOf(card.words);
    return out;
  };

  const raw: RawStep[] = [{ positions: snapshot(), pair: null, unwanted: null }];
  for (let step = 1; step <= STEPS; step += 1) {
    const slot = (step - 1) % WANTED.length;
    const round = Math.floor((step - 1) / WANTED.length);
    const [first, second] = WANTED[slot];
    const [anchorId, partnerId] = round % 2 === 1 ? [second, first] : [first, second];
    const anchor = byId(CARDS, anchorId);
    const partner = byId(CARDS, partnerId);
    // The unwanted card always comes from a different group than the pair.
    const pool = CARDS.filter((card) => card.group !== anchor.group);
    const unwanted = pool.at(Math.floor(random() * pool.length));
    if (!unwanted) throw new Error(`no card outside the ${anchor.group} group to push away`);

    const now = raw[step - 1].positions;
    const a = pointOf(now, anchor.id);
    const p = pointOf(now, partner.id);
    const q = pointOf(now, unwanted.id);
    // Two-way softmax over negative squared distance: how strongly the model
    // already prefers the wanted partner. The less it does, the bigger the step.
    const prefers = 1 / (1 + Math.exp(-(squared(a, q) - squared(a, p)) / TEMPERATURE));
    const g = (1 - prefers) / TEMPERATURE;
    // Gradient of the loss with respect to each card's address.
    const pulls: [CardSpec, ToyPoint][] = [
      [anchor, { x: 2 * g * (q.x - p.x), y: 2 * g * (q.y - p.y) }],
      [partner, { x: -2 * g * (a.x - p.x), y: -2 * g * (a.y - p.y) }],
      [unwanted, { x: 2 * g * (a.x - q.x), y: 2 * g * (a.y - q.y) }],
    ];
    // A card's address is the mean of its words, so each word carries its share.
    const gradient = new Map<string, ToyPoint>();
    for (const [card, grad] of pulls) {
      for (const word of card.words) {
        const sum = gradient.get(word) ?? { x: 0, y: 0 };
        gradient.set(word, {
          x: sum.x + grad.x / card.words.length,
          y: sum.y + grad.y / card.words.length,
        });
      }
    }
    for (const [word, grad] of gradient) {
      const p0 = wordPoint(word);
      words.set(word, { x: p0.x - LEARNING_RATE * grad.x, y: p0.y - LEARNING_RATE * grad.y });
    }
    raw.push({
      positions: snapshot(),
      pair: { a: anchor.id, b: partner.id },
      unwanted: unwanted.id,
    });
  }

  const unseen = UNSEEN_CARDS.map((spec) => ({ spec, at: addressOf(spec.words) }));
  return { raw, unseen };
}

// ---------------------------------------------------------------------------
// Presentation frame: one rigid motion (rotate, then center) applied to every
// address of the run, so distances and neighbors are untouched. The principal
// axis lies along x, and the question ends left of the opening hours.

type Transform = (p: ToyPoint) => ToyPoint;

function frameTransform(raw: RawStep[], unseen: { at: ToyPoint }[]): Transform {
  const all: ToyPoint[] = [];
  for (const step of raw) all.push(...Object.values(step.positions));
  for (const u of unseen) all.push(u.at);
  const mx = all.reduce((sum, p) => sum + p.x, 0) / all.length;
  const my = all.reduce((sum, p) => sum + p.y, 0) / all.length;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of all) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) ** 2;
  }
  let theta = -0.5 * Math.atan2(2 * sxy, sxx - syy);
  const rotate = (p: ToyPoint, angle: number): ToyPoint => ({
    x: (p.x - mx) * Math.cos(angle) - (p.y - my) * Math.sin(angle),
    y: (p.x - mx) * Math.sin(angle) + (p.y - my) * Math.cos(angle),
  });
  const last = raw[raw.length - 1].positions;
  const question = rotate(pointOf(last, REQUEST), theta);
  const opening = rotate(pointOf(last, OPENING), theta);
  if (question.x > opening.x) theta += Math.PI;
  return (p) => rotate(p, theta);
}

// ---------------------------------------------------------------------------
// Assemble the data exactly as it ships, rounded to 3 decimals. The file holds
// each card's track over the run, the examples, the unseen cards and one fit of
// the cloud per layout. What the page can derive (the nearest card, the words)
// stays out of it.

const roundPoint = (p: ToyPoint): ToyPoint => ({ x: round3(p.x), y: round3(p.y) });

// The card that moved farthest although it was not in the example, and the word
// it shares with a card that was. Below this much movement the page would claim
// a shift nobody can see, so the step reports none.
const VISIBLE_MOVE = 0.03;

function movedAlongOf(
  before: Positions,
  after: Positions,
  inExample: readonly string[]
): ToyStep['movedAlong'] {
  let best: ToyStep['movedAlong'] = null;
  let bestMove = VISIBLE_MOVE;
  for (const card of CARDS) {
    if (inExample.includes(card.id)) continue;
    const move = Math.sqrt(squared(pointOf(before, card.id), pointOf(after, card.id)));
    if (move <= bestMove) continue;
    for (const word of card.words) {
      const sharer = inExample.find((id) => byId(CARDS, id).words.includes(word));
      if (sharer === undefined) continue;
      best = { card: card.id, word, sharedWith: sharer };
      bestMove = move;
      break;
    }
  }
  return best;
}

// The box around every address of the run, the unseen cards included.
function boundsOf(data: Omit<ToyData, 'views'>): ToyBounds {
  const states = data.tracks.at(0)?.xs.map((_, n) => positionsAt(data.tracks, n)) ?? [];
  const every = [
    ...states.flatMap((state) => [...state.values()]),
    ...data.unseen.map((card) => card.at),
  ];
  return {
    minX: Math.min(...every.map((p) => p.x)),
    maxX: Math.max(...every.map((p) => p.x)),
    minY: Math.min(...every.map((p) => p.y)),
    maxY: Math.max(...every.map((p) => p.y)),
  };
}

// One fit per layout, made at the layout's reference scale, so the page never
// searches for a fit while the reader resizes. The bounds cover the whole run, so
// nothing rescales. A card takes its spot around its dot afterwards (declutter),
// at whatever width the label has on the page. The frame is the cloud with room
// for a card above its top dot and below its bottom one, and one more row of
// cards below that for a crowded step. A stage bound by its width (the compact
// one) keeps only the height that needs; one that would grow taller than
// STAGE_HEIGHT (the wide one) is scaled down into it instead, so the cloud fills
// the frame either way.
function viewsFor(data: Omit<ToyData, 'views'>): Record<Layout, ToyView> {
  const bounds = boundsOf(data);
  const fit = (layout: Layout): ToyView => {
    const width = layoutWidth(layout);
    const card = cardOptions(width, STAGE_HEIGHT, REFERENCE_U[layout]);
    const frame = cardFrame(width, STAGE_HEIGHT, REFERENCE_U[layout]);
    const tall = { ...frame, marginBottom: frame.marginTop + card.h + card.space };
    const view = fitToy(bounds, tall);
    const height = Math.min(
      STAGE_HEIGHT,
      Math.ceil(tall.marginTop + (bounds.maxY - bounds.minY) * view.scale + tall.marginBottom)
    );
    return { ...fitToy(bounds, { ...tall, height }), height };
  };
  const rounded = (view: ToyView): ToyView => ({
    scale: Math.round(view.scale * 1000) / 1000,
    ox: Math.round(view.ox * 100) / 100,
    oy: Math.round(view.oy * 100) / 100,
    height: view.height,
  });
  return { wide: rounded(fit('wide')), compact: rounded(fit('compact')) };
}

function assemble(): ToyData {
  const { raw, unseen } = train();
  const place = frameTransform(raw, unseen);

  const positions: Positions[] = raw.map((rawStep) => {
    const out: Positions = {};
    for (const card of CARDS) out[card.id] = roundPoint(place(pointOf(rawStep.positions, card.id)));
    return out;
  });
  const steps: ToyStep[] = raw.map((rawStep, index) => {
    const { pair, unwanted } = rawStep;
    const movedAlong =
      index === 0 || pair === null || unwanted === null
        ? null
        : movedAlongOf(positions[index - 1], positions[index], [pair.a, pair.b, unwanted]);
    return { pair, unwanted, movedAlong };
  });
  const tracks = CARDS.map((card) => ({
    id: card.id,
    xs: positions.map((at) => pointOf(at, card.id).x),
    ys: positions.map((at) => pointOf(at, card.id).y),
  }));
  const unseenOut = unseen.map(({ spec, at }) => ({
    id: spec.id,
    text: spec.text,
    short: spec.short,
    at: roundPoint(place(at)),
  }));
  const cards: ToyCard[] = CARDS.map(({ id, text, short }) => ({ id, text, short }));
  const partial = { cards, tracks, steps, unseen: unseenOut };
  return { ...partial, views: viewsFor(partial) };
}

// ---------------------------------------------------------------------------
// The five story assertions, on the numbers that ship.

function groupOf(id: string): Group {
  const spec = CARDS.find((card) => card.id === id);
  if (spec) return spec.group;
  return byId(UNSEEN_CARDS, id).group;
}

function check(toy: ToyData): string[] {
  const failures: string[] = [];
  const run = toy.steps.length - 1;
  const at = (n: number): Map<string, ToyPoint> => positionsAt(toy.tracks, n);
  const first = at(0);
  const last = at(run);
  const nearestRequest = (state: Map<string, ToyPoint>): string | undefined =>
    nearestTo(pointOf(Object.fromEntries(state), REQUEST), state, REQUEST);

  if (nearestRequest(first) !== OPENING) {
    failures.push(
      `1: at step 0 the card nearest the request is ${nearestRequest(first)}, not ${OPENING}`
    );
  }

  for (let index = 1; index <= run; index += 1) {
    const { pair, unwanted } = toy.steps[index];
    if (pair === null || unwanted === null) {
      failures.push(`2: step ${index} has no example`);
      continue;
    }
    const before = Object.fromEntries(at(index - 1));
    const after = Object.fromEntries(at(index));
    const closer =
      squared(pointOf(after, pair.a), pointOf(after, pair.b)) <
      squared(pointOf(before, pair.a), pointOf(before, pair.b));
    const farther =
      squared(pointOf(after, pair.a), pointOf(after, unwanted)) >
      squared(pointOf(before, pair.a), pointOf(before, unwanted));
    if (!closer) failures.push(`2: step ${index} did not bring ${pair.a} and ${pair.b} closer`);
    if (!farther) failures.push(`2: step ${index} did not push ${unwanted} away from ${pair.a}`);
  }

  for (const card of CARDS) {
    const near = nearestTo(pointOf(Object.fromEntries(last), card.id), last, card.id);
    if (near === undefined || groupOf(near) !== card.group) {
      failures.push(`3: at step ${run} the nearest to ${card.id} is ${near}, in another group`);
    }
  }

  const lastNearest = nearestRequest(last);
  if (lastNearest === undefined || groupOf(lastNearest) !== 'coffee' || lastNearest === REQUEST) {
    failures.push(`4: at step ${run} the card nearest the request is ${lastNearest}`);
  }

  for (const card of toy.unseen) {
    const near = nearestTo(card.at, last);
    if (near === undefined || groupOf(near) !== groupOf(card.id)) {
      failures.push(`5: "${card.text}" lands nearest ${near}, outside its group`);
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// The no-JavaScript plate: two panels, before and after. It uses the live
// piece's own layout (the fit and the ring of free spots around each dot) with
// short labels at 13px. It is written twice from the same code, once per palette,
// because an SVG used as an image cannot see the page's CSS. Both palettes are
// the theme.css values as literals (the accents are the oklch tokens converted to
// sRGB), the dark paper being --c-bg-card under .dark.

type Palette = {
  paper: string;
  text: string;
  secondary: string;
  muted: string;
  border: string;
  borderStrong: string;
  amber: string;
};

const LIGHT: Palette = {
  paper: '#faf5eb',
  text: '#1a1814',
  secondary: '#5c584f',
  muted: '#948c7d',
  border: 'rgba(26,24,20,.12)',
  borderStrong: 'rgba(26,24,20,.22)',
  amber: '#a75d00',
};

const DARK: Palette = {
  paper: '#1c1c20',
  text: '#e6e4df',
  secondary: '#9a9690',
  muted: '#5c5a55',
  border: 'rgba(230,228,223,.10)',
  borderStrong: 'rgba(230,228,223,.20)',
  amber: '#f3b94c',
};

const FONT = 'JetBrains Mono, ui-monospace, monospace';

type Attrs = Readonly<Record<string, string | number | undefined>>;

const num = (v: number): string => String(round3(v));

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

const PLATE_WIDTH = 740;
const PANEL_HEIGHT = 520;
const BAND = 40;
const PLATE_HEIGHT = BAND + PANEL_HEIGHT + BAND + PANEL_HEIGHT;

const FONT_SIZE = 13;
// JetBrains Mono advances 0.6 em per character.
const CHAR_WIDTH = FONT_SIZE * 0.6;
const CARD_PAD = 8;
const CARD_HEIGHT = 26;
const DOT_RADIUS = 6;
// The clear space between the cards and dots and every edge of a panel.
const INNER_MARGIN = 24;
// The strip at the bottom of a panel that holds its note.
const NOTE_STRIP = 20;

const PLATE_TITLE = 'Watching a map learn';
const PLATE_DESC =
  'Eight text cards scattered at random before training, with the opening hours nearest the request. After training, the coffee notes gather near the request, the lattes and the visit information form their own groups, and three descriptions never used in training land among their neighbors.';

type PanelOptions = {
  y: number;
  positions: ReadonlyMap<string, ToyPoint>;
  withUnseen: boolean;
  note: string;
};

function plate(toy: ToyData, ink: Palette): string {
  const shortOf = new Map<string, string>();
  for (const card of toy.cards) shortOf.set(card.id, card.short);
  for (const u of toy.unseen) shortOf.set(u.id, u.short);
  const widths = new Map<string, number>();
  for (const [id, short] of shortOf) widths.set(id, short.length * CHAR_WIDTH + 2 * CARD_PAD);

  // Nothing, a dot or a card, comes nearer a panel edge than INNER_MARGIN. The panel's note
  // sits in the strip below, so the cards and dots stop NOTE_STRIP short of the bottom edge.
  const options = {
    ...cardOptions(PLATE_WIDTH, PANEL_HEIGHT - NOTE_STRIP, 1),
    height: PANEL_HEIGHT - NOTE_STRIP,
    h: CARD_HEIGHT,
    gap: DOT_RADIUS + 4,
    space: 4,
    edge: INNER_MARGIN,
  };
  const frame = {
    ...cardFrame(PLATE_WIDTH, PANEL_HEIGHT - NOTE_STRIP, 1),
    height: options.height,
    marginX: INNER_MARGIN + DOT_RADIUS,
    marginTop: CARD_HEIGHT + options.gap + INNER_MARGIN,
    marginBottom: INNER_MARGIN + DOT_RADIUS,
  };
  const runLength = toy.steps.length;
  const states = Array.from({ length: runLength }, (_, n) => positionsAt(toy.tracks, n));
  const view = fitToy(boundsOf(toy), frame);

  const panel = (o: PanelOptions): string => {
    const positions = new Map(o.positions);
    if (o.withUnseen) for (const u of toy.unseen) positions.set(u.id, u.at);
    const places = declutter(slotsFor(view, positions, widths), options);
    const dot = (id: string): ToyPoint =>
      viewPoint(view, pointOf(Object.fromEntries(positions), id));
    const parts: string[] = [];

    // The dotted link from the request to its nearest card.
    const nearest = nearestTo(
      pointOf(Object.fromEntries(o.positions), REQUEST),
      o.positions,
      REQUEST
    );
    if (nearest === undefined) throw new Error('the request has no neighbor');
    parts.push(
      el('line', {
        x1: dot(REQUEST).x,
        y1: dot(REQUEST).y,
        x2: dot(nearest).x,
        y2: dot(nearest).y,
        stroke: ink.amber,
        'stroke-width': 2,
        'stroke-linecap': 'round',
        'stroke-dasharray': '1 5',
      })
    );
    if (o.withUnseen) {
      for (const u of toy.unseen) {
        const next = nearestTo(u.at, o.positions);
        if (next === undefined) throw new Error(`${u.id} has no neighbor`);
        parts.push(
          el('line', {
            x1: dot(u.id).x,
            y1: dot(u.id).y,
            x2: dot(next).x,
            y2: dot(next).y,
            stroke: ink.muted,
            'stroke-width': 1.5,
            'stroke-linecap': 'round',
            'stroke-dasharray': '1 4',
          })
        );
      }
    }

    const draw = (id: string, isUnseen: boolean): string => {
      const place: Place | undefined = places.get(id);
      const label = shortOf.get(id);
      const w = widths.get(id);
      if (!place || label === undefined || w === undefined) throw new Error(`cannot draw ${id}`);
      const at = dot(id);
      const isQuestion = id === REQUEST;
      const stroke = isQuestion ? ink.amber : ink.borderStrong;
      const out: string[] = [];
      out.push(
        el('line', {
          ...leaderFor(place, w, CARD_HEIGHT, at),
          stroke: ink.borderStrong,
          'stroke-width': 1,
        })
      );
      out.push(
        el('rect', {
          x: place.left,
          y: place.bottom - CARD_HEIGHT,
          width: w,
          height: CARD_HEIGHT,
          rx: 3,
          fill: ink.paper,
          stroke,
          'stroke-width': isQuestion ? 1.5 : 1,
          'stroke-dasharray': isUnseen ? '4 3' : undefined,
        })
      );
      out.push(
        el('circle', {
          cx: at.x,
          cy: at.y,
          r: DOT_RADIUS,
          fill: isQuestion ? ink.amber : ink.text,
          stroke: ink.paper,
          'stroke-width': 1.5,
        })
      );
      out.push(
        el(
          'text',
          {
            x: place.left + w / 2,
            y: place.bottom - CARD_HEIGHT / 2 + FONT_SIZE * 0.35,
            'font-size': FONT_SIZE,
            fill: ink.text,
            'text-anchor': 'middle',
          },
          escapeXml(label)
        )
      );
      return out.join('\n');
    };
    for (const card of toy.cards) parts.push(draw(card.id, false));
    if (o.withUnseen) for (const u of toy.unseen) parts.push(draw(u.id, true));

    parts.push(
      el(
        'text',
        { x: 24, y: PANEL_HEIGHT - 14, 'font-size': 12, fill: ink.secondary },
        escapeXml(o.note)
      )
    );
    const frameRect = el('rect', {
      x: 0.5,
      y: 0.5,
      width: PLATE_WIDTH - 1,
      height: PANEL_HEIGHT - 1,
      fill: 'none',
      stroke: ink.border,
    });
    return el('g', { transform: `translate(0 ${o.y})` }, [frameRect, ...parts].join('\n'));
  };

  const before = states.at(0);
  const after = states.at(runLength - 1);
  if (!before || !after) throw new Error('the run is empty');
  const bandText = (y: number, content: string, fill: string, anchor?: 'end'): string =>
    el(
      'text',
      {
        x: anchor === 'end' ? PLATE_WIDTH - 24 : 24,
        y,
        'font-size': FONT_SIZE,
        fill,
        'font-weight': 700,
        'text-anchor': anchor,
      },
      escapeXml(content)
    );

  return el(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: PLATE_WIDTH,
      height: PLATE_HEIGHT,
      viewBox: `0 0 ${PLATE_WIDTH} ${PLATE_HEIGHT}`,
      role: 'img',
      'aria-labelledby': 'title desc',
      'font-family': FONT,
    },
    [
      el('title', { id: 'title' }, escapeXml(PLATE_TITLE)),
      el('desc', { id: 'desc' }, escapeXml(PLATE_DESC)),
      el('rect', { width: PLATE_WIDTH, height: PLATE_HEIGHT, fill: ink.paper }),
      bandText(26, '07 / LEARNING THE MAP', ink.secondary),
      bandText(26, 'BEFORE TRAINING', ink.secondary, 'end'),
      panel({
        y: BAND,
        positions: before,
        withUnseen: false,
        note: 'The dotted line joins the request to its nearest card.',
      }),
      bandText(BAND + PANEL_HEIGHT + 26, 'AFTER 36 EXAMPLES', ink.secondary),
      panel({
        y: BAND + PANEL_HEIGHT + BAND,
        positions: after,
        withUnseen: true,
        note: 'Dashed cards are descriptions the examples never showed.',
      }),
    ].join('\n')
  );
}

// ---------------------------------------------------------------------------
// Output

// One line per item keeps the committed file diffable without bloating it.
function serialize(toy: ToyData): string {
  const lines = (items: readonly unknown[]): string =>
    items.map((item) => `    ${JSON.stringify(item)}`).join(',\n');
  return [
    '{',
    `  "cards": [\n${lines(toy.cards)}\n  ],`,
    `  "tracks": [\n${lines(toy.tracks)}\n  ],`,
    `  "steps": [\n${lines(toy.steps)}\n  ],`,
    `  "unseen": [\n${lines(toy.unseen)}\n  ],`,
    `  "views": ${JSON.stringify(toy.views)}`,
    '}',
    '',
  ].join('\n');
}

const toy = assemble();
const failures = check(toy);
if (failures.length > 0) {
  console.error('The run does not tell the story. Nothing was written.');
  for (const failure of failures) console.error(`  assertion ${failure}`);
  console.error(
    `Retune SEED, LEARNING_RATE or TEMPERATURE (now ${SEED}, ${LEARNING_RATE}, ${TEMPERATURE}).`
  );
  process.exit(1);
}

writeFileSync(DATA_FILE, serialize(toy));
writeFileSync(PLATE_FILE, `${plate(toy, LIGHT)}\n`);
writeFileSync(PLATE_FILE_DARK, `${plate(toy, DARK)}\n`);

const finalState = positionsAt(toy.tracks, STEPS);
const startState = positionsAt(toy.tracks, 0);
const nearestAt = (state: Map<string, ToyPoint>): string | undefined =>
  nearestTo(pointOf(Object.fromEntries(state), REQUEST), state, REQUEST);
console.log('5 of 5 story assertions hold.');
console.log(
  `nearest the request: step 0 ${nearestAt(startState)}, step ${STEPS} ${nearestAt(finalState)}`
);
for (const card of toy.unseen)
  console.log(`unseen ${card.id}: nearest ${nearestTo(card.at, finalState)}`);
console.log(`07 and 07-dark: ${PLATE_WIDTH}x${PLATE_HEIGHT}`);
