// Piece 1, "Where can the new coffee go?": the flat sweetness-and-nuttiness page
// with a new coffee the reader can drag anywhere. Every spot that pulls it away
// from the first coffee makes the map misstate its sweetness or its nuttiness,
// and the checklist, the brackets and the two readout voices say so.
//
// The first coffee, the juices and the lattes never move; only the new coffee
// does. The dragged coffee is drawn last, so it passes over the lemon juice.

import { DRINKS, FLAT, PLACEMENT, fitFor, project, spriteHeight } from './model';
import {
  HIT_RADIUS_PX,
  applyFrame,
  axisSet,
  button,
  checklist,
  createStageSvg,
  dragHandle,
  drawArrow,
  drawAxes,
  drawGrid,
  easeOut,
  focusRing,
  gridLines,
  h,
  labeler,
  makeArrow,
  observeLayout,
  panel,
  placeStands,
  readout,
  scheduler,
  setAttrs,
  spreadEase,
  spreadGroups,
  sprite,
  svg,
  svgText,
  tween,
} from './stage';
import type { LayoutInfo, MountPiece, Point, Sprite, Tween, Verdict } from './stage';

// ───── The judgment: pure, in integer thousandths ──────────────────────────
//
// Scores are compared as whole thousandths, so 0.1 + 0.05 never lands on the
// wrong side of a threshold through float noise.

type Pos = { s: number; n: number };
type Sign = -1 | 0 | 1;
type Judgement = { apart: boolean; sweet: Sign; nutty: Sign; nearer: boolean };

const MILLI = 1000;
const HOME = Math.round(PLACEMENT.home * MILLI);
const TOLERANCE = Math.round(PLACEMENT.tolerance * MILLI);
const TRY_SPACING = Math.round(PLACEMENT.trySpacing * MILLI);
const LEMON_REFERENCE = Math.round(PLACEMENT.lemonReferenceDistance * MILLI);

const KEY_STEP = 0.05;
const KEY_REST_MS = 600;
const TRIES_TO_CONCLUDE = 3;
const SNAP_MS = 150;
const PUT_BACK_MS = 400;
const HINT_FADE_MS = 300;

const milli = (a: number, b: number): number => Math.round((a - b) * MILLI);
const within = (dx: number, dy: number, limit: number): boolean =>
  dx * dx + dy * dy < limit * limit;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const round3 = (v: number): number => Math.round(v * MILLI) / MILLI;
const leaning = (delta: number): Sign => (delta >= TOLERANCE ? 1 : delta <= -TOLERANCE ? -1 : 0);

function judge(p: Pos): Judgement {
  const deltaS = milli(p.s, PLACEMENT.start.s);
  const deltaN = milli(p.n, PLACEMENT.start.n);
  if (within(deltaS, deltaN, HOME)) return { apart: false, sweet: 0, nutty: 0, nearer: false };
  const lemon = DRINKS['lemon-juice'];
  return {
    apart: true,
    sweet: leaning(deltaS),
    nutty: leaning(deltaN),
    nearer: within(milli(p.s, lemon.s), milli(p.n, lemon.n), LEMON_REFERENCE),
  };
}

// The promise checklist: the sweet row, the nutty row, and the apart row.
function verdicts(j: Judgement): [Verdict, Verdict, Verdict] {
  return [
    j.sweet === 0 ? 'kept' : 'broken',
    j.nutty === 0 ? 'kept' : 'broken',
    j.apart ? 'kept' : 'broken',
  ];
}

// What the map says and what the tongue says, in each state of the spec.
function voices(j: Judgement, returned: boolean): { map: string; tongue: string } {
  if (!j.apart && returned) {
    return {
      map: 'Back on the shared spot. Sweetness and nuttiness are right again.',
      tongue:
        'And the two coffees are mixed up again. The citrus note still needs somewhere to go.',
    };
  }
  if (!j.apart) {
    return {
      map: 'The two coffees share one spot, so the map says they are the same drink.',
      tongue: 'One of them has a bright, citrus note. They are not the same.',
    };
  }
  const leans: string[] = [];
  if (j.sweet !== 0) leans.push(j.sweet > 0 ? 'sweeter' : 'less sweet');
  if (j.nutty !== 0) leans.push(j.nutty > 0 ? 'nuttier' : 'less nutty');
  const bothWrong = j.sweet !== 0 && j.nutty !== 0;
  return {
    map: `The new coffee is ${leans.join(' and ')} than the first.`,
    tongue: bothWrong
      ? 'Both are wrong. They taste equally sweet and equally nutty.'
      : `Take another sip. They are equally ${j.sweet !== 0 ? 'sweet' : 'nutty'}.`,
  };
}

// The muted line: a first-move prompt at home, a hopeful aside once it is nearer
// the lemon juice, and nothing otherwise.
function mutedLine(j: Judgement, returned: boolean, moved: boolean): string {
  if (!j.apart) {
    return returned || moved ? '' : 'Drag the new coffee.';
  }
  return j.nearer ? 'It is nearer the lemon juice now. That part looks promising.' : '';
}

// One key per readout state, so the live region is rewritten only on a change of
// state and never on a change of frame.
function bandOf(j: Judgement, returned: boolean, moved: boolean): string {
  return j.apart ? `apart|${j.sweet}|${j.nutty}|${j.nearer}` : `home|${returned}|${moved}`;
}

const tooSweet = (sign: Sign): string =>
  sign > 0 ? 'sweeter than it tastes' : 'less sweet than it tastes';
const tooNutty = (sign: Sign): string =>
  sign > 0 ? 'nuttier than it tastes' : 'less nutty than it tastes';

// ───── The cast on the page ────────────────────────────────────────────────

// Back to front: the new coffee is last, so it is drawn above everything it passes.
const ORDER = [
  'orange-juice',
  'lemon-juice',
  'latte',
  'hazelnut-latte',
  'ghost',
  'first-coffee',
  'new-coffee',
] as const;

type ItemKey = (typeof ORDER)[number];

// The order drinks take their places at a shared spot, left to right.
const SLOTS: readonly ItemKey[] = [
  'orange-juice',
  'lemon-juice',
  'latte',
  'hazelnut-latte',
  'first-coffee',
  'ghost',
  'new-coffee',
];

const nameOf = (key: ItemKey): string =>
  key === 'ghost'
    ? 'where it started'
    : key === 'first-coffee'
      ? 'first coffee'
      : DRINKS[key].label;

const GHOST_OPACITY = 0.35;
// The name column of a bracket tag, in CSS px left of the nuttiness axis.
const TAG_COLUMN_PX = 34;
// How far the hint tag stands off its arrow, in CSS px, widest first.
const HINT_OFFSET_PX = [10, 6];

type Spot = Point & { anchor: 'start' | 'middle' | 'end' };

// The two places beside a vertical shaft at x: right of it, then left.
const besideShaft = (x: number, y: number, off: number): Spot[] => [
  { x: x + off, y, anchor: 'start' },
  { x: x - off, y, anchor: 'end' },
];

function sharedTag(keys: readonly string[], tight: boolean): string {
  const drinks = keys.filter((key) => key !== 'ghost');
  if (!tight || drinks.length < 2) return '';
  if (
    drinks.length === 2 &&
    drinks.every((key) => key === 'first-coffee' || key === 'new-coffee')
  ) {
    return 'two coffees, one spot';
  }
  return `${drinks.length === 2 ? 'two' : 'three'} drinks, one spot`;
}

// ───── The piece ───────────────────────────────────────────────────────────

const FULL = { grow: 1, label: 1 };

export const mount: MountPiece = (figure, stage, signal) => {
  let info: LayoutInfo = observeLayout(stage, signal, (next, layoutChanged) => {
    info = next;
    if (layoutChanged) fit = fitFor(next.layout, 'page');
    applyFrame(svgEl, fit, next.u);
    render();
  });
  let fit = fitFor(info.layout, 'page');

  const pos: Pos = { s: PLACEMENT.start.s, n: PLACEMENT.start.n };
  let moved = false;
  let returned = false;
  let tries = 0;
  let lastTry: Pos | null = null;
  let hint: 'shown' | 'fading' | 'gone' = 'shown';
  let motion: Tween = { cancel: () => {}, done: Promise.resolve() };
  // Where the coffee is gliding to, while it glides. The words follow it, so a
  // return across the page never announces a spot it only passes through.
  let heading: Pos | null = null;
  let restTimer = 0;
  let grabOffsetX = 0;
  let hitOffsetX = 0;

  // The page. Everything is built once; draw() only sets attributes and text.
  const svgEl = createStageSvg(figure, stage, fit);
  applyFrame(svgEl, fit, info.u);
  const layer = (): SVGGElement => svg('g', { 'aria-hidden': 'true' }, svgEl);

  const floorLayer = layer();
  const grid = gridLines(floorLayer);
  const axisLayer = layer();

  const guideLayer = layer();
  const guide = (): SVGLineElement => svg('line', { class: 'ew-dotted' }, guideLayer);
  const sweetGuides = [guide(), guide()];
  const nuttyGuides = [guide(), guide()];
  const sweetBracket = svg('path', { class: 'ew-bracket' }, guideLayer);
  const nuttyBracket = svg('path', { class: 'ew-bracket' }, guideLayer);

  const drinkLayer = layer();
  // Text layer, above every sprite, so a dragged coffee never covers a name.
  const overlay = layer();
  const make = (key: ItemKey): Sprite =>
    sprite(drinkLayer, key === 'ghost' ? 'black-coffee' : DRINKS[key].sprite, nameOf(key), overlay);
  const sprites: Record<ItemKey, Sprite> = {
    'orange-juice': make('orange-juice'),
    'lemon-juice': make('lemon-juice'),
    latte: make('latte'),
    'hazelnut-latte': make('hazelnut-latte'),
    ghost: make('ghost'),
    'first-coffee': make('first-coffee'),
    'new-coffee': make('new-coffee'),
  };
  const newcomer = sprites['new-coffee'];
  newcomer.name.classList.add('ew-tag-amber');
  const newRing = svg(
    'circle',
    { class: 'ew-ring ew-ring--amber', r: 9, 'aria-hidden': 'true' },
    newcomer.g
  );

  // The ghost: a faded copy of the new coffee inside a dashed ring, no dot.
  const ghost = sprites.ghost;
  ghost.dot.remove();
  ghost.image.setAttribute('opacity', String(GHOST_OPACITY));
  ghost.disc.setAttribute('opacity', String(GHOST_OPACITY));
  ghost.name.classList.add('ew-tag-muted');
  const ghostRing = svg('circle', { class: 'ew-ring ew-drop', 'aria-hidden': 'true' }, ghost.g);

  const axes = axisSet(axisLayer, overlay, false);
  const sharedLabel = svgText(overlay, 'ew-tag-muted', '');
  const sweetTag = svgText(overlay, 'ew-tag-red', '');
  const nuttyTag = svgText(overlay, 'ew-tag-red', '');
  const hintGroup = svg('g', {}, overlay);
  const hintArrow = makeArrow(hintGroup, 'ew-hint', 'ew-head ew-head--amber');
  const hintTag = svgText(hintGroup, 'ew-tag-amber', 'toward the lemon juice');

  // The one focusable thing: a slider group holding the hit circle and its ring.
  const slider = svg(
    'g',
    {
      tabindex: 0,
      role: 'slider',
      'aria-label': 'New coffee. Arrow keys move it, Home puts it back.',
      'aria-valuemin': 0,
      'aria-valuemax': 2,
      'aria-valuenow': 0,
    },
    svgEl
  );
  const hit = svg('circle', { 'aria-hidden': 'true' }, slider);
  const ring = focusRing(slider);

  // The panel: promises, the two voices, the button, and the verdict after 3 tries.
  const pnl = panel(stage);
  const promises = checklist(pnl);
  const voice = readout(pnl);
  const controls = h('div', 'ew-controls', undefined, pnl);
  button(controls, 'Put it back', putBack, signal);
  const triesNote = h('p', 'ew-note', undefined, pnl);
  triesNote.setAttribute('aria-live', 'polite');
  triesNote.hidden = true;

  const where = (s: number, n: number): { x: number; y: number } => {
    const { x, y } = project({ s, n, c: 0 }, FLAT, fit);
    return { x, y };
  };

  // The inverse of the flat camera (yaw 0, kN 1, kC 0): a point on the page, in
  // user units, back to scores. Clamped to the page and rounded to thousandths.
  function toScores(x: number, y: number): Pos {
    return {
      s: clamp01(round3((x - fit.cx) / fit.K + 0.5)),
      n: clamp01(round3((fit.cy - y) / (fit.K * Math.sin(FLAT.pitch)) + 0.5)),
    };
  }

  function anchorOf(key: ItemKey): Pos {
    if (key === 'ghost') return PLACEMENT.start;
    return key === 'new-coffee' ? pos : DRINKS[key];
  }

  const eased = spreadEase(signal, () => render());
  let lastBand = '';

  function draw(): void {
    const { u, layout } = info;
    const spriteH = spriteHeight(layout);
    const j = judge(pos);
    // The words and the checklist follow where the coffee is going.
    const said = judge(heading ?? pos);
    const book = labeler(fit, u);
    const start = where(PLACEMENT.start.s, PLACEMENT.start.n);
    const here = where(pos.s, pos.n);
    const left = where(0, 0).x;
    const bottom = where(0, 0).y;
    const nameRow = 18 * u;
    const showSweet = j.apart && j.sweet !== 0;
    const showNutty = j.apart && j.nutty !== 0;

    // The chrome is piece 2's page, drawn by the same helpers. The axes claim
    // their lines, then the nuttiness tag and every guide (the level ones to the
    // axis, the upright ones down to it), so no name lands on any of them: a name
    // beside a guide steps aside to the side of it. While the sweetness bracket
    // shows, its tag takes the row under the axis and the axis name moves down a row.
    drawGrid(grid, where);
    drawAxes(
      axes,
      (taste) => where(taste.s, taste.n),
      [{ ...FULL, away: showSweet ? 14 : 0 }, FULL],
      book,
      u
    );
    const cap = 5 * u;
    for (const el of [sweetBracket, sweetTag, ...sweetGuides]) {
      el.setAttribute('display', showSweet ? 'inline' : 'none');
    }
    for (const el of [nuttyBracket, nuttyTag, ...nuttyGuides]) {
      el.setAttribute('display', showNutty ? 'inline' : 'none');
    }
    if (showNutty) {
      // The nuttiness tag stands in its column beside the bracket, turned to read
      // upward. Longer than a short bracket, it may reach above the bracket but
      // never below the bottom axis, into the row of names under it. Its box and
      // the air between it and the axis are claimed, so no name squeezes in.
      nuttyTag.textContent = tooNutty(j.nutty);
      const half = nuttyTag.getComputedTextLength() / 2;
      const tagBox = book.put(
        nuttyTag,
        left - TAG_COLUMN_PX * u,
        Math.min((start.y + here.y) / 2, bottom - 6 * u - half),
        {
          angle: -90,
        }
      );
      book.avoid({ ...tagBox, x1: left });
      book.avoidLine({ x: left, y: start.y }, start);
      book.avoidLine({ x: left, y: here.y }, here);
    }
    if (showSweet) {
      book.avoidLine(start, { x: start.x, y: bottom });
      book.avoidLine(here, { x: here.x, y: bottom });
    }

    // Drinks stand on their dots; those within a sprite of each other spread.
    const seen = SLOTS.filter((key) => key !== 'ghost' || j.apart);
    const stands = seen.map((key) => {
      const a = anchorOf(key);
      return { key, sprite: sprites[key], ...where(a.s, a.n) };
    });
    const spread = spreadGroups(stands);
    eased.retarget(spread.offsets);
    for (const key of ORDER) sprites[key].show(seen.includes(key));
    // The ghost's name stands beside the dashed cup it names: above its ring, right
    // of it at dot level, left of it, or right of it, and only then a row under its
    // group, before it would wander off.
    const side = spriteH / 2 + 6 * u;
    const ghostSpots = (s: Point): Spot[] => [
      { x: s.x - spriteH / 2, y: s.y - spriteH - 4 * u, anchor: 'start' },
      { x: s.x + 0.4 * spriteH + 6 * u, y: s.y + 4 * u, anchor: 'start' },
      { x: s.x, y: s.y - spriteH - 4 * u, anchor: 'middle' },
      { x: s.x - side, y: s.y - spriteH / 2 + 4 * u, anchor: 'end' },
      { x: s.x + side, y: s.y - spriteH / 2 + 4 * u, anchor: 'start' },
      { x: s.x - spriteH / 2, y: s.y + nameRow + 14 * u, anchor: 'start' },
    ];
    // Once moved, the new coffee is named first (it is what moves, so the still
    // drinks settle around it), then the first coffee, whose name has a place of
    // its own on a phone, then the ghost of where it started, whose name is the
    // most free to move. Then the new coffee's ring is claimed, when it stands
    // alone, so no other name stands beside it and reads as its label. On a
    // phone the first coffee's name starts just right of the nuttiness axis,
    // which would cut it under its cup, at the book's 6 px of air: only there
    // while the two coffees share the spot, there first once it stands alone.
    const ringClear = (9 + 4) * u;
    const alone = !spread.groups.some((group) => group.keys.includes('new-coffee'));
    const texts = placeStands({
      stands,
      spread,
      eased,
      book,
      more: (s) => (s.key === 'ghost' ? ghostSpots(s) : []),
      h: spriteH,
      u,
      // The shared tag is placed below, once the hint arrow has claimed its shaft.
      tagFor: () => '',
      tags: [],
      pin:
        layout === 'compact' ? { key: 'first-coffee', x: left + 6 * u, only: !j.apart } : undefined,
      lead: j.apart
        ? {
            keys: ['new-coffee', 'first-coffee', 'ghost'],
            claims: alone
              ? [
                  {
                    x0: here.x - ringClear,
                    x1: here.x + ringClear,
                    y0: here.y - ringClear,
                    y1: here.y + ringClear,
                  },
                ]
              : [],
          }
        : undefined,
    });
    setAttrs(ghostRing, {
      cx: start.x + eased.offset('ghost'),
      cy: start.y - spriteH / 2,
      r: spriteH / 2,
    });

    // The brackets run along the axes, from the start value to the current one.
    // Their tags stand outside the page, clear of every drink: centered under the
    // bracket in the name row below the bottom axis for sweetness (a row lower
    // when a juice's name holds that row), in a column left of the left axis for
    // nuttiness.
    if (showSweet) {
      sweetBracket.setAttribute(
        'd',
        `M${start.x} ${bottom - cap}V${bottom + cap}M${start.x} ${bottom}H${here.x}M${here.x} ${bottom - cap}V${bottom + cap}`
      );
      sweetTag.textContent = tooSweet(j.sweet);
      book.put(sweetTag, (start.x + here.x) / 2, bottom + nameRow, { stack: 1 });
      setAttrs(sweetGuides[0], { x1: start.x, x2: start.x, y1: start.y, y2: bottom });
      setAttrs(sweetGuides[1], { x1: here.x, x2: here.x, y1: here.y, y2: bottom });
    }
    if (showNutty) {
      nuttyBracket.setAttribute(
        'd',
        `M${left - cap} ${start.y}H${left + cap}M${left} ${start.y}V${here.y}M${left - cap} ${here.y}H${left + cap}`
      );
      setAttrs(nuttyGuides[0], { x1: left, x2: start.x, y1: start.y, y2: start.y });
      setAttrs(nuttyGuides[1], { x1: left, x2: here.x, y1: here.y, y2: here.y });
    }

    // The hint: a dashed arrow from below the new coffee's names down toward the
    // lemon juice.
    const x = start.x + eased.offset('new-coffee');
    let shaft: { from: number; tip: number } | null = null;
    if (hint !== 'gone') {
      const lemon = where(DRINKS['lemon-juice'].s, DRINKS['lemon-juice'].n);
      const tip = lemon.y - spriteH - 6;
      const below = texts
        .filter((box) => box.x0 <= x && x <= box.x1 && box.y0 > start.y && box.y0 < tip)
        .map((box) => box.y1);
      const from = Math.max(start.y, ...below) + 8;
      if (drawArrow(hintArrow, { x, y: from }, { x, y: tip }, u)) {
        book.avoidLine({ x, y: from }, { x, y: tip });
      }
      shaft = { from, tip };
    }

    // The hint tag stands beside the arrow on whichever side is free, from the tip
    // back along the shaft (and a little past it), and comes in closer before it
    // gives up a side. It never hides, and being the most tightly placed it goes
    // first.
    if (shaft) {
      const { from, tip } = shaft;
      const along = [0.9, 0.7, 0.5, 0.3].map((share) => from + (tip - from) * share);
      const beside = [...along, tip + 14 * u].flatMap((y) =>
        HINT_OFFSET_PX.flatMap((off) => besideShaft(x, y, off * u))
      );
      book.put(hintTag, x + 10 * u, tip - 4 * u, { anchor: 'start', tries: beside });
    }

    // The shared tag stands under the names of its group, on the side of the hint
    // arrow that is free, or above the cups when the page is too full below them.
    const group = spread.groups.at(0);
    const shared = group ? sharedTag(group.keys, group.tight) : '';
    sharedLabel.textContent = shared;
    sharedLabel.setAttribute('display', shared === '' ? 'none' : 'inline');
    if (group && shared !== '') {
      const above = group.y - spriteH - 8 * u;
      // Beside the cups, level with the middle of the sprites, is the place nearest
      // them; a group of two spreads 18 units either way of its center.
      const tries: Spot[] = [
        {
          x: group.x + 18 + spriteH / 2 + 4 * u,
          y: group.y - spriteH / 2 + 4 * u,
          anchor: 'start',
        },
        ...(shaft ? besideShaft(x, group.y + nameRow, 10 * u) : []),
        { x: group.x, y: above, anchor: 'middle' },
        { x: group.x, y: above, anchor: 'start' },
        { x: group.x, y: above, anchor: 'end' },
      ];
      book.put(sharedLabel, group.x, group.y + nameRow, {
        stack: 1,
        anchor: ['middle', 'end', 'start'],
        tries,
      });
    }

    // The new coffee's grab target and focus ring follow the drawn sprite.
    hitOffsetX = eased.offset('new-coffee');
    const center = { x: here.x + hitOffsetX, y: here.y - spriteH / 2 };
    setAttrs(hit, { cx: center.x, cy: center.y, r: HIT_RADIUS_PX * u });
    setAttrs(ring, { cx: center.x, cy: center.y, r: spriteH / 2 + 4 * u });
    setAttrs(newRing, { cx: here.x, cy: here.y });

    // The panel.
    const [sweetV, nuttyV, apartV] = verdicts(said);
    promises.set(sweetV, nuttyV, apartV);
    const band = bandOf(said, returned, moved);
    if (band !== lastBand) {
      lastBand = band;
      const say = voices(said, returned);
      const note = mutedLine(said, returned, moved);
      const rows = [row('The map says', say.map), row('Your tongue says', say.tongue)];
      if (note !== '') rows.push(h('div', 'ew-row ew-note', note));
      voice.set(band, rows);
      slider.setAttribute('aria-valuetext', say.map);
    }
    slider.setAttribute(
      'aria-valuenow',
      (
        Math.hypot(milli(pos.s, PLACEMENT.start.s), milli(pos.n, PLACEMENT.start.n)) / MILLI
      ).toFixed(2)
    );
    controls.hidden = !said.apart;
  }

  const render = scheduler(draw, signal);

  function row(label: string, text: string): HTMLDivElement {
    const el = h('div', 'ew-row');
    h('span', 'ew-row__label', label, el);
    h('p', '', text, el);
    return el;
  }

  // The first pointerdown or key press fades the hint, and it never returns.
  function dismissHint(): void {
    if (hint !== 'shown') return;
    hint = 'fading';
    void tween({
      ms: HINT_FADE_MS,
      signal,
      onFrame: (p) => hintGroup.setAttribute('opacity', String(1 - p)),
    }).done.then(() => {
      hint = 'gone';
      hintGroup.setAttribute('display', 'none');
    });
  }

  // Moves the new coffee to a spot over ms. A reader's touch cancels it.
  function glide(to: Pos, ms: number): void {
    motion.cancel();
    const from: Pos = { s: pos.s, n: pos.n };
    heading = to;
    motion = tween({
      ms,
      ease: easeOut,
      signal,
      onFrame: (p) => {
        pos.s = p === 1 ? to.s : from.s + (to.s - from.s) * p;
        pos.n = p === 1 ? to.n : from.n + (to.n - from.n) * p;
        render();
      },
    });
    void motion.done.then(() => {
      if (heading === to) heading = null;
      render();
    });
  }

  function putBack(): void {
    dismissHint();
    returned = true;
    glide(PLACEMENT.start, PUT_BACK_MS);
    slider.focus();
  }

  // The reader lets go: inside the home zone the coffee snaps back, anywhere
  // else it stays put and, if it is a new spot, counts as a try.
  function settle(): void {
    const j = judge(pos);
    if (!j.apart) {
      glide(PLACEMENT.start, SNAP_MS);
      return;
    }
    if (lastTry !== null && within(milli(pos.s, lastTry.s), milli(pos.n, lastTry.n), TRY_SPACING)) {
      return;
    }
    lastTry = { s: pos.s, n: pos.n };
    tries += 1;
    if (tries >= TRIES_TO_CONCLUDE) {
      triesNote.hidden = false;
      triesNote.textContent = `You tried ${tries} spots. Every spot that pulls the coffees apart breaks a promise.`;
    }
  }

  dragHandle(
    hit,
    svgEl,
    signal,
    (x, y) => {
      motion.cancel();
      returned = false;
      moved = true;
      const at = toScores(x - grabOffsetX, y + spriteHeight(info.layout) / 2);
      pos.s = at.s;
      pos.n = at.n;
      render();
    },
    settle
  );
  hit.addEventListener(
    'pointerdown',
    () => {
      dismissHint();
      motion.cancel();
      grabOffsetX = hitOffsetX;
      // A grab is a click on the slider: the arrow keys work from here. The
      // focus ring stays hidden after a pointer grab until a key is pressed
      // (Tab included, which fires here before the focus leaves).
      ring.style.display = 'none';
      slider.focus({ preventScroll: true });
    },
    { signal }
  );

  slider.addEventListener(
    'keydown',
    (ev) => {
      ring.style.display = '';
      let ds = 0;
      let dn = 0;
      switch (ev.key) {
        case 'ArrowLeft':
          ds = -KEY_STEP;
          break;
        case 'ArrowRight':
          ds = KEY_STEP;
          break;
        case 'ArrowUp':
          dn = KEY_STEP;
          break;
        case 'ArrowDown':
          dn = -KEY_STEP;
          break;
        case 'Home':
          ev.preventDefault();
          if (judge(pos).apart) putBack();
          return;
        default:
          return;
      }
      ev.preventDefault();
      dismissHint();
      motion.cancel();
      // A key during a glide steps from where the glide was going, not from the
      // frame it happened to be on.
      if (heading !== null) {
        pos.s = heading.s;
        pos.n = heading.n;
        heading = null;
      }
      returned = false;
      moved = true;
      pos.s = clamp01(round3(pos.s + ds));
      pos.n = clamp01(round3(pos.n + dn));
      render();
      window.clearTimeout(restTimer);
      restTimer = window.setTimeout(settle, KEY_REST_MS);
    },
    { signal }
  );
  signal.addEventListener('abort', () => window.clearTimeout(restTimer), { once: true });

  draw();
};
