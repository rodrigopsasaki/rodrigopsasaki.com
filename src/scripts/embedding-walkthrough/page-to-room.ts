// Piece 2: "The page becomes a room". One journey position t runs from 0 (the
// line) through 1 (the page) to 2 (the room). Every frame is a pure function of
// t and the reader's turn, so the slider, the two buttons and the keyboard all
// drive the same drawing. The argument it makes: each new question only adds
// height. Nothing already placed ever moves sideways.
//
// Every segment of the journey is eased cubic in-out inside its own interval:
//   t 0 to 0.3     the nuttiness axis grows up from the start corner
//   t 0.3 to 1     drinks rise straight up by their nuttiness (kN 0 to 1)
//   t 1 to 1.5     the page lies back as a floor (pitch and yaw move together)
//   t 1.5 to 1.65  the citrus axis grows straight up from the start corner
//   t 1.65 to 2    every drink rises straight up by its citrus score (kC 0 to 1)

import {
  DRINKS,
  FLAT,
  ROOM,
  distance,
  fitFor,
  lineSpots,
  project,
  roomDrop,
  spriteHeight,
} from './model';
import type { Anchor, Camera, DrinkId, Fit, Layout, Projected, Taste } from './model';
import {
  applyFrame,
  axisSet,
  button,
  checklist,
  claimAir,
  createStageSvg,
  drawAxes,
  drawGrid,
  easeInOutCubic,
  easeOut,
  focusFrame,
  gridLines,
  h,
  labeler,
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
  timeline,
  tween,
  turnGesture,
} from './stage';
import type { Ease, LayoutInfo, MountPiece, Point, Segment, Sprite, Tween, Verdict } from './stage';

// ───── The journey ─────────────────────────────────────────────────────────

const T_ROOM = 2;
const DEG = Math.PI / 180;

// Turning is allowed only in the room: 0.4 degrees per px, 10 to 80 degrees.
const TURN_PER_PX = 0.4 * DEG;
const TURN_PER_KEY = 5 * DEG;
const YAW_MIN = 10 * DEG;
const YAW_MAX = 80 * DEG;

const clamp = (value: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, value));

// Progress of one leg of the journey, eased within its own interval.
const leg = (t: number, from: number, to: number): number =>
  easeInOutCubic(clamp((t - from) / (to - from), 0, 1));

type Legs = { axisN: number; rise: number; tilt: number; axisC: number; climb: number };

function legsAt(t: number): Legs {
  return {
    axisN: leg(t, 0, 0.3),
    rise: leg(t, 0.3, 1),
    tilt: leg(t, 1, 1.5),
    axisC: leg(t, 1.5, 1.65),
    climb: leg(t, 1.65, T_ROOM),
  };
}

// The camera for a journey position. turnExtra is how far the reader has turned
// the room from its resting 35 degrees; it counts in proportion to the tilt, so
// it vanishes as the room folds back into the page.
function cameraAt(legs: Legs, turnExtra: number): Camera {
  return {
    kN: legs.rise,
    kC: legs.climb,
    yaw: (ROOM.yaw + turnExtra) * legs.tilt,
    pitch: FLAT.pitch + (ROOM.pitch - FLAT.pitch) * legs.tilt,
  };
}

// ───── The readout ─────────────────────────────────────────────────────────

type Band = 'line' | 'rise' | 'page' | 'tilt' | 'ask' | 'climb' | 'room';

const SENTENCES: Record<Band | 'turning', string> = {
  line: 'One question, one line. Both coffees and the lemon juice share one spot.',
  rise: 'A second question: how nutty is each drink? The drinks rise straight up by their nuttiness. The juices stay put, and nobody slides sideways.',
  page: 'Two questions, one page. The two coffees still share one spot.',
  tilt: 'The page lies back like a floor. Nothing on it moves.',
  ask: 'A third question: how bright and citrusy is each drink? Its direction points straight up, off the floor.',
  climb:
    'Each drink rises from the spot it already had. Of the two coffees, the new one rises much higher.',
  room: 'Three questions, one room. The two coffees still stand on the same spot of the floor, so they are still equally sweet and equally nutty. Only the new coffee rose high, so they no longer share an address. It is nearer the lemon juice now, and nothing we tasted had to change.',
  turning:
    'From any side, the two coffees stand one above the other, over the same spot on the floor.',
};

function bandAt(t: number): Band {
  if (t <= 0) return 'line';
  if (t < 1) return 'rise';
  if (t === 1) return 'page';
  if (t < 1.5) return 'tilt';
  if (t < 1.65) return 'ask';
  if (t < T_ROOM) return 'climb';
  return 'room';
}

type Verdicts = { sweet: Verdict; nutty: Verdict; apart: Verdict };

// The two coffees' vertical gap on the room is 0.5 * kC, so it passes 0.05
// (the home zone of piece 1) once kC is above 0.1.
const GAP_KEPT_KC = 0.1;

function verdictsFor(band: Band, kC: number): Verdicts {
  if (band === 'line') return { sweet: 'kept', nutty: 'unasked', apart: 'broken' };
  if (band === 'room') return { sweet: 'kept', nutty: 'kept', apart: 'kept' };
  if (band === 'climb' && kC > GAP_KEPT_KC) return { sweet: 'kept', nutty: 'kept', apart: 'kept' };
  return { sweet: 'kept', nutty: 'kept', apart: 'broken' };
}

// ───── The scripted runs ───────────────────────────────────────────────────

// A run is a list of legs of t, each with its own duration, and holds that let
// the reader see what just happened. A run can start from any t: legs already
// behind it are skipped, a leg it starts inside is shortened in proportion, and
// a hold is kept only if t has not yet gone past it.
type Step = { from: number; to: number; ms: number; ease: Ease } | { hold: number; at: number };

const linear: Ease = (p) => p;

const BUILD: readonly Step[] = [
  { from: 0, to: 0.3, ms: 400, ease: linear },
  { from: 0.3, to: 1, ms: 1000, ease: linear },
  { hold: 300, at: 1 },
  { from: 1, to: 1.5, ms: 1000, ease: linear },
  { from: 1.5, to: 1.65, ms: 300, ease: linear },
  { hold: 200, at: 1.65 },
  { from: 1.65, to: T_ROOM, ms: 1000, ease: easeOut },
];

const BACK: readonly Step[] = [
  { from: T_ROOM, to: 1.65, ms: 600, ease: linear },
  { hold: 200, at: 1.65 },
  { from: 1.65, to: 1, ms: 800, ease: linear },
  { hold: 200, at: 1 },
  { from: 1, to: 0, ms: 800, ease: linear },
];

function plan(
  steps: readonly Step[],
  start: number,
  forward: boolean,
  setT: (t: number) => void
): Segment[] {
  const segments: Segment[] = [];
  for (const step of steps) {
    if ('hold' in step) {
      if (forward ? start <= step.at : start >= step.at) segments.push({ ms: step.hold });
      continue;
    }
    const done = forward ? start >= step.to : start <= step.to;
    if (done) continue;
    const a = forward ? Math.max(start, step.from) : Math.min(start, step.from);
    const b = step.to;
    const share = Math.abs(b - a) / Math.abs(step.to - step.from);
    segments.push({
      ms: step.ms * share,
      ease: step.ease,
      onFrame: (p) => setT(p >= 1 ? b : a + (b - a) * p),
    });
  }
  return segments;
}

// ───── Drawing ─────────────────────────────────────────────────────────────

const fixed = (v: number): string => v.toFixed(2);

// Draw order inside the drinks layer when two drinks are equally far back.
const ORDER: readonly DrinkId[] = [
  'lemon-juice',
  'first-coffee',
  'new-coffee',
  'orange-juice',
  'latte',
  'hazelnut-latte',
];

// Two addresses closer than this, in taste units, are one spot.
const SAME_SPOT = 0.03;

const tasteVector = (taste: Taste): number[] => [taste.s, taste.n, taste.c];

const nameOf = (id: DrinkId): string => (id === 'first-coffee' ? 'first coffee' : DRINKS[id].label);

const FLOOR_CORNERS: readonly Taste[] = [
  { s: 0, n: 0, c: 0 },
  { s: 1, n: 0, c: 0 },
  { s: 1, n: 1, c: 0 },
  { s: 0, n: 1, c: 0 },
];

// How far a link tag stands off its line, in CSS px, nearest first. Any nearer
// and the tag would touch the strip the line claims.
const LINK_TAG_PX = [14, 22, 34];
// Where along its line a link tag may stand, best first: the middle, then outward.
const LINK_TAG_ALONG = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8];
// The citrus axis name stands this far (CSS px) above the axis tip, or beside it.
const CITRUS_NAME_PX = 44;
const CITRUS_TIP: Taste = { s: 0, n: 0, c: 1 };
// A row of labels, in user units per CSS px.
const ROW_UNITS = 14;

// The most rows of names that hang under the line: three drinks that share a
// spot, then their tag.
const LINE_ROWS = 4;

// How far the drawing stands higher at t = 0 than at the page, so that the line,
// its sprites above and its names below, sit in the middle of the journey's window.
function lineRaise(fit: Fit, u: number, spriteH: number): number {
  const line = project({ s: 0.5, n: 0, c: 0 }, cameraAt(legsAt(0), 0), fit).y;
  const content = line + (LINE_ROWS * ROW_UNITS * u - spriteH) / 2;
  return Math.max(0, content - (fit.top + fit.height / 2));
}

type Floor = {
  drop: SVGLineElement;
  dot: SVGCircleElement;
  // The new coffee stands in the first coffee's shadow, so it draws none.
  shadows: SVGEllipseElement[];
};

type Drink = { id: DrinkId; sprite: Sprite; floor: Floor };

function sharedTag(keys: readonly string[]): string {
  const coffees = keys.length === 2 && keys.includes('first-coffee') && keys.includes('new-coffee');
  if (coffees) return 'two coffees, one spot';
  return keys.length === 2 ? 'two drinks, one spot' : 'three drinks, one spot';
}

export const mount: MountPiece = (figure, stage, signal) => {
  const fits: Record<Layout, Fit> = {
    wide: fitFor('wide', 'journey'),
    compact: fitFor('compact', 'journey'),
  };
  const drops: Record<Layout, number> = {
    wide: roomDrop(fits.wide, 'wide'),
    compact: roomDrop(fits.compact, 'compact'),
  };

  // ── State: everything a frame needs, and nothing else ──
  // The journey opens on the line, so one press of Build the room runs all of it.
  let t = 0;
  let turnExtra = 0;
  let turned = false;
  let turning = false;
  let linkOpacity = 0;
  let animation: Tween | null = null;
  let fade: Tween | null = null;
  let unturn: Tween | null = null;
  let lastBand: string | null = null;
  let actionLabel = '';

  let info: LayoutInfo = observeLayout(stage, signal, (next) => {
    info = next;
    frame();
    render();
  });

  // ── The stage ──
  const svgEl = createStageSvg(figure, stage, fits[info.layout]);
  const decorative = (): SVGGElement => svg('g', { 'aria-hidden': 'true' }, svgEl);

  const floorLayer = decorative();
  const axisLayer = decorative();
  const shadowLayer = decorative();
  const linkLayer = decorative();
  const drinkLayer = svg('g', {}, svgEl);
  const labelLayer = svg('g', {}, svgEl);

  const tint = svg('polygon', { class: 'ew-shadow' }, floorLayer);
  const grid = gridLines(floorLayer);
  const axes = axisSet(axisLayer, labelLayer, true);

  const makeFloor = (id: DrinkId): Floor => {
    const shadows: SVGEllipseElement[] = [];
    if (id !== 'new-coffee') {
      shadows.push(svg('ellipse', { class: 'ew-shadow' }, shadowLayer));
      shadows.push(svg('ellipse', { class: 'ew-shadow' }, shadowLayer));
    }
    // Drop lines are the proof that a drink rose and did not slide, so they
    // are drawn heavier than a grid line.
    const drop = svg('line', { class: 'ew-drop ew-drop--strong' }, shadowLayer);
    const dot = svg('circle', { class: 'ew-dot', r: 3 }, shadowLayer);
    return { drop, dot, shadows };
  };
  const makeDrink = (id: DrinkId): Drink => {
    const node = sprite(drinkLayer, DRINKS[id].sprite, nameOf(id), labelLayer);
    if (id === 'new-coffee') node.name.classList.add('ew-tag-amber');
    return { id, sprite: node, floor: makeFloor(id) };
  };
  const drinks: Record<DrinkId, Drink> = {
    'orange-juice': makeDrink('orange-juice'),
    'lemon-juice': makeDrink('lemon-juice'),
    'first-coffee': makeDrink('first-coffee'),
    'new-coffee': makeDrink('new-coffee'),
    latte: makeDrink('latte'),
    'hazelnut-latte': makeDrink('hazelnut-latte'),
  };
  const newRing = svg(
    'circle',
    { class: 'ew-ring ew-ring--amber', r: 9 },
    drinks['new-coffee'].sprite.g
  );

  // The nearer and farther lines from the lemon juice, once the room is built.
  const linkNearer = svg('line', { class: 'ew-dotted' }, linkLayer);
  const linkFarther = svg('line', { class: 'ew-dotted' }, linkLayer);
  const tagNearer = svgText(labelLayer, 'ew-tag-muted', 'nearer');
  const tagFarther = svgText(labelLayer, 'ew-tag-muted', 'farther');

  // One muted tag per group of drinks that share a spot.
  const spotTags = [
    svgText(labelLayer, 'ew-tag-muted', ''),
    svgText(labelLayer, 'ew-tag-muted', ''),
  ];

  const ring = focusFrame(svgEl);

  // ── The panel: controls, then the checklist and one sentence ──
  const body = panel(stage);
  const controls = h('div', 'ew-controls', undefined, body);

  const stopAnimation = (): void => {
    animation?.cancel();
    animation = null;
  };

  const action = button(
    controls,
    'Build the room',
    () => {
      stopAnimation();
      const forward = t < T_ROOM;
      animation = timeline(plan(forward ? BUILD : BACK, t, forward, setT), signal);
    },
    signal
  );

  const slider = range(
    body,
    {
      label: 'line to room',
      min: 0,
      max: T_ROOM * 100,
      step: 1,
      value: t * 100,
      ticks: ['line', 'page', 'room'],
      onInput: (value) => {
        stopAnimation();
        setT(value / 100);
      },
    },
    signal
  );
  // The native input would step by 1 (0.01 of the journey). A keypress moves 0.05.
  slider.input.addEventListener(
    'keydown',
    (ev) => {
      const direction =
        ev.key === 'ArrowRight' || ev.key === 'ArrowUp'
          ? 1
          : ev.key === 'ArrowLeft' || ev.key === 'ArrowDown'
            ? -1
            : 0;
      if (direction === 0) return;
      ev.preventDefault();
      stopAnimation();
      const next = clamp(slider.input.valueAsNumber + direction * 5, 0, T_ROOM * 100);
      slider.setValue(next);
      setT(next / 100);
    },
    { signal }
  );

  const checks = checklist(body);
  const out = readout(body);
  const hint = h('p', 'ew-note', 'Drag sideways to turn the room.', body);

  // ── Changing t ──
  function setT(next: number): void {
    const value = clamp(next, 0, T_ROOM);
    if (value === t) return;
    const wasRoom = t >= T_ROOM;
    t = value;
    turning = false;
    slider.setValue(Math.round(t * 100));
    if (t >= T_ROOM && !wasRoom) enterRoom();
    else if (t < T_ROOM && wasRoom) leaveRoom();
    render();
  }

  // Coming back to the room restores the resting 35 degrees. The nearer and
  // farther lines appear at once under reduced motion.
  function enterRoom(): void {
    unturn?.cancel();
    turnExtra = 0;
    fade?.cancel();
    fade = tween({
      ms: 300,
      signal,
      onFrame: (p) => {
        linkOpacity = p;
        render();
      },
    });
  }

  // Leaving the room hides the lines at once and lets the room settle back to
  // the schedule, rather than snapping from whatever angle the reader left it at.
  function leaveRoom(): void {
    fade?.cancel();
    linkOpacity = 0;
    const from = turnExtra;
    unturn?.cancel();
    unturn = tween({
      ms: 300,
      signal,
      onFrame: (p) => {
        turnExtra = from * (1 - p);
        render();
      },
    });
  }

  function turnBy(radians: number): void {
    if (t < T_ROOM) return;
    unturn?.cancel();
    const yaw = clamp(ROOM.yaw + turnExtra + radians, YAW_MIN, YAW_MAX);
    turnExtra = yaw - ROOM.yaw;
    turned = true;
    turning = true;
    render();
  }

  turnGesture(svgEl, signal, (dx) => turnBy(dx * TURN_PER_PX));
  svgEl.addEventListener(
    'keydown',
    (ev) => {
      if (t < T_ROOM) return;
      if (ev.key === 'ArrowRight') turnBy(TURN_PER_KEY);
      else if (ev.key === 'ArrowLeft') turnBy(-TURN_PER_KEY);
      else return;
      ev.preventDefault();
    },
    { signal }
  );

  // ── Drawing ──
  // Sizes depend on the layout: the viewBox, the --ew-u scale and the focus ring.
  function frame(): void {
    const fit = fits[info.layout];
    applyFrame(svgEl, fit, info.u);
    sizeFocusFrame(ring, fit, info.u);
  }

  const spread = spreadEase(signal, () => render());

  function draw(): void {
    const { u, layout } = info;
    const spriteH = spriteHeight(layout);
    const legs = legsAt(t);
    const cam = cameraAt(legs, turnExtra);
    // The window is tall enough for the page and the room both; as the page lies
    // back, the drawing moves down so the room sits in the middle of it, not
    // under its top with an empty band beneath the floor.
    // The line, before the page grows, stands in the middle of that window and not
    // at its foot under an empty band: the drawing starts raised, and settles
    // while the nuttiness axis grows, before any drink has risen.
    const rest = fits[layout];
    const settled: Fit = { ...rest, cy: rest.cy + legs.tilt * drops[layout] };
    const fit: Fit = {
      ...settled,
      cy: settled.cy - (1 - legs.axisN) * lineRaise(settled, u, spriteH),
    };
    // Axes keep their full length through the journey: the axis stands before
    // the drinks rise along it. Only the grid and the drinks follow the camera.
    const axisCam: Camera = { ...cam, kN: 1, kC: 1 };
    const at = (taste: Taste, camera: Camera): Projected => project(taste, camera, fit);
    // A phone-width stage keeps names a little farther from its sides.
    const book = labeler(fit, u, layout === 'compact' ? 8 * u : undefined);

    // The floor: a tint that appears with the tilt, and the 4x4 grid.
    tint.setAttribute(
      'points',
      FLOOR_CORNERS.map((corner) => {
        const p = at(corner, cam);
        return `${fixed(p.x)},${fixed(p.y)}`;
      }).join(' ')
    );
    tint.setAttribute('opacity', legs.tilt.toFixed(2));
    drawGrid(grid, (s, n) => at({ s, n, c: 0 }, cam));

    // The axes, then the names of the two floor axes, which claim their space
    // before any drink name.
    drawAxes(
      axes,
      (taste) => at(taste, axisCam),
      [
        { grow: 1, label: 1 },
        { grow: legs.axisN, label: clamp((t - 0.25) / 0.05, 0, 1) },
        // The citrus name is placed after the drinks, so it clears their sprites.
        { grow: legs.axisC, label: 0 },
      ],
      book,
      u
    );

    // Each drink: where it stands (lifted) and the floor point under it.
    const lift = (id: DrinkId): Projected => project(DRINKS[id], cam, fit);
    const lifted: Record<DrinkId, Projected> = {
      'orange-juice': lift('orange-juice'),
      'lemon-juice': lift('lemon-juice'),
      'first-coffee': lift('first-coffee'),
      'new-coffee': lift('new-coffee'),
      latte: lift('latte'),
      'hazelnut-latte': lift('hazelnut-latte'),
    };
    const shadowRx = 0.32 * spriteH;
    const shadowRy = shadowRx * Math.sin(cam.pitch);

    // A shared spot means the camera shows two drinks at the same address, not
    // that their sprites happen to overlap on screen mid-climb. Drinks that share
    // no spot get a position nobody else can reach, so only true sharers group.
    const seen = (id: DrinkId): Taste => ({
      s: DRINKS[id].s,
      n: cam.kN * DRINKS[id].n,
      c: cam.kC * DRINKS[id].c,
    });
    const sharesSpot = (id: DrinkId): boolean =>
      ORDER.some(
        (other) =>
          other !== id && distance(tasteVector(seen(id)), tasteVector(seen(other))) < SAME_SPOT
      );
    const spots = spreadGroups(
      ORDER.map((id, i) =>
        sharesSpot(id)
          ? { key: id, x: lifted[id].x, y: lifted[id].y }
          : { key: id, x: -1000 * (i + 1), y: 0 }
      )
    );
    spread.retarget(spots.offsets);

    // Every drop line is claimed before any name, so a name slides off a
    // neighbor's drop. The first 20 px under a dot are left to the drink's own
    // name, which stands on the top of its own drop as it stands on the page.
    for (const id of ORDER) {
      const floorPoint = at({ s: DRINKS[id].s, n: DRINKS[id].n, c: 0 }, cam);
      const p = lifted[id];
      const { drop, dot, shadows } = drinks[id].floor;
      setAttrs(drop, { x1: p.x, y1: p.y, x2: floorPoint.x, y2: floorPoint.y });
      const dropped = Math.abs(p.y - floorPoint.y) > 1;
      drop.setAttribute('display', dropped ? 'inline' : 'none');
      if (dropped) {
        book.avoidLine({ x: p.x, y: Math.min(floorPoint.y, p.y + 20 * u) }, floorPoint);
      }
      setAttrs(dot, { cx: floorPoint.x, cy: floorPoint.y, opacity: legs.tilt });
      shadows.forEach((shadow, i) => {
        const scale = i === 0 ? 1 : 0.55;
        setAttrs(shadow, {
          cx: floorPoint.x,
          cy: floorPoint.y,
          rx: shadowRx * scale,
          ry: shadowRy * scale,
          opacity: legs.tilt,
        });
      });
    }
    setAttrs(newRing, { cx: lifted['new-coffee'].x, cy: lifted['new-coffee'].y });

    // Nearer and farther: only in the room, fading in when it is reached. Each
    // tag stands at the middle of its line, off to the side away from the other
    // line.
    const lemon = lifted['lemon-juice'];
    const fresher = lifted['new-coffee'];
    const older = lifted['first-coffee'];
    const linked = linkOpacity > 0;
    linkLayer.setAttribute('opacity', String(linkOpacity));
    linkLayer.setAttribute('display', linked ? 'inline' : 'none');
    setAttrs(linkNearer, { x1: lemon.x, y1: lemon.y, x2: fresher.x, y2: fresher.y });
    setAttrs(linkFarther, { x1: lemon.x, y1: lemon.y, x2: older.x, y2: older.y });
    // The dotted lines are claimed before any name, so names slide off them.
    if (linked) {
      book.avoidLine(lemon, fresher);
      book.avoidLine(lemon, older);
    }
    // Names directly under their sprites, or beside them at dot level when an axis
    // or a dotted line crosses the place under a dot; the names of a shared spot
    // stack beneath it, then its tag.
    // In the room a name may also stand beside its sprite halfway up, where a
    // glass stacked under another drink leaves room when the room is turned.
    const edge = 0.4 * spriteH + 6 * u;
    const halfway = (s: Point): (Point & { anchor: Anchor })[] => {
      const y = s.y - spriteH / 2 + 4 * u;
      return legs.climb > 0
        ? [
            { x: s.x - edge, y, anchor: 'end' },
            { x: s.x + edge, y, anchor: 'start' },
          ]
        : [];
    };
    // The citrus axis name goes between the sprites and the names: it clears
    // the cups, stands above the tip or beside it, and the names keep a 6 px gap
    // under it, so none reads as its second line.
    const citrusName = axes.at(2)?.label;
    const citrusShown = clamp((legs.axisC - 0.7) / 0.3, 0, 1);
    const placeCitrus = (): void => {
      if (!citrusName) return;
      citrusName.setAttribute('display', citrusShown > 0 ? 'inline' : 'none');
      if (citrusShown === 0) return;
      citrusName.setAttribute('opacity', citrusShown.toFixed(2));
      const tip = at(CITRUS_TIP, axisCam);
      const above = tip.y - CITRUS_NAME_PX * u;
      const box = book.put(citrusName, tip.x, above, {
        tries: [
          { x: tip.x + 10 * u, y: tip.y - 6 * u, anchor: 'start' },
          { x: tip.x - 10 * u, y: tip.y - 6 * u, anchor: 'end' },
          { x: tip.x, y: above - ROW_UNITS * u },
          { x: tip.x + 10 * u, y: above - ROW_UNITS * u, anchor: 'start' },
          { x: tip.x - 10 * u, y: above - ROW_UNITS * u, anchor: 'end' },
        ],
      });
      book.avoid({ ...box, y1: box.y1 + 6 * u });
    };
    // On a phone, while the two coffees share a spot on the flat page, the first
    // coffee's name starts just right of the nuttiness axis (piece 1's rule). The
    // pair is the group the first coffee leads: on the line the lemon juice leads
    // it. The shared tag hides mid-rise, where the pair has no settled row yet.
    const pair = spots.groups.some((group) => group.keys[0] === 'first-coffee');
    const names = placeStands({
      stands: ORDER.map((id) => ({
        key: id,
        sprite: drinks[id].sprite,
        x: lifted[id].x,
        y: lifted[id].y,
      })),
      spread: spots,
      eased: spread,
      book,
      more: halfway,
      h: spriteH,
      u,
      tagFor: (keys) => (t > 0 && t < 1 ? '' : sharedTag(keys)),
      tags: spotTags,
      pin:
        layout === 'compact' && legs.tilt === 0 && pair
          ? { key: 'first-coffee', x: at({ s: 0, n: 0, c: 0 }, cam).x + 6 * u, only: true }
          : undefined,
      first: placeCitrus,
    });

    // The link tags go last. The sprites are claimed again at the weight of
    // text, so a tag crosses a line before it covers a cup, and so are the rows
    // above and below every name.
    if (linked) {
      for (const id of ORDER) {
        const p = lifted[id];
        const dx = spread.offset(id);
        book.avoid({
          x0: p.x + dx - 0.4 * spriteH,
          x1: p.x + dx + 0.4 * spriteH,
          y0: p.y - spriteH * (1 - drinks[id].sprite.air),
          y1: p.y,
        });
      }
      // A row of air above and below every name, so a tag never stacks on a name
      // and reads as a second line of it.
      for (const box of names) claimAir(book, box, 0, 6 * u);
    }
    // A link tag is hidden only when its line is shorter than the tag.
    const tagPairs: [SVGTextElement, Point, Point][] = [
      [tagNearer, fresher, older],
      [tagFarther, older, fresher],
    ];
    for (const [tag, to, other] of tagPairs) {
      tag.setAttribute('display', linked ? 'inline' : 'none');
      if (!linked) continue;
      const fits = Math.hypot(to.x - lemon.x, to.y - lemon.y) >= tag.getComputedTextLength();
      tag.setAttribute('display', fits ? 'inline' : 'none');
      if (!fits) continue;
      tag.setAttribute('opacity', String(linkOpacity));
      const [first, ...rest] = lineSpots(lemon, to, other, u, LINK_TAG_PX, LINK_TAG_ALONG);
      book.put(tag, first.x, first.y, { anchor: first.anchor, tries: rest });
    }

    // Farthest back first, so nearer drinks stand in front of farther ones.
    const back = [...ORDER].sort((a, b) => lifted[b].depth - lifted[a].depth);
    reorder(
      drinkLayer,
      back.map((id) => drinks[id].sprite.g)
    );

    // The room can be turned only once it is built.
    const inRoom = t >= T_ROOM;
    svgEl.classList.toggle('ew-turnable', inRoom);
    if (inRoom) svgEl.setAttribute('tabindex', '0');
    else svgEl.removeAttribute('tabindex');
    hint.hidden = !inRoom || turned;

    // The readout speaks only when the band changes, never on a frame.
    const band = bandAt(t);
    const key = turning ? 'turning' : band;
    const verdicts = verdictsFor(band, cam.kC);
    checks.set(verdicts.sweet, verdicts.nutty, verdicts.apart);
    if (key !== lastBand) {
      lastBand = key;
      const sentence = SENTENCES[key];
      out.set(key, [h('p', '', sentence)]);
      slider.input.setAttribute('aria-valuetext', sentence);
    }
    const label = t < T_ROOM ? 'Build the room' : 'Back to the line';
    if (label !== actionLabel) {
      actionLabel = label;
      action.textContent = label;
    }
  }

  const render = scheduler(draw, signal);

  frame();
  draw();
};
