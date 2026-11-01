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
import type { Layout, ToyData, ToyPoint } from './model';
import {
  applyFrame,
  button,
  createStageSvg,
  easeOut,
  focusFrame,
  h,
  isReducedMotion,
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

type Role = 'pair' | 'unwanted' | 'pulse';

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
  const cardLayer = svg('g', {}, svgEl);
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
    snapOffsets = false;

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
    const current = toy.steps.at(n);
    if (!current?.pair || current.unwanted === null) {
      return [
        paragraph(
          `Before training, the rule is a guess, so the addresses are scattered. Nearest to the request: '${textOf(neighborAt(n))}'. A poor answer.`
        ),
      ];
    }
    const { a, b } = current.pair;
    const along = current.movedAlong;
    const alongText = along
      ? ` '${textOf(along.card)}' moved too, though it was not in this example. It shares the word '${along.word}' with '${textOf(along.sharedWith)}'.`
      : '';
    const lines = [
      paragraph(
        `Example ${n} of ${STEPS}. Wanted together: '${textOf(a)}' and '${textOf(b)}'. They moved closer. Not wanted: '${textOf(current.unwanted)}'. It moved away.${alongText} Nearest to the request: '${textOf(neighborAt(n))}'.`
      ),
    ];
    if (n === STEPS) {
      lines.push(
        paragraph(
          'Nobody placed these cards. The coffee notes gathered near the request because the examples kept saying they belong together, and the opening hours drifted away.'
        )
      );
    }
    return lines;
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
    const place = (p: number): void => {
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
  syncNote();
  render();
};
