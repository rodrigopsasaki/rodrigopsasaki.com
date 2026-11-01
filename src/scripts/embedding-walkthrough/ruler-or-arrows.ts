// Piece 3, "Ruler or arrows": the same three cups asked two ways. A ruler picks
// the citrus-led cup as nearest. Arrows from the start show the gentle and
// pronounced cups pointing the same way. Then the reader makes a cup of their own
// and sees that strength stretches an arrow while only balance turns it.
//
// Every distance and direction score comes from model.ts on the full three-number
// addresses. The drawing only shows them, so it can never be the source of a number.
import {
  CUPS,
  CUPS_EXTENT,
  CUPS_YAW,
  ROOM,
  cosine,
  cupSpriteHeight,
  cupsLift,
  distance,
  fitCups,
  lineSpots,
  normalize,
  project,
} from './model';
import type { Anchor, Camera, CupId, Fit, Layout, Projected, Taste } from './model';
import {
  applyFrame,
  axisSet,
  button,
  claimAir,
  claimArrow,
  createStageSvg,
  drawArrow,
  drawAxes,
  drawGrid,
  focusFrame,
  gridLines,
  h,
  headBox,
  labeler,
  makeArrow,
  observeLayout,
  panel,
  placeStands,
  range,
  readout,
  reorder,
  scheduler,
  setAttrs,
  sizeFocusFrame,
  spreadEase,
  spreadGroups,
  sprite,
  svg,
  svgText,
  track,
  tween,
  turnGesture,
} from './stage';
import type { Arrow, LayoutInfo, MountPiece, Point, Sprite, Tween } from './stage';
import { cuts } from './toy-layout';

// ───── Data ────────────────────────────────────────────────────────────────

const vec = (t: Taste): number[] => [t.s, t.n, t.c];
const taste = (v: readonly number[]): Taste => ({ s: v[0], n: v[1], c: v[2] });

const START: Taste = { s: 0, n: 0, c: 0 };
const GENTLE = vec(CUPS.gentle);
const GENTLE_HAT = normalize(GENTLE);
const CITRUS_HAT = normalize(vec(CUPS['citrus-led']));
// The gentle arrow's length: strength 1.00 means "as long as the gentle arrow".
const GENTLE_LENGTH = Math.hypot(...GENTLE);
const RULER_PRONOUNCED = distance(GENTLE, vec(CUPS.pronounced));
const RULER_CITRUS = distance(GENTLE, vec(CUPS['citrus-led']));

// The gentle and pronounced arrows lie on one ray. It leaves the unit cube where
// its largest score reaches 1.
const RAY_EXIT = taste(GENTLE_HAT.map((x) => x / Math.max(...GENTLE_HAT)));

const STRENGTH = { min: 0.5, max: 2.5, step: 0.05, rest: 1, snapTo: 2, snapWithin: 0.07 };
const LEAN = { min: 0, max: 1, step: 0.05, rest: 0 };

// Where the two tracks end. Distance: the farthest the ranges can reach is about
// 0.73. Direction: the cosine of the farthest turn is about 0.90, so the bar
// starts at 0.8 and 1.00 fills it.
const FAR = 0.75;
const DIRECTION_FLOOR = 0.8;

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

// Your cup: strength stretches the gentle arrow's length along a direction that
// mixes the two unit directions, so lean 1 is exactly the citrus-led direction.
function yourCup(strength: number, lean: number): Taste {
  const direction = normalize(GENTLE_HAT.map((x, i) => (1 - lean) * x + lean * CITRUS_HAT[i]));
  return taste(direction.map((x) => strength * GENTLE_LENGTH * x));
}

// Banded on the score as the reader sees it, rounded to two decimals, so the
// word and the number can never disagree.
function directionWord(score: number): string {
  const shown = Number(score.toFixed(2));
  if (shown >= 1) return 'same way';
  if (shown >= 0.97) return 'nearly the same way';
  if (shown >= 0.92) return 'turned a little';
  return 'clearly turned';
}

// The first matching rule wins.
function sentence(strength: number, lean: number, apart: number, score: number): string {
  const d = apart.toFixed(2);
  const straight = near(lean, 0);
  if (straight && near(strength, 1)) return 'Your cup is the gentle cup. Same spot, same arrow.';
  if (straight && Math.abs(strength - 2) < 0.0005) {
    return `Your cup landed on the pronounced cup. Twice as strong, ${d} apart, and the arrow never turned.`;
  }
  if (straight && strength > 1) {
    return `Stronger, same balance. The arrow got longer and did not turn. It is ${d} apart from the gentle cup, and the direction score is still 1.00.`;
  }
  if (straight) {
    return `Milder, same balance. The arrow got shorter and did not turn. It is ${d} apart from the gentle cup, and the direction score is still 1.00.`;
  }
  if (near(lean, 1)) {
    return `Your cup now has the citrus-led balance. The arrow turned, and the direction score is ${score.toFixed(2)}, the same as the citrus-led cup's.`;
  }
  const word = directionWord(score);
  if (word === 'same way') {
    return `The balance moved a hair. The arrow turned too little to show at two decimals. Direction score ${score.toFixed(2)}.`;
  }
  return `The balance changed, so the arrow turned: ${word}. Direction score ${score.toFixed(2)}.`;
}

const TONGUE =
  "The pronounced cup has the gentle cup's balance, only more of it. The citrus-led cup has a different balance. A ruler counts strength and balance together.";
const PROMPT =
  'Which cup is most like the gentle one? Before drawing any arrows, ask the map the way we have asked it so far: which cup is nearest?';
// After both ranges have moved, the end line says what each measure noticed. It
// follows the rounded direction score, so it never disagrees with the sentence
// above it: at 1.00 the arrows noticed nothing.
const endLine = (score: number): string =>
  `The ruler noticed both changes. ${directionWord(score) === 'same way' ? 'To the arrows, nothing changed.' : 'The arrows noticed only the turn.'}`;
const TURN_HINT =
  'Drag sideways to turn the room. From every side, those two arrows stay on one line.';

// ───── Motion and view constants ───────────────────────────────────────────

const DEGREES = Math.PI / 180;
const YAW = { min: 10 * DEGREES, max: 80 * DEGREES, perPx: 0.4 * DEGREES, perKey: 5 * DEGREES };
const RING_RADIUS = 9;
// How far an arrow's tip stops short of the dot, in user units.
const DOT_CLEARANCE = 7;

// One timeline for the arrows, in ms: each draws over 600 with a 150 stagger,
// then the shared beam fades in.
const DRAW_MS = 600;
const ARROW_DELAY = { gentle: 0, pronounced: 150, 'citrus-led': 300 };
const BEAM_AT = 750;
const BEAM_FADE_MS = 300;
const RULER_FADE_MS = 300;
const ARROWS_MS = BEAM_AT + BEAM_FADE_MS;
const RULER_FADED = 0.3;
const BEAM_OPACITY = 0.6;
const YOURS_MS = 150;
// The frame follows the cups: turning the room or stretching your cup can carry a
// cup above the top margin, and the drawing eases down just far enough to keep it
// in, then back up, over the tween piece 2's unturn uses.
const LIFT_MS = 300;
// The turn arc hangs 0.15 from the start, in score units, sampled in 16 steps.
const ARC_RADIUS = 0.15;
const ARC_STEPS = 16;
const YOURS_APPEARS_AFTER_MS = 300;

// Where a ruler tag may stand: along its line (0 is the gentle cup, 1 the other),
// and how far out from it, in CSS px, on either side.
const RULER_TAG_ALONG: readonly number[] = [0.5, 0.4, 0.6, 0.3, 0.7, 0.85];
const RULER_TAG_OFFSETS: readonly number[] = [14, 26, 40, 56];
// The citrus axis name stands this far (CSS px) above its arrowhead.
const CITRUS_NAME_PX = 8;

const linear = (p: number): number => p;

type CupKey = CupId | 'yours';
const ARROW_CUPS: readonly CupId[] = ['gentle', 'pronounced', 'citrus-led'];
const CUP_KEYS: readonly CupKey[] = [...ARROW_CUPS, 'yours'];

type Cup = { sprite: Sprite; drop: SVGLineElement; shadow: SVGEllipseElement };

type View = { info: LayoutInfo; fit: Fit };

const fits: Partial<Record<Layout, Fit>> = {};
function fitOf(layout: Layout): Fit {
  const known = fits[layout];
  if (known) return known;
  const fresh = fitCups(layout);
  fits[layout] = fresh;
  return fresh;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

type Segment = readonly [Point, Point];

// Whether two segments cross somewhere strictly inside both, so a segment that
// only touches another at an end does not count.
function crosses([a, b]: Segment, [c, d]: Segment): boolean {
  const side = (p: Point, q: Point, r: Point): number =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (denominator === 0) return false;
  const t = side(c, d, a) / denominator;
  const s = -side(a, b, c) / denominator;
  return t > 0.02 && t < 0.98 && s > 0.02 && s < 0.98;
}

// A place a label may stand, with the end of its text at (x, y).
type Spot = Point & { anchor: Anchor };

const FULL = { grow: 1, label: 1 };

export const mount: MountPiece = (figure, stage, signal) => {
  // ── State: what the reader has done. Everything drawn derives from it. ──
  const state = {
    yaw: CUPS_YAW,
    measured: false,
    drawn: false,
    turnedSince: false,
    rulerP: 0,
    arrowP: 0,
    yoursOn: false,
    strength: STRENGTH.rest,
    lean: LEAN.rest,
    // What the picture shows; it eases toward strength and lean over 150ms.
    shownStrength: STRENGTH.rest,
    shownLean: LEAN.rest,
    // How far the drawing stands below its resting fit, and what the picture shows.
    lift: 0,
    shownLift: 0,
  };

  const firstInfo = observeLayout(stage, signal, onLayout);
  let view: View = { info: firstInfo, fit: fitOf(firstInfo.layout) };
  const camera = (): Camera => ({ ...ROOM, yaw: state.yaw });

  // ── Scene, built once ──
  const svgEl = createStageSvg(figure, stage, view.fit);
  svgEl.setAttribute('tabindex', '0');
  svgEl.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight');
  const frame = focusFrame(svgEl);

  const floor = svg('g', { 'aria-hidden': 'true' }, svgEl);
  const grid = gridLines(floor);
  const axisLayer = svg('g', { 'aria-hidden': 'true' }, svgEl);
  const drops = svg('g', { 'aria-hidden': 'true' }, svgEl);

  // Ruler lines draw with stroke-dashoffset over a normalized path length.
  const rulers = svg('g', { 'aria-hidden': 'true' }, svgEl);
  const rulerLine = (): SVGLineElement =>
    svg(
      'line',
      { class: 'ew-ruler', pathLength: 1, 'stroke-dasharray': '1 2', 'stroke-dashoffset': 1 },
      rulers
    );
  const rulerToPronounced = rulerLine();
  const rulerToCitrus = rulerLine();

  const beam = svg('line', { class: 'ew-beam', opacity: 0, 'aria-hidden': 'true' }, svgEl);
  const arrows = svg('g', { 'aria-hidden': 'true' }, svgEl);
  const arrowOf: Record<CupId, Arrow> = {
    gentle: makeArrow(arrows, 'ew-arrow', 'ew-head'),
    pronounced: makeArrow(arrows, 'ew-arrow', 'ew-head'),
    'citrus-led': makeArrow(arrows, 'ew-arrow', 'ew-head'),
  };
  const yoursArrow = makeArrow(arrows, 'ew-arrow ew-arrow--amber', 'ew-head ew-head--amber');
  const arc = svg('path', { class: 'ew-arc', display: 'none', 'aria-hidden': 'true' }, svgEl);

  // The three cups and yours, drawn farthest first inside one dedicated group, and
  // the text layer above them, which holds every name so no cup can cover one.
  const cupLayer = svg('g', {}, svgEl);
  const labels = svg('g', {}, svgEl);
  const makeCup = (name: string): Cup => ({
    sprite: sprite(cupLayer, 'black-coffee', name, labels),
    drop: svg('line', { class: 'ew-drop' }, drops),
    shadow: svg('ellipse', { class: 'ew-shadow' }, drops),
  });
  const cups: Record<CupKey, Cup> = {
    gentle: makeCup('gentle'),
    pronounced: makeCup('pronounced'),
    'citrus-led': makeCup('citrus-led'),
    yours: makeCup('your cup'),
  };
  cups.yours.sprite.name.setAttribute('class', 'ew-name ew-tag-amber');
  cups.yours.sprite.image.setAttribute('opacity', '0.85');
  cups.yours.sprite.show(false);
  cups.yours.drop.setAttribute('display', 'none');
  cups.yours.shadow.setAttribute('display', 'none');
  const yoursRing = svg(
    'circle',
    { class: 'ew-ring ew-ring--amber', r: RING_RADIUS, 'aria-hidden': 'true' },
    cups.yours.sprite.g
  );
  const nearestRing = svg(
    'circle',
    { class: 'ew-ring ew-ring--red', r: RING_RADIUS, opacity: 0, 'aria-hidden': 'true' },
    cups['citrus-led'].sprite.g
  );

  const axes = axisSet(axisLayer, labels, true);
  const startDot = svg('circle', { class: 'ew-dot', r: 5, 'aria-hidden': 'true' }, labels);
  const startTag = svgText(labels, 'ew-tag-muted', 'start: every score zero');
  const rulerTagPronounced = svgText(
    labels,
    'ew-tag-muted',
    `${RULER_PRONOUNCED.toFixed(2)} apart`
  );
  const rulerTagCitrus = svgText(labels, 'ew-tag-muted', `${RULER_CITRUS.toFixed(2)} apart`);
  const nearestTag = svgText(labels, 'ew-tag-red', 'nearest');
  const beamTag = svgText(labels, 'ew-tag-blue', 'one direction');
  const spotTag = svgText(labels, 'ew-tag-muted', 'two cups, one spot');

  // ── Panel: story, step button, hint, then your cup's controls ──
  const pane = panel(stage);
  const story = readout(pane);
  const stepRow = h('div', 'ew-controls', undefined, pane);
  const stepButton = button(stepRow, 'Measure with a ruler', onStep, signal);
  const hint = h('p', 'ew-note', TURN_HINT, pane);
  hint.hidden = true;

  const yoursBox = h('div', '', undefined, pane);
  yoursBox.hidden = true;
  let strengthIsPointer = false;
  const strengthRange = range(
    yoursBox,
    {
      label: 'Stronger or milder',
      ...STRENGTH,
      value: STRENGTH.rest,
      format: (v) => `x${v.toFixed(2)}`,
      onInput(value) {
        state.strength = value;
        yoursChanged();
      },
      onChange(value) {
        // A release near x2.00 snaps there. Keyboard steps never snap, or the
        // arrow keys could not pass x2.00.
        const pointer = strengthIsPointer;
        strengthIsPointer = false;
        const snaps =
          pointer &&
          !near(value, STRENGTH.snapTo) &&
          Math.abs(value - STRENGTH.snapTo) <= STRENGTH.snapWithin;
        if (snaps) {
          strengthRange.setValue(STRENGTH.snapTo);
          state.strength = STRENGTH.snapTo;
          yoursChanged();
        }
        announce();
      },
    },
    signal
  );
  strengthRange.input.addEventListener('pointerdown', () => (strengthIsPointer = true), { signal });
  strengthRange.input.addEventListener('keydown', () => (strengthIsPointer = false), { signal });
  const leanRange = range(
    yoursBox,
    {
      label: 'Lean toward the citrus-led balance',
      ...LEAN,
      value: LEAN.rest,
      format: (v) => v.toFixed(2),
      ticks: ['gentle balance', 'citrus-led balance'],
      onInput(value) {
        state.lean = value;
        yoursChanged();
      },
      onChange: () => announce(),
    },
    signal
  );
  const says = readout(yoursBox);
  const apartTrack = track(yoursBox, {
    label: 'How far apart?',
    from: 'same spot',
    to: 'far',
    tone: 'amber',
  });
  const directionTrack = track(yoursBox, {
    label: 'Same direction?',
    from: 'different',
    to: 'same',
    tone: 'blue',
    note: '1.00 means exactly the same way.',
  });
  const resetRow = h('div', 'ew-controls', undefined, yoursBox);
  button(resetRow, 'Reset', onReset, signal);

  // ── Drawing ──
  function draw(): void {
    const { info } = view;
    const { u } = info;
    const fit: Fit = { ...view.fit, cy: view.fit.cy + state.shownLift };
    const cam = camera();
    const at = (t: Taste): Projected => project(t, cam, fit);
    // The axes and the floor run only as far as the frame was fitted to.
    const short = (t: Taste): Projected =>
      at({ s: t.s * CUPS_EXTENT, n: t.n * CUPS_EXTENT, c: t.c * CUPS_EXTENT });
    const spriteH = cupSpriteHeight(info.layout);
    const compact = info.layout === 'compact';
    const book = labeler(fit, u);
    // Every line that has a length to read (an axis, a ruler, an arrow, the beam)
    // drawn this frame, so a ruler number can tell when one of them stands between
    // it and its own ruler. Drop lines and the arc are claimed but not listed.
    const lines: Segment[] = [];
    const claim = (a: Point, b: Point): void => {
      book.avoidLine(a, b);
      lines.push([a, b]);
    };

    // Where each cup stands. Yours is always computed, so its depth is known
    // even while it is hidden.
    const addresses: Record<CupKey, Taste> = {
      ...CUPS,
      yours: yourCup(state.shownStrength, state.shownLean),
    };
    const points: Record<CupKey, Projected> = {
      gentle: at(addresses.gentle),
      pronounced: at(addresses.pronounced),
      'citrus-led': at(addresses['citrus-led']),
      yours: at(addresses.yours),
    };
    const standing = CUP_KEYS.filter((key) => key !== 'yours' || state.yoursOn);

    // The cups' painted discs are claimed first, so the third axis name, which
    // stands above its tip close to the citrus-led cup, can move off them.
    for (const key of standing) {
      const p = points[key];
      book.avoid({
        x0: p.x - 0.45 * spriteH,
        x1: p.x + 0.45 * spriteH,
        y0: p.y - spriteH,
        y1: p.y,
      });
    }

    // Lines are claimed in the label book before any name or tag is placed, so
    // text slides off them: the axes first, then rulers, arrows, the beam and the
    // arc. The third axis name is placed after the cups, once they have settled.
    const citrusName = axes.at(2)?.label;
    const tip = short({ s: 0, n: 0, c: 1 });
    drawGrid(grid, (s, n) => short({ s, n, c: 0 }));
    drawAxes(axes, short, [FULL, FULL, { grow: 1, label: 0 }], book, u);
    const origin = at(START);
    for (const end of [
      { s: 1, n: 0, c: 0 },
      { s: 0, n: 1, c: 0 },
      { s: 0, n: 0, c: 1 },
    ]) {
      lines.push([origin, short(end)]);
    }
    setAttrs(startDot, { cx: origin.x, cy: origin.y });

    const footOf = (key: CupKey): Projected => at({ ...addresses[key], c: 0 });
    for (const key of standing) {
      const cup = cups[key];
      const p = points[key];
      const foot = footOf(key);
      setAttrs(cup.drop, { x1: p.x, y1: p.y, x2: foot.x, y2: foot.y });
      const rx = spriteH * 0.3;
      setAttrs(cup.shadow, { cx: foot.x, cy: foot.y, rx, ry: rx * Math.sin(cam.pitch) });
    }

    // Rulers: gentle to each of the other two cups.
    const rulerOpacity =
      1 - (1 - RULER_FADED) * clamp01((state.arrowP * ARROWS_MS) / RULER_FADE_MS);
    rulers.setAttribute('opacity', String(rulerOpacity));
    const lineTo = (line: SVGLineElement, from: Projected, to: Projected): void =>
      setAttrs(line, { x1: from.x, y1: from.y, x2: to.x, y2: to.y });
    lineTo(rulerToPronounced, points.gentle, points.pronounced);
    lineTo(rulerToCitrus, points.gentle, points['citrus-led']);
    rulerToPronounced.setAttribute('stroke-dashoffset', String(1 - state.rulerP));
    rulerToCitrus.setAttribute('stroke-dashoffset', String(1 - state.rulerP));
    if (state.rulerP > 0) {
      claim(points.gentle, points.pronounced);
      claim(points.gentle, points['citrus-led']);
    }

    // Arrows from the start. Each tip grows toward its cup; the head rides the tip.
    const clock = state.arrowP * ARROWS_MS;
    const drawCupArrow = (arrow: Arrow, to: Projected, progress: number): void => {
      // The head stops just short of the cup's dot so it stays visible.
      const full = Math.hypot(to.x - origin.x, to.y - origin.y);
      const reach = full > 0 && progress > 0 ? progress * Math.max(0, 1 - DOT_CLEARANCE / full) : 0;
      const tip = { x: lerp(origin.x, to.x, reach), y: lerp(origin.y, to.y, reach) };
      if (drawArrow(arrow, origin, tip, u)) {
        claimArrow(book, origin, tip, u);
        lines.push([origin, tip]);
      }
    };
    for (const id of ARROW_CUPS) {
      drawCupArrow(arrowOf[id], points[id], clamp01((clock - ARROW_DELAY[id]) / DRAW_MS));
    }
    drawCupArrow(yoursArrow, points.yours, state.yoursOn ? 1 : 0);

    // The shared line, continued to the edge of the cube, or as far as the frame
    // allows when turning carries that edge out of it.
    const beamOpacity = BEAM_OPACITY * clamp01((clock - BEAM_AT) / BEAM_FADE_MS);
    const from = points.pronounced;
    const far = at(RAY_EXIT);
    const limit = fit.top + 30 * u;
    const share = far.y < limit ? clamp01((from.y - limit) / (from.y - far.y)) : 1;
    const exit = { x: lerp(from.x, far.x, share), y: lerp(from.y, far.y, share) };
    setAttrs(beam, { x1: from.x, y1: from.y, x2: exit.x, y2: exit.y, opacity: beamOpacity });
    if (beamOpacity > 0) claim(from, exit);

    // The arc between the gentle arrow and yours, sampled in 3D and then projected.
    const yoursDirection = normalize(vec(addresses.yours));
    const cosAngle = Math.min(
      1,
      GENTLE_HAT.reduce((sum, x, i) => sum + x * yoursDirection[i], 0)
    );
    const angle = Math.acos(cosAngle);
    if (state.yoursOn && cosAngle < 0.995) {
      const path: string[] = [];
      let last: Projected | null = null;
      for (let i = 0; i <= ARC_STEPS; i += 1) {
        const t = i / ARC_STEPS;
        const wa = Math.sin((1 - t) * angle) / Math.sin(angle);
        const wb = Math.sin(t * angle) / Math.sin(angle);
        const p = at(
          taste(GENTLE_HAT.map((x, k) => ARC_RADIUS * (wa * x + wb * yoursDirection[k])))
        );
        path.push(`${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`);
        if (last) book.avoidLine(last, p);
        last = p;
      }
      arc.setAttribute('d', path.join(' '));
      arc.setAttribute('display', 'inline');
    } else {
      arc.setAttribute('display', 'none');
    }

    // The third axis name stands above its arrowhead, or beside it. It is placed
    // last, once the cups, their names, the ruler numbers and the nearest tag are
    // down, so it settles around them: placed first, its spots beside the tip
    // are the very spots a ruler number takes when the room is turned, and the
    // number then lands on it.
    const placeCitrusName = (): void => {
      if (!citrusName) return;
      citrusName.setAttribute('display', 'inline');
      // Above the tip, with two more rows above that, then beside it at its level
      // and two rows up on either side, right first, then farther right when the
      // cups crowd the tip.
      const rows = [4, -14, -28, -42];
      const above: Spot[] = [0, 14, 28].map((up) => ({
        x: tip.x,
        y: tip.y - (CITRUS_NAME_PX + up) * u,
        anchor: 'middle',
      }));
      const beside = (side: number, anchor: Anchor): Spot[] =>
        rows.map((dy) => ({ x: tip.x + side * 10 * u, y: tip.y + dy * u, anchor }));
      const beyond: Spot[] = [46, 82].map((dx) => ({
        x: tip.x + dx * u,
        y: tip.y + 4 * u,
        anchor: 'start',
      }));
      const [first, ...rest] = [...above, ...beside(1, 'start'), ...beside(-1, 'end'), ...beyond];
      book.put(citrusName, first.x, first.y, { anchor: first.anchor, tries: rest });
    };

    // The start tag names its dot, so it shows only while the dot is in frame: a
    // stretched cup lifts the drawing and can carry the floor's near corner out
    // below, and a tag clamped to the edge there would sit on the axes.
    const startShown = origin.y < fit.top + fit.height - 24 * u;
    startTag.setAttribute('display', startShown ? 'inline' : 'none');
    if (startShown) {
      book.put(startTag, origin.x, origin.y + 6 + 23 * u, {
        anchor: ['middle', 'start', 'end'],
        stack: 1,
      });
    }

    // Cups: shared spots spread, then draw farthest first. Names stack under a
    // shared spot. Its tag is placed below, once the drop lines are claimed.
    const stands = standing.map((key) => ({
      key,
      sprite: cups[key].sprite,
      x: points[key].x,
      y: points[key].y,
    }));
    const spread = spreadGroups(stands);
    spotEase.retarget(spread.offsets);
    // Where the nearest tag may stand when rulers, arrows and drop lines crowd the
    // space under its dot: beside the sprite, at dot level, just outside the
    // painted cup, where placeStands also tries each name.
    const sideSpots = (key: CupKey): Spot[] => {
      const x = points[key].x + spotEase.offset(key);
      const y = points[key].y + 4 * u;
      const edge = 0.4 * spriteH + 6 * u;
      return [
        { x: x - edge, y, anchor: 'end' },
        { x: x + edge, y, anchor: 'start' },
      ];
    };
    const names = placeStands({
      stands,
      spread,
      eased: spotEase,
      book,
      h: spriteH,
      u,
      tagFor: () => '',
      tags: [],
    });
    setAttrs(yoursRing, { cx: points.yours.x, cy: points.yours.y });
    reorder(
      cupLayer,
      [...CUP_KEYS]
        .sort((a, b) => points[b].depth - points[a].depth)
        .map((key) => cups[key].sprite.g)
    );

    // Everything below is placed after the sprites and names are claimed, so it
    // keeps clear of them. The drop lines are claimed only now: each name hangs
    // right on its own drop line, so claiming them first would push every name
    // down to the foot.
    for (const key of standing) book.avoidLine(points[key], footOf(key));
    // The tag of a shared spot stands above the pair, clear of the drop lines
    // under it, or else a row below the names. The "your cup" ring already says
    // that two cups share a spot, so the compact layout leaves the tag out.
    const pair = compact ? undefined : spread.groups.at(0);
    spotTag.setAttribute('display', pair ? 'inline' : 'none');
    if (pair) {
      // Then under the names, or beside the pair level with the middle of the
      // sprites, which stand 18 units either way of the pair's center. Never
      // more than a row lower: farther, the tag looks like the floor's, so when
      // nothing is clear it takes the least-covered spot.
      const reach = (pair.keys.length - 1) * 18 + spriteH / 2 + 4 * u;
      book.put(spotTag, pair.x, pair.y - spriteH - 4 * u, {
        anchor: ['middle', 'end', 'start'],
        stack: 1,
        rows: 2,
        tries: [
          { x: pair.x, y: pair.y + 6 + 11 * u },
          { x: pair.x + reach, y: pair.y - spriteH / 2 + 4 * u, anchor: 'start' },
        ],
      });
    }
    const citrusDot = points['citrus-led'];
    // Whether a tag at this spot would sit on the citrus axis or its head: a
    // number there would pass for the axis's length, so it is no spot at all.
    const head = headBox(origin, tip, u);
    const onAxis = (spot: Spot, length: number): boolean => {
      const x0 =
        spot.anchor === 'start'
          ? spot.x
          : spot.anchor === 'end'
            ? spot.x - length
            : spot.x - length / 2;
      const y1 = spot.y + 2 * u;
      return (
        cuts([origin, tip], { left: x0, bottom: y1, w: length, h: 13 * u }) ||
        (x0 < head.x1 && head.x0 < x0 + length && y1 - 13 * u < head.y1 && head.y0 < y1)
      );
    };
    if (state.rulerP > 0) {
      book.avoid({
        x0: citrusDot.x - RING_RADIUS - 3,
        x1: citrusDot.x + RING_RADIUS + 3,
        y0: citrusDot.y - RING_RADIUS - 3,
        y1: citrusDot.y + RING_RADIUS + 3,
      });
    }

    // Each ruler tag stands beside the middle of its line, on the side away from
    // the other ruler first, then the other side, then a row under the far cup's
    // name, then farther along and farther out, until a spot is clear. When none
    // is, it stands on its own ruler, the way a drawing dimensions a length, its
    // halo breaking the line: never by another line, where it would read as that
    // line's length, and never on the citrus axis or its head. The numbers stay
    // at full strength while the rulers themselves fade.
    const tagBeside = (text: SVGTextElement, far: CupId, other: Point): void => {
      text.setAttribute('opacity', String(state.rulerP));
      // Before the ruler is drawn its numbers claim nothing.
      if (state.rulerP === 0) return;
      const name = cups[far].sprite.name;
      const to = points[far];
      // A spot with another line between it and its ruler would read as that
      // line's length, so it is no spot at all. Nor is a spot on the citrus axis
      // or its head: it loses even to a spot on the number's own ruler.
      const own: Segment = [points.gentle, to];
      const length = text.getComputedTextLength();
      const seen = (spot: Spot): boolean => {
        if (onAxis(spot, length)) return false;
        const dx = to.x - points.gentle.x;
        const dy = to.y - points.gentle.y;
        const t = clamp01(
          ((spot.x - points.gentle.x) * dx + (spot.y - points.gentle.y) * dy) /
            (dx * dx + dy * dy || 1)
        );
        const foot = { x: lerp(points.gentle.x, to.x, t), y: lerp(points.gentle.y, to.y, t) };
        const middle = {
          x:
            spot.x +
            (spot.anchor === 'start' ? length / 2 : spot.anchor === 'end' ? -length / 2 : 0),
          y: spot.y - 4 * u,
        };
        return lines.every((line) => line === own || !crosses([foot, middle], line));
      };
      const spotsAt = (offsets: readonly number[]): Spot[] =>
        lineSpots(points.gentle, to, other, u, offsets, RULER_TAG_ALONG).filter(seen);
      const [nearest, ...farther] = RULER_TAG_OFFSETS;
      const onRuler = RULER_TAG_ALONG.map(
        (along): Spot => ({
          x: lerp(points.gentle.x, to.x, along),
          y: lerp(points.gentle.y, to.y, along) + 4 * u,
          anchor: 'middle',
        })
      );
      const offAxis = onRuler.filter((spot) => !onAxis(spot, length));
      const underName: Spot = {
        x: Number(name.getAttribute('x')),
        y: Number(name.getAttribute('y')) + 14 * u,
        anchor: name.getAttribute('text-anchor') === 'end' ? 'end' : 'start',
      };
      // The ruler's own spots are never clear (the ruler runs through them), so
      // they count only when nothing is: as fallbacks, and last of all its middle.
      const [first, ...rest] = [
        ...spotsAt([nearest]),
        ...[underName].filter(seen),
        ...spotsAt(farther),
        ...offAxis,
        onRuler[0],
      ];
      book.put(text, first.x, first.y, { anchor: first.anchor, fallback: offAxis, tries: rest });
    };
    tagBeside(rulerTagPronounced, 'pronounced', points['citrus-led']);
    tagBeside(rulerTagCitrus, 'citrus-led', points.pronounced);

    // The nearest ring sits on the citrus-led dot. Its tag goes on the side of the
    // ring away from the sprite (below it), sliding sideways or down when taken.
    setAttrs(nearestRing, { cx: citrusDot.x, cy: citrusDot.y, opacity: state.rulerP });
    // The cup's drop line runs straight down under the dot, so the tag stands just
    // off it, on either side. When the ruler and an axis crowd that corner, it
    // stands beside the ring at ring level, then beside the sprite, on the open
    // side. When the citrus axis tip stands right of the ring, left of the ring
    // comes first, away from the arrowhead. A spot on the axis or its head is no
    // spot: the tag would name the axis.
    const below = citrusDot.y + 6 + 11 * u;
    const ringSide = (side: number, anchor: Anchor): Spot => ({
      x: citrusDot.x + side * (RING_RADIUS + 4 * u),
      y: citrusDot.y + 4 * u,
      anchor,
    });
    const ringLeft = ringSide(-1, 'end');
    const under: Spot[] = [
      { x: citrusDot.x + 7 * u, y: below, anchor: 'start' },
      { x: citrusDot.x - 7 * u, y: below, anchor: 'end' },
    ];
    if (state.rulerP > 0) {
      const [lead, ...others] = [
        ...(tip.x > citrusDot.x ? [ringLeft, ...under] : [...under, ringLeft]),
        ringSide(1, 'start'),
        ...sideSpots('citrus-led'),
      ].filter((spot) => !onAxis(spot, nearestTag.getComputedTextLength()));
      if (lead) {
        names.push(
          book.put(nearestTag, lead.x, lead.y, {
            anchor: lead.anchor,
            tries: others,
            stack: 1,
            rows: 4,
          })
        );
      }
    }
    nearestTag.setAttribute('opacity', String(state.rulerP));
    // Air around every cup name and the nearest tag, so the axis name never
    // stacks on one and reads as its second line, or runs on from it.
    for (const box of names) claimAir(book, box, 6 * u, 6 * u);
    placeCitrusName();

    book.put(beamTag, exit.x, exit.y - 8 * u, {
      anchor: ['middle', 'start', 'end'],
      stack: -1,
      rows: 3,
    });
    beamTag.setAttribute('opacity', String(beamOpacity / BEAM_OPACITY));
  }

  const render = scheduler(draw, signal);
  const spotEase = spreadEase(signal, () => render());

  function onLayout(next: LayoutInfo): void {
    view = { info: next, fit: fitOf(next.layout) };
    applyFrame(svgEl, view.fit, next.u);
    sizeFocusFrame(frame, view.fit, next.u);
    reframe();
    render();
  }

  // ── Keeping the cups in frame ──
  let liftTween: Tween | null = null;
  function reframe(): void {
    const cups = ARROW_CUPS.map((id) => CUPS[id]);
    if (state.yoursOn) cups.push(yourCup(state.strength, state.lean));
    const lift = cupsLift(view.fit, view.info.layout, camera(), cups);
    if (lift === state.lift) return;
    state.lift = lift;
    liftTween?.cancel();
    const from = state.shownLift;
    liftTween = tween({
      ms: LIFT_MS,
      signal,
      onFrame(p) {
        state.shownLift = lerp(from, lift, p);
        render();
      },
    });
  }

  // ── Turning ──
  function turn(delta: number): void {
    const yaw = Math.min(YAW.max, Math.max(YAW.min, state.yaw + delta));
    if (yaw === state.yaw) return;
    state.yaw = yaw;
    if (state.drawn && !state.turnedSince) {
      state.turnedSince = true;
      hint.hidden = true;
    }
    reframe();
    render();
  }
  turnGesture(svgEl, signal, (dx) => turn(dx * YAW.perPx));
  // The focus ring stays hidden after a pointer grab until a key is pressed.
  svgEl.addEventListener('pointerdown', () => (frame.style.display = 'none'), { signal });
  svgEl.addEventListener(
    'keydown',
    (ev) => {
      frame.style.display = '';
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      ev.preventDefault();
      turn(ev.key === 'ArrowLeft' ? -YAW.perKey : YAW.perKey);
    },
    { signal }
  );

  // ── Steps ──
  const row = (name: string, text: string): HTMLDivElement => {
    const el = h('div', 'ew-row');
    h('span', 'ew-row__label', name, el);
    el.append(text);
    return el;
  };
  const rulerRow = (): HTMLDivElement =>
    row(
      'The ruler says',
      `The citrus-led cup is nearest, ${RULER_CITRUS.toFixed(2)} apart. The pronounced cup is ${RULER_PRONOUNCED.toFixed(2)} apart. By nearness, the citrus-led cup wins.`
    );

  function onStep(): void {
    if (!state.measured) {
      state.measured = true;
      stepButton.textContent = 'Draw arrows from the start';
      story.set('ruled', [rulerRow(), row('Your tongue says', TONGUE)]);
      tween({
        ms: DRAW_MS,
        signal,
        onFrame(p) {
          state.rulerP = p;
          render();
        },
      });
      return;
    }
    const hadFocus = document.activeElement === stepButton;
    state.drawn = true;
    stepButton.hidden = true;
    hint.hidden = false;
    story.set('arrows', [
      rulerRow(),
      row(
        'The arrows say',
        'The gentle and pronounced arrows lie on one line. They point exactly the same way. The citrus-led arrow points somewhere else.'
      ),
    ]);
    tween({
      ms: ARROWS_MS,
      ease: linear,
      signal,
      onFrame(p) {
        state.arrowP = p;
        render();
      },
    }).done.then(() => {
      if (signal.aborted) return;
      const timer = window.setTimeout(() => showYours(hadFocus), YOURS_APPEARS_AFTER_MS);
      signal.addEventListener('abort', () => window.clearTimeout(timer), { once: true });
    });
  }

  function showYours(takeFocus: boolean): void {
    state.yoursOn = true;
    yoursBox.hidden = false;
    cups.yours.sprite.show(true);
    cups.yours.drop.setAttribute('display', 'inline');
    cups.yours.shadow.setAttribute('display', 'inline');
    refreshTracks();
    announce();
    reframe();
    render();
    if (takeFocus) strengthRange.input.focus({ preventScroll: true });
  }

  // ── Your cup ──
  let shownTween: Tween | null = null;
  function easeShownTo(strength: number, lean: number): void {
    shownTween?.cancel();
    const from = { strength: state.shownStrength, lean: state.shownLean };
    shownTween = tween({
      ms: YOURS_MS,
      signal,
      onFrame(p) {
        state.shownStrength = lerp(from.strength, strength, p);
        state.shownLean = lerp(from.lean, lean, p);
        render();
      },
    });
  }

  // The two tracks follow the target values at once, on every step of a range.
  // They are not a live region, so a drag can run through them freely.
  function refreshTracks(): void {
    const address = vec(yourCup(state.strength, state.lean));
    const apart = distance(address, GENTLE);
    const score = cosine(address, GENTLE);
    apartTrack.set(apart / FAR, apart.toFixed(2));
    directionTrack.set(
      (score - DIRECTION_FLOOR) / (1 - DIRECTION_FLOOR),
      score.toFixed(2),
      directionWord(score)
    );
  }

  // The sentence goes to the live region when the reader lets go, or takes a
  // keyboard step, never on every step of a drag. It names its numbers, so a
  // different sentence in the same state is a new announcement.
  function announce(): void {
    const address = vec(yourCup(state.strength, state.lean));
    const text = sentence(
      state.strength,
      state.lean,
      distance(address, GENTLE),
      cosine(address, GENTLE)
    );
    // The end line needs both changes, a strength off x1.00 and a lean above 0.
    // After Reset, or while only the strength has moved, the sentence above closes
    // the thought on its own.
    const both = !near(state.strength, STRENGTH.rest) && state.lean > 0;
    const end = both ? endLine(cosine(address, GENTLE)) : '';
    says.set(
      `${end}|${text}`,
      end === '' ? [h('p', '', text)] : [h('p', '', text), h('p', '', end)]
    );
  }

  function yoursChanged(): void {
    easeShownTo(state.strength, state.lean);
    reframe();
    refreshTracks();
  }

  function onReset(): void {
    strengthRange.setValue(STRENGTH.rest);
    leanRange.setValue(LEAN.rest);
    state.strength = STRENGTH.rest;
    state.lean = LEAN.rest;
    yoursChanged();
    announce();
  }

  // ── First paint ──
  story.set('ask', PROMPT);
  applyFrame(svgEl, view.fit, view.info.u);
  sizeFocusFrame(frame, view.fit, view.info.u);
  draw();
};
