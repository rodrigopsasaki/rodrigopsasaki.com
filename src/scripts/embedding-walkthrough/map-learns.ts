// Piece 4, "Watch a map learn": eight text cards on an unlabeled page, and 36
// training examples that pull the wanted pairs together and push an unwanted card
// away. The addresses come from a real seeded run, computed offline by
// scripts/embedding-toy-train.ts and shipped as src/data/embedding-toy.json, so
// nothing here moves a card by hand: the piece only replays the run.
//
// Built once at mount. After that only attributes and text change, inside one
// animation frame per state change. Colors and stroke widths live in the ew-
// block of prose.css, so the dark theme needs no script.

import toyJson from '../../data/embedding-toy.json';
import { layoutWidth } from './model';
import type { Layout, ToyData, ToyFit, ToyPoint } from './model';
import {
  applyFrame,
  button,
  createStageSvg,
  easeOut,
  focusFrame,
  h,
  isReducedMotion,
  labeler,
  observeLayout,
  panel,
  range,
  readout,
  scheduler,
  setAttrs,
  svg,
  svgText,
  tween,
} from './stage';
import type { LayoutInfo, MountPiece, Tween } from './stage';
import {
  CARD_PX,
  DOT_RADIUS,
  TEXT_PX,
  cardOptions,
  cardWidth,
  declutter,
  leaderFor,
  nearestTo,
  positionsAt,
  slotsFor,
  viewPoint,
} from './toy-layout';
import type { DeclutterOptions, Place, Segment } from './toy-layout';

// ───── The run ─────────────────────────────────────────────────────────────

// The data file holds every card's track, the examples and one fit per layout.
// Everything else (the addresses at a step, the nearest card) is derived here.
const toy: ToyData = toyJson;

const STEPS = toy.steps.length - 1;
const REQUEST_ID = 'request';

const cardById = new Map(toy.cards.map((card) => [card.id, card]));

// The data names no kind for a card, so the scoreboard keeps its own list of the
// coffee notes. A mistyped id fails here, at load, not as a silent "no".
const COFFEE_NOTES: ReadonlySet<string> = new Set(['hazelnut', 'almond', 'toasted']);
for (const id of COFFEE_NOTES) {
  if (!cardById.has(id)) throw new Error(`COFFEE_NOTES names a card that does not exist: ${id}`);
}

const unseenById = new Map(toy.unseen.map((card) => [card.id, card]));

// The whole trajectory, one map per step.
const stepStates: ReadonlyMap<string, ToyPoint>[] = toy.steps.map((_, n) =>
  positionsAt(toy.tracks, n)
);
const finalState: ReadonlyMap<string, ToyPoint> = stepStates.at(-1) ?? new Map();

// The card nearest the request after n examples.
function neighborAt(n: number): string {
  const state = stepStates.at(n);
  const at = state?.get(REQUEST_ID);
  return (state && at && nearestTo(at, state, REQUEST_ID)) ?? REQUEST_ID;
}

// Where a description the examples never showed lands among the trained cards.
const unseenNeighbor = new Map(
  toy.unseen.map((card) => [card.id, nearestTo(card.at, finalState) ?? card.id])
);

function textOf(id: string): string {
  return cardById.get(id)?.text ?? unseenById.get(id)?.text ?? id;
}

// ───── Sizes ───────────────────────────────────────────────────────────────

const BASELINE_PX = TEXT_PX * 0.35;
const OUTLINE_PX = 2;
const FOCUS_PX = 4;

const STEP_MS = 280;
const PLAY_MS = 350;
// Reduced motion: the tweens are instant, so the run just steps more slowly.
const PLAY_REDUCED_MS = 700;
const PULSE_MS = 400;
const FADE_MS = 400;
// How quickly a card eases toward a new spot beside its dot, when the free spot changes.
const SETTLE_MS = 70;

const TAP_HINT = 'Tap a card to read it in full.';

// A card that moved less than this on the stage (stage units) leaves no ghost.
const MOVED_MIN = 1;
const GHOST_RADIUS = 5;
// An arrow shorter than this (stage units, beyond the dot's edge) is left to the ghost.
const ARROW_MIN = 2;
const ARROW_HEAD_PX = 7;
// The nearest ring is piece 3's (radius 9, tagged "nearest"), in the request's amber: red here means pushed away.
const RING_RADIUS = 9;
const NEAREST_TAG = 'nearest';
const ORIGIN: ToyPoint = { x: 0, y: 0 };

type Role = 'pair' | 'unwanted' | 'pulse';
type GhostRole = Role | 'muted';

// Where a card stood before this step: a faint dot, and an arrow to where it is now.
type Ghost = {
  g: SVGGElement;
  dot: SVGCircleElement;
  shaft: SVGLineElement;
  head: SVGPolygonElement;
};

type CardNode = {
  id: string;
  late: boolean;
  full: string;
  short: string;
  g: SVGGElement;
  leader: SVGLineElement;
  rect: SVGRectElement;
  outline: SVGRectElement;
  dot: SVGCircleElement;
  text: SVGTextElement;
  focus: SVGRectElement;
};

type Measured = {
  info: LayoutInfo;
  size: { width: number; height: number };
  options: DeclutterOptions;
  widths: Map<string, number>;
};

// Where a card sits, measured from its dot, so a moving dot carries its card.
type Offset = { dx: number; dy: number };

export const mount: MountPiece = (figure, stage, signal) => {
  const initial = observeLayout(stage, signal, (info) => remeasure(info));
  const svgEl = createStageSvg(figure, stage, {
    width: layoutWidth(initial.layout),
    height: toy.views[initial.layout].height,
  });
  const linkLayer = svg('g', { 'aria-hidden': 'true' }, svgEl);
  // Decoration under the cards, so no ghost or ring ever covers a label.
  const ghostLayer = svg('g', { 'aria-hidden': 'true', 'pointer-events': 'none' }, svgEl);
  const ghosts = new Map<string, Ghost>();
  for (const card of toy.cards) {
    const g = svg('g', { visibility: 'hidden' }, ghostLayer);
    ghosts.set(card.id, {
      g,
      dot: svg('circle', { r: GHOST_RADIUS }, g),
      shaft: svg('line', {}, g),
      head: svg('polygon', {}, g),
    });
  }
  const cardLayer = svg('g', {}, svgEl);
  // The ring and its tag go over the cards: a ring is a thin line, and the tag is
  // placed clear of every card.
  const markLayer = svg('g', { 'aria-hidden': 'true', 'pointer-events': 'none' }, svgEl);
  const nearestRing = svg('circle', { class: 'ew-ring ew-ring--amber', r: RING_RADIUS }, markLayer);
  const nearestTag = svgText(markLayer, 'ew-tag-amber', NEAREST_TAG);
  const pairLine = svg('line', { class: 'ew-pair' }, linkLayer);
  const unwantedLine = svg('line', { class: 'ew-unwanted' }, linkLayer);
  const unseenLinks = new Map<string, SVGLineElement>();
  for (const card of toy.unseen) {
    unseenLinks.set(card.id, svg('line', { class: 'ew-dotted' }, linkLayer));
  }

  // ─── Cards, built once ───
  const nodes: CardNode[] = [];
  const buildNode = (id: string, full: string, short: string, late: boolean): void => {
    const isRequest = id === REQUEST_ID;
    const g = svg('g', { 'aria-label': full }, cardLayer);
    const leader = svg('line', { class: 'ew-drop', 'aria-hidden': 'true' }, g);
    const rectClass = `ew-card${isRequest ? ' ew-card--request' : ''}${late ? ' ew-card--unseen' : ''}`;
    const rect = svg('rect', { class: rectClass, 'aria-hidden': 'true' }, g);
    const outline = svg('rect', { class: 'ew-outline', visibility: 'hidden', 'aria-hidden': 'true' }, g);
    const dot = svg(
      'circle',
      {
        class: isRequest ? 'ew-dot ew-tag-amber' : 'ew-dot',
        r: DOT_RADIUS,
        'aria-hidden': 'true',
      },
      g
    );
    const text = svgText(g, 'ew-card-text', full);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('aria-hidden', 'true');
    const focus = focusFrame(g);
    nodes.push({ id, late, full, short, g, leader, rect, outline, dot, text, focus });
  };
  for (const card of toy.cards) buildNode(card.id, card.text, card.short, false);
  for (const card of toy.unseen) buildNode(card.id, card.text, card.short, true);
  for (const node of nodes) if (node.late) node.g.setAttribute('visibility', 'hidden');

  // ─── Live state ───
  let step = 0;
  // Where each trained card is drawn right now, in toy coordinates.
  const shown = new Map<string, ToyPoint>(stepStates.at(0));
  let roles = new Map<string, Role>();
  // The ring sits on the nearest card's dot. When the nearest card changes it
  // slides over from where it was, as far as ringMix (0 to 1) says.
  let nearest = neighborAt(0);
  let ringFrom: ToyPoint | null = null;
  let ringMix = 1;
  let pulseOpacity = 0;
  const fade = new Map<string, number>();
  const chipOn = new Map<string, boolean>();
  let unseenOrder: string[] = [];
  const offsets = new Map<string, Offset>();
  let snapOffsets = true;
  let lastDraw = 0;
  let selected: string | null = null;
  let playing = false;
  let playTimer = 0;
  let settles = 0;
  let motion: Tween | null = null;
  let pulse: Tween | null = null;
  const fades = new Map<string, Tween>();

  // ─── Panel: controls, readout, new descriptions, the tapped card ───
  const body = panel(stage);
  const controls = h('div', 'ew-controls', undefined, body);
  const nextButton = button(controls, 'Next example', () => onNext(), signal);
  const playButton = button(controls, 'Play', () => onPlay(), signal);
  const stepRange = range(
    body,
    {
      label: 'training step',
      min: 0,
      max: STEPS,
      step: 1,
      value: 0,
      format: (value) => `${value} of ${STEPS}`,
      onInput: (value) => {
        stopPlaying();
        setStep(value, false);
      },
    },
    signal
  );
  const read = readout(body);
  const score = h('p', 'ew-note', undefined, body);
  const unseenRow = h('div', '', undefined, body);
  unseenRow.hidden = true;
  h('p', 'ew-note', 'Descriptions the examples never showed:', unseenRow);
  const chips = h('div', 'ew-chips', undefined, unseenRow);
  for (const card of toy.unseen) {
    chipOn.set(card.id, false);
    const chip = button(chips, card.text, () => toggleUnseen(card.id, chip), signal);
    chip.setAttribute('aria-pressed', 'false');
  }
  const note = h('p', 'ew-note', undefined, body);

  // ─── Measuring: label widths, the fit, and the free spots ───
  let measured: Measured = measure(initial);

  // Tapping a card shows its full text under the stage, which only the compact
  // layout needs: the wide cards already show it. So only there are the cards
  // buttons and tab stops.
  function syncCards(): void {
    const compact = measured.info.layout === 'compact';
    for (const node of nodes) {
      node.g.setAttribute('role', compact ? 'button' : 'img');
      node.g.classList.toggle('ew-card-hit', compact);
      if (compact) node.g.setAttribute('tabindex', '0');
      else node.g.removeAttribute('tabindex');
    }
  }
  syncCards();

  function labelFor(node: CardNode, layout: Layout): string {
    return layout === 'wide' ? node.full : node.short;
  }

  // The cloud's fit comes from the data file, made offline at a reference scale;
  // here only the label widths are measured, for the free-spot search.
  function measure(info: LayoutInfo): Measured {
    const { u, layout } = info;
    const size = { width: layoutWidth(layout), height: toy.views[layout].height };
    const widths = new Map<string, number>();
    for (const node of nodes) {
      const label = labelFor(node, layout);
      node.text.textContent = label;
      widths.set(node.id, cardWidth(label, u));
    }
    return { info, size, options: cardOptions(size.width, size.height, u), widths };
  }

  function remeasure(info: LayoutInfo): void {
    measured = measure(info);
    applyFrame(svgEl, measured.size, info.u);
    syncCards();
    snapOffsets = true;
    syncNote();
    render();
  }

  // ─── Movement and the nearest card ───
  function ringCenter(): ToyPoint {
    const to = shown.get(nearest) ?? ORIGIN;
    if (!ringFrom) return to;
    return {
      x: ringFrom.x + (to.x - ringFrom.x) * ringMix,
      y: ringFrom.y + (to.y - ringFrom.y) * ringMix,
    };
  }

  // Where a card stood one step ago on the stage, when this step moved it.
  function movedFrom(id: string, view: ToyFit): ToyPoint | null {
    const before = stepStates.at(step - 1)?.get(id);
    const after = stepStates.at(step)?.get(id);
    if (step < 1 || !before || !after) return null;
    const was = viewPoint(view, before);
    const now = viewPoint(view, after);
    return Math.hypot(now.x - was.x, now.y - was.y) > MOVED_MIN ? was : null;
  }

  function ghostRole(n: number, id: string): GhostRole {
    const along = toy.steps.at(n)?.movedAlong?.card === id ? 'pulse' : 'muted';
    return rolesFor(n).get(id) ?? along;
  }

  // From the ghost to the edge of the dot it became, the head sized to what shows.
  function drawGhostArrow(ghost: Ghost, from: ToyPoint, to: ToyPoint, u: number): void {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const reach = length - DOT_RADIUS - 1;
    const show = reach > ARROW_MIN;
    ghost.shaft.setAttribute('visibility', show ? 'visible' : 'hidden');
    ghost.head.setAttribute('visibility', show ? 'visible' : 'hidden');
    if (!show) return;
    const ux = (to.x - from.x) / length;
    const uy = (to.y - from.y) / length;
    const tip = { x: from.x + ux * reach, y: from.y + uy * reach };
    const size = Math.min(ARROW_HEAD_PX * u, reach * 0.7);
    const back = { x: tip.x - ux * size, y: tip.y - uy * size };
    const wing = size * 0.4;
    setAttrs(ghost.shaft, { x1: from.x, y1: from.y, x2: back.x, y2: back.y });
    const corners = [
      tip,
      { x: back.x + uy * wing, y: back.y - ux * wing },
      { x: back.x - uy * wing, y: back.y + ux * wing },
    ];
    ghost.head.setAttribute(
      'points',
      corners.map((p) => `${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`).join(' ')
    );
  }

  // ─── Drawing ───
  const render = scheduler(draw, signal);

  function visibleUnseen(id: string): boolean {
    return (fade.get(id) ?? 0) > 0 || chipOn.get(id) === true;
  }

  function draw(): void {
    const { info, options, widths } = measured;
    const { u } = info;
    const view = toy.views[info.layout];
    // At the end of the run every card gets a spot, shown or not, so showing or
    // hiding a description never moves a card that was already there.
    const positions = new Map<string, ToyPoint>(shown);
    if (step === STEPS) for (const card of toy.unseen) positions.set(card.id, card.at);
    const dotAt = (id: string): ToyPoint => {
      const p = positions.get(id);
      return p ? viewPoint(view, p) : { x: 0, y: 0 };
    };

    // The example's two lines, and the dotted lines of the descriptions shown, are
    // claimed before any card is placed, so cards keep off them. Once a description
    // is shown the example is done with: its lines fade out and stop claiming space.
    const exampleOpacity = 1 - Math.max(0, ...fade.values());
    const example = toy.steps.at(step);
    const pair = example?.pair;
    const unwanted = example?.unwanted;
    const lines: Segment[] = [];
    if (pair && unwanted && exampleOpacity >= 1) {
      lines.push([dotAt(pair.a), dotAt(pair.b)], [dotAt(pair.a), dotAt(unwanted)]);
    }
    const links = toy.unseen.flatMap((card) => {
      const neighbor = unseenNeighbor.get(card.id);
      return visibleUnseen(card.id) && neighbor !== undefined && positions.has(neighbor)
        ? [{ card, neighbor }]
        : [];
    });
    for (const { card, neighbor } of links) lines.push([dotAt(card.id), dotAt(neighbor)]);
    const places = declutter(slotsFor(view, positions, widths), options, lines);

    // Ease each card toward its free spot. A card that just appeared, or a new
    // layout, goes straight there.
    const now = performance.now();
    const k = isReducedMotion() ? 1 : 1 - Math.exp(-Math.min(64, now - lastDraw) / SETTLE_MS);
    lastDraw = now;
    let settling = false;
    const height = CARD_PX * u;
    // Every card claims its box, then the tag takes a clear spot beside the ring.
    const book = labeler(measured.size, u, options.edge);
    let nearestMid: number | null = null;

    for (const node of nodes) {
      const at = positions.get(node.id);
      const place = places.get(node.id);
      const w = widths.get(node.id);
      if (node.late) {
        const show = at !== undefined && place !== undefined && visibleUnseen(node.id);
        node.g.setAttribute('visibility', show ? 'visible' : 'hidden');
        node.g.style.opacity = String(fade.get(node.id) ?? 0);
        if (!show) {
          offsets.delete(node.id);
          continue;
        }
      }
      if (!at || !place || w === undefined) continue;
      const dot = viewPoint(view, at);
      const goal: Offset = { dx: place.left - dot.x, dy: place.bottom - dot.y };
      const previous = offsets.get(node.id);
      const current: Offset =
        !previous || snapOffsets
          ? goal
          : {
              dx: previous.dx + (goal.dx - previous.dx) * k,
              dy: previous.dy + (goal.dy - previous.dy) * k,
            };
      if (Math.abs(goal.dx - current.dx) > 0.4 || Math.abs(goal.dy - current.dy) > 0.4) {
        settling = true;
      }
      offsets.set(node.id, current);

      // Never outside the stage, however far an easing offset still has to go.
      const left = Math.min(options.width - options.edge - w, Math.max(options.edge, dot.x + current.dx));
      const bottom = Math.min(
        options.height - options.edge,
        Math.max(options.edge + height, dot.y + current.dy)
      );
      const spot: Place = { left, bottom };
      book.avoid({ x0: left, x1: left + w, y0: bottom - height, y1: bottom });
      if (node.id === nearest) nearestMid = left + w / 2;
      setAttrs(node.rect, { x: left, y: bottom - height, width: w, height, rx: 3 * u });
      setAttrs(node.dot, { cx: dot.x, cy: dot.y });
      setAttrs(node.text, { x: left + w / 2, y: bottom - height / 2 + BASELINE_PX * u });
      setAttrs(node.leader, leaderFor(spot, w, height, dot));
      const grow = FOCUS_PX * u;
      setAttrs(node.focus, {
        x: left - grow,
        y: bottom - height - grow,
        width: w + 2 * grow,
        height: height + 2 * grow,
      });

      const role = roles.get(node.id);
      if (role === undefined || (role === 'pulse' && pulseOpacity <= 0)) {
        node.outline.setAttribute('visibility', 'hidden');
      } else {
        const out = OUTLINE_PX * u;
        setAttrs(node.outline, {
          class: `ew-outline ew-${role}`,
          visibility: 'visible',
          x: left - out,
          y: bottom - height - out,
          width: w + 2 * out,
          height: height + 2 * out,
          rx: 3 * u + out,
        });
        node.outline.style.opacity = role === 'pulse' ? String(pulseOpacity) : '1';
      }
    }

    // The ring on the nearest card's dot, and its tag beside it, clear of the
    // cards and dots, on the side of the ring away from the card's own label.
    const ring = viewPoint(view, ringCenter());
    setAttrs(nearestRing, { cx: ring.x, cy: ring.y });
    for (const node of nodes) {
      if (node.late && !visibleUnseen(node.id)) continue;
      const at = dotAt(node.id);
      const r = DOT_RADIUS;
      book.avoid({ x0: at.x - r, x1: at.x + r, y0: at.y - r, y1: at.y + r });
    }
    for (const [from, to] of lines) book.avoidLine(from, to);
    const labelOnLeft = nearestMid !== null && nearestMid < ring.x;
    const side = labelOnLeft ? 1 : -1;
    const reach = RING_RADIUS + 4 * u;
    const under = ring.y + RING_RADIUS + 11 * u;
    const away = labelOnLeft ? 'start' : 'end';
    const toward = labelOnLeft ? 'end' : 'start';
    book.put(nearestTag, ring.x + side * reach, ring.y + 4 * u, {
      anchor: away,
      stack: 1,
      tries: [
        { x: ring.x - side * reach, y: ring.y + 4 * u, anchor: toward },
        { x: ring.x + side * 7 * u, y: under, anchor: away },
        { x: ring.x - side * 7 * u, y: under, anchor: toward },
        { x: ring.x, y: ring.y - RING_RADIUS - 4 * u, anchor: 'middle' },
      ],
    });
    snapOffsets = false;

    // Where each card that moved this step stood before it, and the way it went.
    for (const [id, ghost] of ghosts) {
      const was = movedFrom(id, view);
      ghost.g.setAttribute('visibility', was ? 'visible' : 'hidden');
      if (!was) continue;
      ghost.g.setAttribute('class', `ew-ghost ew-ghost--${ghostRole(step, id)}`);
      setAttrs(ghost.dot, { cx: was.x, cy: was.y });
      drawGhostArrow(ghost, was, dotAt(id), u);
    }

    // Lines run between the dots, which are the true addresses.
    if (pair && unwanted && exampleOpacity > 0) {
      const a = dotAt(pair.a);
      const b = dotAt(pair.b);
      const q = dotAt(unwanted);
      setAttrs(pairLine, { x1: a.x, y1: a.y, x2: b.x, y2: b.y, visibility: 'visible' });
      setAttrs(unwantedLine, { x1: a.x, y1: a.y, x2: q.x, y2: q.y, visibility: 'visible' });
      pairLine.style.opacity = String(exampleOpacity);
      unwantedLine.style.opacity = String(exampleOpacity);
    } else {
      pairLine.setAttribute('visibility', 'hidden');
      unwantedLine.setAttribute('visibility', 'hidden');
    }
    for (const card of toy.unseen) unseenLinks.get(card.id)?.setAttribute('visibility', 'hidden');
    for (const { card, neighbor } of links) {
      const link = unseenLinks.get(card.id);
      if (!link) continue;
      const from = dotAt(card.id);
      const to = dotAt(neighbor);
      setAttrs(link, { x1: from.x, y1: from.y, x2: to.x, y2: to.y, visibility: 'visible' });
      link.style.opacity = String(fade.get(card.id) ?? 0);
    }

    if (settling) render();
  }

  // ─── Readout ───
  function paragraph(text: string): HTMLParagraphElement {
    return h('p', '', text);
  }

  function stepParagraphs(n: number): HTMLParagraphElement[] {
    const nearestText = textOf(neighborAt(n));
    const current = toy.steps.at(n);
    if (!current?.pair || current.unwanted === null) {
      return [
        paragraph(
          `Before training the addresses are a guess. Nearest to the request: '${nearestText}'.`
        ),
      ];
    }
    const { a, b } = current.pair;
    const along = current.movedAlong;
    const alongText = along
      ? ` '${textOf(along.card)}' moved too: it shares the word '${along.word}' with '${textOf(along.sharedWith)}'.`
      : '';
    return [
      paragraph(
        `Pulled together: '${textOf(a)}' and '${textOf(b)}'. Pushed away: '${textOf(current.unwanted)}'.${alongText}`
      ),
      paragraph(`Nearest to the request now: '${nearestText}'.`),
    ];
  }

  function unseenParagraph(id: string): HTMLParagraphElement {
    const card = unseenById.get(id);
    if (!card) return paragraph('');
    return paragraph(
      `'${card.text}' was never in an example. Its words were. The same rule put it next to '${textOf(unseenNeighbor.get(id) ?? id)}'. It got two numbers, like every other card. The map did not grow a new direction.`
    );
  }

  function syncReadout(announce: boolean): void {
    const focus = unseenOrder.at(-1);
    const salt = announce ? `#${(settles += 1)}` : '';
    if (step === STEPS && focus !== undefined) {
      read.set(`unseen-${focus}${salt}`, [unseenParagraph(focus)]);
    } else {
      read.set(`step-${step}${salt}`, stepParagraphs(step));
    }
  }

  function syncScore(): void {
    score.textContent = `Nearest is a coffee note: ${COFFEE_NOTES.has(nearest) ? 'yes' : 'no'}`;
  }

  function syncNote(): void {
    const compact = measured.info.layout === 'compact';
    const text = selected === null ? (compact ? TAP_HINT : '') : textOf(selected);
    note.textContent = text;
    note.hidden = text === '';
  }

  function select(id: string): void {
    selected = id;
    syncNote();
  }

  for (const node of nodes) {
    node.g.addEventListener('click', () => select(node.id), { signal });
    node.g.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        select(node.id);
      },
      { signal }
    );
  }

  // ─── Stepping through the run ───
  function rolesFor(n: number): Map<string, Role> {
    const out = new Map<string, Role>();
    const current = toy.steps.at(n);
    if (current?.pair) {
      out.set(current.pair.a, 'pair');
      out.set(current.pair.b, 'pair');
    }
    if (current?.unwanted) out.set(current.unwanted, 'unwanted');
    return out;
  }

  function resetUnseen(): void {
    for (const tw of fades.values()) tw.cancel();
    fades.clear();
    fade.clear();
    unseenOrder = [];
    for (const key of chipOn.keys()) chipOn.set(key, false);
    for (const chip of chips.children) chip.setAttribute('aria-pressed', 'false');
  }

  // animate: Next and Play tween the cards and pulse the card that moved along.
  // Scrubbing jumps with no tween.
  function setStep(n: number, animate: boolean): void {
    step = n;
    motion?.cancel();
    pulse?.cancel();
    pulseOpacity = 0;
    roles = rolesFor(n);
    const target = stepStates.at(n) ?? shown;
    const from = new Map(shown);
    const next = neighborAt(n);
    ringFrom = next === nearest ? null : ringCenter();
    ringMix = 0;
    nearest = next;
    const place = (p: number): void => {
      ringMix = p;
      for (const [id, to] of target) {
        const start = from.get(id) ?? to;
        shown.set(id, { x: start.x + (to.x - start.x) * p, y: start.y + (to.y - start.y) * p });
      }
      render();
    };
    if (animate) {
      motion = tween({ ms: STEP_MS, ease: easeOut, signal, onFrame: place });
    } else {
      // A scrub jumps, and the cards jump with it.
      snapOffsets = true;
      place(1);
    }
    const along = toy.steps.at(n)?.movedAlong;
    if (animate && along) {
      roles.set(along.card, 'pulse');
      pulseOpacity = 1;
      pulse = tween({
        ms: PULSE_MS,
        ease: (p) => p,
        signal,
        onFrame: (p) => {
          pulseOpacity = 1 - p;
          render();
        },
      });
    }
    if (n !== STEPS) resetUnseen();
    nextButton.disabled = n === STEPS;
    stepRange.setValue(n);
    unseenRow.hidden = n !== STEPS;
    syncReadout(false);
    syncScore();
    render();
  }

  function toggleUnseen(id: string, chip: HTMLButtonElement): void {
    const on = chipOn.get(id) !== true;
    chipOn.set(id, on);
    chip.setAttribute('aria-pressed', String(on));
    unseenOrder = unseenOrder.filter((other) => other !== id);
    if (on) unseenOrder.push(id);
    fades.get(id)?.cancel();
    const start = fade.get(id) ?? 0;
    const end = on ? 1 : 0;
    fades.set(
      id,
      tween({
        ms: FADE_MS,
        ease: (p) => p,
        signal,
        onFrame: (p) => {
          fade.set(id, start + (end - start) * p);
          render();
        },
      })
    );
    syncReadout(false);
    render();
  }

  // ─── Buttons ───
  function stopPlaying(): void {
    if (!playing) return;
    playing = false;
    window.clearTimeout(playTimer);
    playButton.textContent = 'Play';
    read.el.setAttribute('aria-live', 'polite');
    syncReadout(true);
  }

  function tick(): void {
    setStep(step + 1, true);
    if (step >= STEPS) stopPlaying();
    else playTimer = window.setTimeout(tick, isReducedMotion() ? PLAY_REDUCED_MS : PLAY_MS);
  }

  function onNext(): void {
    stopPlaying();
    if (step < STEPS) setStep(step + 1, true);
  }

  function onPlay(): void {
    if (playing) {
      stopPlaying();
      return;
    }
    if (step >= STEPS) setStep(0, false);
    playing = true;
    playButton.textContent = 'Pause';
    // A step every 350ms would drown a screen reader, so it hears the end only.
    read.el.setAttribute('aria-live', 'off');
    tick();
  }

  signal.addEventListener('abort', () => window.clearTimeout(playTimer), { once: true });

  // ─── First frame ───
  applyFrame(svgEl, measured.size, initial.u);
  roles = rolesFor(0);
  syncReadout(false);
  syncScore();
  syncNote();
  render();
};
