// Shared DOM kit for the embedding walkthrough pieces. It owns everything the
// four pieces would otherwise each reinvent: the SVG factory, one render
// scheduler, the layout observer, tweens and timelines, drag and turn gestures,
// the HTML controls, the sprite node, shared-spot spreading and focus rings.
//
// Rules every helper follows:
//   - Teardown goes through the AbortSignal the entry module hands each piece.
//     Listeners pass { signal }; observers, frames and timers register an abort
//     handler. Nothing outlives a view transition.
//   - Nothing here reads the theme. Colors and stroke widths live in the ew-
//     block of prose.css, bound to the theme variables.
//   - Nothing rebuilds the SVG after mount. Pieces build their nodes once and
//     only set attributes and textContent from then on.
//
// Classes the helpers rely on (all styled in prose.css): ew-svg, ew-turnable,
// ew-hit, ew-focus, ew-disc, ew-sprite, ew-dot, ew-name, ew-panel, ew-readout,
// ew-checklist, ew-btn, ew-field, ew-range, ew-track, ew-grid, ew-axis, ew-head.
//
// Three kits live here because two or more pieces draw the same thing: the label
// book (labeler, which keeps text off claimed sprites, lines and other text), arrows (makeArrow and drawArrow), and the page chrome (the grid,
// the axes, and drinks standing with their names and shared-spot tags), so the flat
// page of piece 1 and the page at t = 1 of piece 2 are one drawing.

import { CAST, layoutWidth } from './model';
import type { Anchor, Layout, SpriteId, Taste } from './model';

export type PieceName = 'coffee-placement' | 'page-to-room' | 'ruler-or-arrows' | 'map-learns';

export type MountPiece = (figure: HTMLElement, stage: HTMLDivElement, signal: AbortSignal) => void;

// ───── Elements ────────────────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';

export type Attrs = Record<string, string | number>;

// Numbers are written to 3 decimals, so no caller needs toFixed.
export function setAttrs(el: Element, attrs: Attrs): void {
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(
      name,
      typeof value === 'number' ? String(Math.round(value * 1000) / 1000) : value
    );
  }
}

// Creates an SVG element with its attributes and, optionally, appends it.
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs,
  parent?: Element
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  parent?.append(el);
  return el;
}

// Creates an SVG text node with its content and, optionally, appends it.
export function svgText(parent: Element, className: string, content: string): SVGTextElement {
  const text = svg('text', { class: className }, parent);
  text.textContent = content;
  return text;
}

// Creates an HTML element with a class, optional text and an optional parent.
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
  parent?: Element
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className !== '') el.className = className;
  if (text !== undefined) el.textContent = text;
  parent?.append(el);
  return el;
}

// top is where the viewBox starts, for a piece that crops headroom it never uses.
export type Size = { width: number; height: number; top?: number };

const viewBoxOf = (size: Size): string => `0 ${size.top ?? 0} ${size.width} ${size.height}`;

// The piece's SVG, labelled by the figcaption so a screen reader announces the
// figure with its caption. Appended to the stage and returned.
export function createStageSvg(
  figure: HTMLElement,
  stage: HTMLDivElement,
  size: Size
): SVGSVGElement {
  const el = svg('svg', {
    class: 'ew-svg',
    viewBox: viewBoxOf(size),
    role: 'group',
  });
  const caption = figure.querySelector(':scope > figcaption');
  if (caption instanceof HTMLElement && caption.id !== '') {
    el.setAttribute('aria-labelledby', caption.id);
  }
  stage.append(el);
  return el;
}

// The HTML region under the SVG for readouts and controls.
export function panel(stage: HTMLDivElement): HTMLDivElement {
  return h('div', 'ew-panel', undefined, stage);
}

// Moves the given nodes to the end of their parent in the given order, only
// when the current order differs. Pass nodes that live in one dedicated group.
export function reorder(parent: Element, nodes: readonly Element[]): void {
  const order = Array.from(parent.children);
  let last = -1;
  for (const node of nodes) {
    const index = order.indexOf(node);
    if (index < last) {
      parent.append(...nodes);
      return;
    }
    last = index;
  }
}

// ───── Rendering ───────────────────────────────────────────────────────────

// Collapses any number of state changes into one requestAnimationFrame. The
// returned function is the piece's render(): call it freely.
export function scheduler(draw: () => void, signal: AbortSignal): () => void {
  let frame = 0;
  let pending = false;
  const run = (): void => {
    pending = false;
    draw();
  };
  signal.addEventListener(
    'abort',
    () => {
      if (pending) cancelAnimationFrame(frame);
      pending = false;
    },
    { once: true }
  );
  return () => {
    if (pending || signal.aborted) return;
    pending = true;
    frame = requestAnimationFrame(run);
  };
}

// ───── Layout ──────────────────────────────────────────────────────────────

export const WIDE_MIN_WIDTH = 560;

// The width of a hit circle's radius, in CSS px. Multiply by u for user units.
export const HIT_RADIUS_PX = 24;

// layout: wide at 560 CSS px and up, compact below. u: user units per CSS px,
// so 12 * u user units render as 12 CSS px. cssWidth: the rendered stage width.
export type LayoutInfo = { layout: Layout; u: number; cssWidth: number };

function layoutInfo(cssWidth: number): LayoutInfo {
  const layout: Layout = cssWidth >= WIDE_MIN_WIDTH ? 'wide' : 'compact';
  const u = cssWidth > 0 ? layoutWidth(layout) / cssWidth : 1;
  return { layout, u, cssWidth };
}

// Measures the stage now and returns the result, then watches it with one
// ResizeObserver. Changes reach onChange inside one animation frame, with
// layoutChanged true when the wide/compact switch flipped.
export function observeLayout(
  stage: HTMLElement,
  signal: AbortSignal,
  onChange: (info: LayoutInfo, layoutChanged: boolean) => void
): LayoutInfo {
  let current = layoutInfo(stage.getBoundingClientRect().width);
  let latestWidth = current.cssWidth;
  const flush = scheduler(() => {
    const next = layoutInfo(latestWidth);
    if (next.layout === current.layout && Math.abs(next.u - current.u) < 1e-6) return;
    const layoutChanged = next.layout !== current.layout;
    current = next;
    onChange(next, layoutChanged);
  }, signal);
  const observer = new ResizeObserver((entries) => {
    const entry = entries.at(-1);
    if (!entry) return;
    latestWidth = entry.contentRect.width;
    flush();
  });
  observer.observe(stage);
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  return current;
}

// Sets the viewBox and the --ew-u custom property that CSS turns into 12px
// labels and constant-width strokes.
export function applyFrame(svgEl: SVGSVGElement, size: Size, u: number): void {
  svgEl.setAttribute('viewBox', viewBoxOf(size));
  svgEl.style.setProperty('--ew-u', u.toFixed(4));
}

// ───── Labels ──────────────────────────────────────────────────────────────

export type Point = { x: number; y: number };

// What a label occupies, with a little air around it.
export type Box = { x0: number; x1: number; y0: number; y1: number };

const LABEL_PAD = 4;
// CSS px between stacked rows of labels.
const ROW_PX = 14;
// CSS px: how far text keeps from a claimed line, and the longest piece of a
// slanted line that one box covers (so the strip stays thin along a diagonal).
const LINE_PAD_PX = 3;
const LINE_STEP_PX = 12;
// How bad it is to cover a claim when nothing is clear: text is the worst, a
// painted sprite next, a line least. Paint is never covered while a place that
// crosses only lines remains: in the fallback it costs more than any area can.
const TEXT_WEIGHT = 4;
const SPRITE_WEIGHT = 3;
const LINE_WEIGHT = 2;
const PAINT_COST = 1e9;
// Boxes that touch, or overlap by less than this many user units on a side,
// do not cover each other: a float rounding away from zero is not a collision.
const SLIVER = 0.01;
// What each row a label drops below its first row costs when nothing is clear, in
// square CSS px: a little more than crossing one upright line, so a name crosses a
// line beside its own dot before it drifts rows away and reads as someone else's.
const ROW_COST = 200;

export type PutOptions = {
  // Which end of the label sits at x. Default: middle. Several are tried in order,
  // and the first that is clear wins (the label stays on its row).
  anchor?: Anchor | readonly Anchor[];
  // Other places to try, in order, when (x, y) is taken. One may name its own anchor.
  tries?: readonly (Point & { anchor?: Anchor })[];
  // Degrees. Given, the label is centered on the point and turned about it.
  angle?: number;
  // 1 slides the label down to the first free row, -1 up, 0 leaves it where it is.
  // Each row tries every place and anchor before the label drops to the next.
  stack?: -1 | 0 | 1;
  // How many rows to try before giving up and taking the first choice. Default 8.
  rows?: number;
  // More places to weigh when no place is clear (a ruler's number on its own
  // ruler, say). The label takes the place that costs least, and a fallback that
  // covers text or a sprite never wins.
  fallback?: readonly (Point & { anchor: Anchor })[];
};

export type Labeler = {
  // Claims space (a sprite, say) that later labels keep clear of. When no clear
  // place is left a label takes the one it covers least, and weight says how bad
  // covering this claim is (default 4, the weight of text). A sprite weighs at
  // least as much as a line, so a label crosses a line before it covers a cup.
  avoid(box: Box, weight?: number): void;
  // Claims a thin strip along a drawn segment (an axis, an arrow shaft, a ruler,
  // a drop line) so later labels slide off it. Claim lines before any name or tag.
  avoidLine(from: Point, to: Point): void;
  // Sets x, y and the anchor of a label that already holds its text and is shown,
  // keeps it inside the view, claims its box and returns it. Without stack or
  // tries the label goes exactly where asked.
  put(text: SVGTextElement, x: number, y: number, options?: PutOptions): Box;
};

// One book per frame: names, tags and axis labels claim boxes in priority order,
// and the labels that follow settle around the ones already placed.
// edge is the air, in user units, a label keeps from every side of the view.
export function labeler(view: Size, u: number, edge = LABEL_PAD): Labeler {
  const taken: (Box & { weight: number })[] = [];
  // How much of a box the claimed space covers, in square user units, each claim
  // counting by its weight.
  const covered = (b: Box, least = 0): number =>
    taken.reduce(
      (sum, t) =>
        t.weight < least
          ? sum
          : sum +
            t.weight *
              Math.max(0, Math.min(b.x1, t.x1) - Math.max(b.x0, t.x0) - SLIVER) *
              Math.max(0, Math.min(b.y1, t.y1) - Math.max(b.y0, t.y0) - SLIVER),
      0
    );
  const top = view.top ?? 0;
  return {
    avoid: (box, weight = TEXT_WEIGHT) => {
      taken.push({ ...box, weight });
    },
    avoidLine(from, to) {
      const pad = LINE_PAD_PX * u;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const pieces = Math.max(1, Math.ceil(length / (LINE_STEP_PX * u)));
      const at = (t: number): Point => ({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      });
      for (let i = 0; i < pieces; i += 1) {
        const a = at(i / pieces);
        const b = at((i + 1) / pieces);
        taken.push({
          x0: Math.min(a.x, b.x) - pad,
          x1: Math.max(a.x, b.x) + pad,
          y0: Math.min(a.y, b.y) - pad,
          y1: Math.max(a.y, b.y) + pad,
          weight: LINE_WEIGHT,
        });
      }
    },
    put(
      text,
      x,
      y,
      { anchor = 'middle', angle, stack = 0, tries = [], rows: most = 8, fallback } = {}
    ) {
      const length = text.getComputedTextLength();
      let box: Box;
      if (angle === undefined) {
        const choices = typeof anchor === 'string' ? [anchor] : anchor;
        const fit = (
          a: Anchor,
          px0: number,
          py0: number
        ): { a: Anchor; px: number; py: number; box: Box } => {
          const before = a === 'start' ? 0 : a === 'end' ? length : length / 2;
          const lo = edge + before;
          const hi = view.width - edge - (length - before);
          const squeezed = lo > hi;
          const px = squeezed ? view.width / 2 : Math.min(hi, Math.max(lo, px0));
          const left = squeezed ? length / 2 : before;
          // Inside the view vertically too, so a label low on the stage keeps its descenders.
          const py = Math.min(
            top + view.height - LABEL_PAD,
            Math.max(top + LABEL_PAD + 11 * u, py0)
          );
          return {
            a: squeezed ? 'middle' : a,
            px,
            py,
            box: {
              x0: px - left - 3 * u,
              x1: px + length - left + 3 * u,
              y0: py - 11 * u,
              y1: py + 2 * u,
            },
          };
        };
        const rows = stack === 0 ? 1 : most;
        const score = (a: Anchor, px: number, py: number, row: number) => {
          const candidate = fit(a, px, py);
          const area = covered(candidate.box);
          const paint = covered(candidate.box, SPRITE_WEIGHT) > 0 ? PAINT_COST : 0;
          return { candidate, area, cost: area + row * ROW_COST * u * u + paint };
        };
        // Every place in the order of preference: row by row, each place and anchor,
        // then the fallback.
        const scored = [
          ...Array.from({ length: rows }, (_, row) =>
            [{ x, y }, ...tries].flatMap((p) =>
              ('anchor' in p && p.anchor ? [p.anchor] : choices).map((a) =>
                score(a, p.x, p.y + row * stack * ROW_PX * u, row)
              )
            )
          ).flat(),
        ];
        const fallbacks = (fallback ?? [])
          .map((p) => score(p.anchor, p.x, p.y, 0))
          .filter((s) => covered(s.candidate.box, TEXT_WEIGHT) === 0);
        // The first clear place wins. When none is clear the label takes the place
        // that costs least, never the first choice: a place over text or a sprite
        // loses to any that crosses only lines, and every row it drops costs a little.
        const clear = scored.find((s) => s.area === 0);
        const placed = clear
          ? clear.candidate
          : [...scored, ...fallbacks].reduce((best, s) => (s.cost < best.cost ? s : best))
              .candidate;
        setAttrs(text, { x: placed.px, y: placed.py, 'text-anchor': placed.a });
        box = placed.box;
      } else {
        const turn = (angle * Math.PI) / 180;
        const w = Math.abs(length * Math.cos(turn)) + 14 * u * Math.abs(Math.sin(turn));
        const h = Math.abs(length * Math.sin(turn)) + 14 * u * Math.abs(Math.cos(turn));
        const px = Math.min(view.width - edge - w / 2, Math.max(edge + w / 2, x));
        const py = Math.min(
          top + view.height - LABEL_PAD - h / 2,
          Math.max(top + LABEL_PAD + h / 2, y)
        );
        setAttrs(text, {
          x: px,
          y: py,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          transform: `rotate(${Math.round(angle * 100) / 100} ${Math.round(px * 100) / 100} ${Math.round(py * 100) / 100})`,
        });
        box = { x0: px - w / 2, x1: px + w / 2, y0: py - h / 2, y1: py + h / 2 };
      }
      taken.push({ ...box, weight: TEXT_WEIGHT });
      return box;
    },
  };
}

// Claims the air around a placed label, dx and dy user units out from its box,
// at the weight of paint: a later label keeps off it while any place that
// crosses only lines remains, but takes it before it covers text.
export function claimAir(book: Labeler, box: Box, dx: number, dy: number): void {
  book.avoid({ x0: box.x0 - dx, x1: box.x1 + dx, y0: box.y0 - dy, y1: box.y1 + dy }, SPRITE_WEIGHT);
}

// ───── Motion ──────────────────────────────────────────────────────────────

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export const isReducedMotion = (): boolean => reducedMotion.matches;

export type Ease = (p: number) => number;

export const easeOut: Ease = (p) => 1 - (1 - p) ** 3;

export const easeInOutCubic: Ease = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

export type Tween = { cancel(): void; done: Promise<void> };

export type TweenOptions = {
  ms: number;
  ease?: Ease;
  signal: AbortSignal;
  // Receives the eased progress, 0 to 1, ending on exactly 1.
  onFrame: (p: number) => void;
};

const settled: Tween = { cancel: () => {}, done: Promise.resolve() };

// Drives onFrame over ms. done resolves when the tween finishes or is cancelled.
// Dragging, scrubbing and turning never pass through this.
export function tween(options: TweenOptions): Tween {
  const { signal, onFrame } = options;
  const ease = options.ease ?? easeOut;
  if (signal.aborted) return settled;
  // Under reduced motion every tween is an instant jump, opacity changes included.
  if (reducedMotion.matches || options.ms <= 0) {
    onFrame(1);
    return settled;
  }
  const ms = options.ms;
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let frame = 0;
  let over = false;
  const stop = (): void => {
    if (over) return;
    over = true;
    cancelAnimationFrame(frame);
    signal.removeEventListener('abort', stop);
    finish();
  };
  signal.addEventListener('abort', stop, { once: true });
  const start = performance.now();
  const step = (now: number): void => {
    if (over) return;
    const p = Math.min(1, Math.max(0, (now - start) / ms));
    onFrame(ease(p));
    if (p < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  frame = requestAnimationFrame(step);
  return { cancel: stop, done };
}

// One timeline segment. Without onFrame it is a hold (a pause between moves).
export type Segment = { ms: number; ease?: Ease; onFrame?: (p: number) => void };

// Runs segments back to back as motion and cancels as a unit. Under reduced
// motion every segment, holds included, collapses to its final frame.
export function timeline(segments: readonly Segment[], signal: AbortSignal): Tween {
  let cancelled = false;
  let running: Tween = settled;
  const run = async (): Promise<void> => {
    for (const segment of segments) {
      if (cancelled || signal.aborted) return;
      running = tween({
        ms: segment.ms,
        ease: segment.ease ?? easeInOutCubic,
        signal,
        onFrame: segment.onFrame ?? (() => {}),
      });
      await running.done;
    }
  };
  const done = run();
  return {
    cancel: () => {
      cancelled = true;
      running.cancel();
    },
    done,
  };
}

// ───── Gestures ────────────────────────────────────────────────────────────

function toUserPoint(svgEl: SVGSVGElement, clientX: number, clientY: number): DOMPoint | null {
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return null;
  return new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
}

// Makes a transparent hit circle draggable. onMove receives the position, in
// user units, that the circle's center should take: the grab offset is kept,
// so the item does not jump under the finger. The piece owns the circle's
// cx and cy and must keep them on the item. touch-action: none comes from the
// ew-hit class, on this circle only, so the page still scrolls everywhere else.
export function dragHandle(
  hit: SVGCircleElement,
  svgEl: SVGSVGElement,
  signal: AbortSignal,
  onMove: (x: number, y: number) => void,
  onRelease: () => void
): void {
  hit.classList.add('ew-hit');
  let activeId: number | null = null;
  let offsetX = 0;
  let offsetY = 0;
  const end = (ev: PointerEvent): void => {
    if (activeId === null || ev.pointerId !== activeId) return;
    activeId = null;
    onRelease();
  };
  hit.addEventListener(
    'pointerdown',
    (ev) => {
      if (!ev.isPrimary || ev.button !== 0) return;
      const point = toUserPoint(svgEl, ev.clientX, ev.clientY);
      if (!point) return;
      activeId = ev.pointerId;
      offsetX = hit.cx.baseVal.value - point.x;
      offsetY = hit.cy.baseVal.value - point.y;
      hit.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    },
    { signal }
  );
  hit.addEventListener(
    'pointermove',
    (ev) => {
      if (ev.pointerId !== activeId) return;
      const point = toUserPoint(svgEl, ev.clientX, ev.clientY);
      if (point) onMove(point.x + offsetX, point.y + offsetY);
    },
    { signal }
  );
  hit.addEventListener('pointerup', end, { signal });
  hit.addEventListener('pointercancel', end, { signal });
}

const TURN_COMMIT_PX = 8;

// Horizontal turning that never steals the article's vertical scroll. The
// stage gets touch-action: pan-y. The gesture commits only after 8px of
// horizontal travel that comes before 8px of vertical travel, then captures the
// pointer and reports each horizontal step in CSS px. A pointercancel (the
// browser took a vertical pan) resets it.
export function turnGesture(
  svgEl: SVGSVGElement,
  signal: AbortSignal,
  onDeltaPx: (dx: number) => void
): void {
  svgEl.classList.add('ew-turnable');
  type Track = {
    id: number;
    x0: number;
    y0: number;
    lastX: number;
    state: 'pending' | 'turning' | 'scrolling';
  };
  let track: Track | null = null;
  const end = (ev: PointerEvent): void => {
    if (track && ev.pointerId === track.id) track = null;
  };
  svgEl.addEventListener(
    'pointerdown',
    (ev) => {
      if (!ev.isPrimary || ev.button !== 0) return;
      track = {
        id: ev.pointerId,
        x0: ev.clientX,
        y0: ev.clientY,
        lastX: ev.clientX,
        state: 'pending',
      };
    },
    { signal }
  );
  svgEl.addEventListener(
    'pointermove',
    (ev) => {
      if (!track || ev.pointerId !== track.id || track.state === 'scrolling') return;
      if (track.state === 'pending') {
        const travelX = Math.abs(ev.clientX - track.x0);
        const travelY = Math.abs(ev.clientY - track.y0);
        if (travelY >= TURN_COMMIT_PX) {
          track.state = 'scrolling';
          return;
        }
        if (travelX < TURN_COMMIT_PX) return;
        track.state = 'turning';
        svgEl.setPointerCapture(ev.pointerId);
        onDeltaPx(ev.clientX - track.x0);
        track.lastX = ev.clientX;
        return;
      }
      onDeltaPx(ev.clientX - track.lastX);
      track.lastX = ev.clientX;
    },
    { signal }
  );
  svgEl.addEventListener('pointerup', end, { signal });
  svgEl.addEventListener('pointercancel', end, { signal });
}

// ───── Focus rings ─────────────────────────────────────────────────────────

// SVG focusables draw their own ring: a child of the focusable element, shown by
// CSS on :focus-visible. The caller sets the geometry.
export function focusRing(parent: SVGElement): SVGCircleElement {
  return svg('circle', { class: 'ew-focus', 'aria-hidden': 'true' }, parent);
}

export function focusFrame(parent: SVGElement): SVGRectElement {
  return svg('rect', { class: 'ew-focus', rx: 4, 'aria-hidden': 'true' }, parent);
}

// Insets the frame by half its 2px stroke so it sits inside the viewBox.
export function sizeFocusFrame(frame: SVGRectElement, size: Size, u: number): void {
  const inset = u;
  setAttrs(frame, {
    x: inset,
    y: (size.top ?? 0) + inset,
    width: size.width - 2 * inset,
    height: size.height - 2 * inset,
  });
}

// ───── Controls ────────────────────────────────────────────────────────────

export function button(
  parent: Element,
  label: string,
  onClick: () => void,
  signal: AbortSignal
): HTMLButtonElement {
  const el = h('button', 'ew-btn', label, parent);
  el.type = 'button';
  el.addEventListener('click', onClick, { signal });
  return el;
}

export type RangeOptions = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  // Text for the value shown beside the label and for aria-valuetext.
  format?: (value: number) => string;
  // Labels spread evenly under the track, such as "line", "page", "room".
  ticks?: readonly string[];
  onInput: (value: number) => void;
  // Fires on release, for snapping.
  onChange?: (value: number) => void;
};

export type RangeControl = {
  root: HTMLDivElement;
  input: HTMLInputElement;
  // Moves the thumb and the shown value without calling the handlers.
  setValue(value: number): void;
};

let rangeCount = 0;

// A native range input with a visible label. Values are read with valueAsNumber.
export function range(parent: Element, options: RangeOptions, signal: AbortSignal): RangeControl {
  rangeCount += 1;
  const id = `ew-range-${rangeCount}`;
  const root = h('div', 'ew-field', undefined, parent);
  const head = h('div', 'ew-field__head', undefined, root);
  const label = h('label', 'ew-field__label', options.label, head);
  label.htmlFor = id;
  const shown = h('span', 'ew-field__value', undefined, head);
  shown.setAttribute('aria-hidden', 'true');
  const input = h('input', 'ew-range', undefined, root);
  input.id = id;
  input.type = 'range';
  input.min = String(options.min);
  input.max = String(options.max);
  input.step = String(options.step);
  if (options.ticks) {
    const ticks = h('div', 'ew-field__ticks', undefined, root);
    ticks.setAttribute('aria-hidden', 'true');
    for (const tick of options.ticks) h('span', '', tick, ticks);
  }
  const show = (): void => {
    if (!options.format) return;
    const text = options.format(input.valueAsNumber);
    shown.textContent = text;
    input.setAttribute('aria-valuetext', text);
  };
  const setValue = (value: number): void => {
    input.value = String(value);
    show();
  };
  setValue(options.value);
  input.addEventListener(
    'input',
    () => {
      show();
      options.onInput(input.valueAsNumber);
    },
    { signal }
  );
  const onChange = options.onChange;
  if (onChange) input.addEventListener('change', () => onChange(input.valueAsNumber), { signal });
  return { root, input, setValue };
}

export type Readout = {
  el: HTMLDivElement;
  // Rewrites the region only when bandKey differs from the last one, so a
  // screen reader hears a change of state and never a change of frame.
  set(bandKey: string, content: string | readonly (string | Node)[]): void;
};

export function readout(parent: Element): Readout {
  const el = h('div', 'ew-readout', undefined, parent);
  el.setAttribute('aria-live', 'polite');
  let lastKey: string | null = null;
  return {
    el,
    set(bandKey, content) {
      if (bandKey === lastKey) return;
      lastKey = bandKey;
      if (typeof content === 'string') el.replaceChildren(content);
      else el.replaceChildren(...content);
    },
  };
}

export type Verdict = 'kept' | 'broken' | 'unasked';

const verdictWord = (verdict: Verdict): string =>
  verdict === 'unasked' ? 'not asked yet' : verdict;

const PROMISES = [
  'Just as sweet as the first coffee',
  'Just as nutty as the first coffee',
  'Not in the same spot as the first coffee',
] as const;

export type Checklist = {
  el: HTMLUListElement;
  // Rows in order: just as sweet, just as nutty, not in the same spot.
  set(sweet: Verdict, nutty: Verdict, apart: Verdict): void;
};

// The three promises the coffees are held to, each ending in a status word
// styled ew-kept, ew-broken or ew-unasked.
export function checklist(parent: Element): Checklist {
  const el = h('ul', 'ew-checklist', undefined, parent);
  const words = PROMISES.map((promise) => {
    const row = h('li', '', undefined, el);
    h('span', 'ew-checklist__promise', promise, row);
    return h('span', 'ew-unasked', verdictWord('unasked'), row);
  });
  const last: (Verdict | null)[] = words.map(() => null);
  return {
    el,
    set(...verdicts) {
      verdicts.forEach((verdict, i) => {
        const word = words.at(i);
        if (!word || last[i] === verdict) return;
        last[i] = verdict;
        word.className = `ew-${verdict}`;
        word.textContent = verdictWord(verdict);
      });
    },
  };
}

export type TrackOptions = {
  label: string;
  from: string;
  to: string;
  tone: 'blue' | 'amber';
  note?: string;
};

export type Track = {
  root: HTMLDivElement;
  // fraction fills the bar, 0 to 1. value is the number, word an optional band.
  set(fraction: number, value: string, word?: string): void;
};

// A thin labelled bar with a number beside it, for piece 3's two readouts.
export function track(parent: Element, options: TrackOptions): Track {
  const root = h('div', 'ew-track', undefined, parent);
  const head = h('div', 'ew-track__head', undefined, root);
  h('span', '', options.label, head);
  const value = h('span', 'ew-track__value', undefined, head);
  const bar = h('div', 'ew-track__bar', undefined, root);
  const fill = h(
    'span',
    options.tone === 'amber' ? 'ew-track__fill ew-track__fill--amber' : 'ew-track__fill',
    undefined,
    bar
  );
  const ends = h('div', 'ew-track__ends', undefined, root);
  h('span', '', options.from, ends);
  h('span', '', options.to, ends);
  if (options.note !== undefined) h('p', 'ew-note', options.note, root);
  return {
    root,
    set(fraction, text, word) {
      fill.style.width = `${(Math.min(1, Math.max(0, fraction)) * 100).toFixed(1)}%`;
      value.textContent = word ? `${text} ${word}` : text;
    },
  };
}

// ───── Sprites ─────────────────────────────────────────────────────────────

export type Sprite = {
  g: SVGGElement;
  disc: SVGCircleElement;
  image: SVGImageElement;
  dot: SVGCircleElement;
  name: SVGTextElement;
  // The share of the sprite's square, from the top, that is clear air above
  // the painted drink: a label may stand there without covering it.
  air: number;
  // Shows or hides the sprite and its name together.
  show(visible: boolean): void;
  // Stands the sprite bottom-center on the dot at (x, y). dx slides the sprite and
  // its disc sideways while the dot stays on the true address (the spread of a
  // shared spot). h is the sprite height in user units. The name is placed by
  // placeStands, never here.
  place(box: { x: number; y: number; h: number; dx?: number }): void;
};

// Measured from the cast's alpha: the cups are painted from the bottom up and
// leave the top two fifths of their square clear (the hazelnut's garnish rises
// higher); the glasses fill theirs.
const AIR: Record<SpriteId, number> = {
  'orange-juice': 0,
  'lemon-juice': 0,
  'black-coffee': 0.4,
  latte: 0.4,
  'hazelnut-latte': 0.2,
};

// A drink: disc (dark mode only), painted image, 5-unit dot and name, in that
// z-order. Billboards only: place() changes x and y, never a transform. Given
// labels, the name lives in that layer instead, drawn above every sprite, so no
// glass can ever cover a name.
export function sprite(parent: Element, id: SpriteId, name: string, labels?: Element): Sprite {
  const g = svg('g', {}, parent);
  const disc = svg('circle', { class: 'ew-disc', 'aria-hidden': 'true' }, g);
  const image = svg(
    'image',
    {
      class: 'ew-sprite',
      href: CAST[id],
      preserveAspectRatio: 'xMidYMax meet',
      'aria-hidden': 'true',
    },
    g
  );
  const dot = svg('circle', { class: 'ew-dot', r: 5, 'aria-hidden': 'true' }, g);
  const label = svgText(labels ?? g, 'ew-name', name);
  return {
    g,
    disc,
    image,
    dot,
    name: label,
    air: AIR[id],
    show(visible) {
      const display = visible ? 'inline' : 'none';
      g.setAttribute('display', display);
      label.setAttribute('display', display);
    },
    place({ x, y, h: height, dx = 0 }) {
      const sx = x + dx;
      setAttrs(dot, { cx: x, cy: y });
      setAttrs(disc, { cx: sx, cy: y - height / 2, r: 0.45 * height });
      setAttrs(image, { x: sx - height / 2, y: y - height, width: height, height });
    },
  };
}

// ───── Shared spots ────────────────────────────────────────────────────────

export type SpreadPoint = { key: string; x: number; y: number };

// A set of drinks that stand together, with its center for the shared tag. tight
// is true when they stand on one spot, not merely close.
export type SpreadGroup = { keys: string[]; x: number; y: number; tight: boolean };

export type Spread = {
  // Target sideways offset per key; 0 for drinks that stand alone.
  offsets: Map<string, number>;
  groups: SpreadGroup[];
};

const SAME_SPOT = 12;
const SPREAD_SPACING = 36;

// Drinks whose dots project within threshold units of one another (chained
// through neighbors) spread their sprites spacing units apart, centered on the
// shared dot, in the order the points were given.
export function spreadGroups(
  points: readonly SpreadPoint[],
  threshold = SAME_SPOT,
  spacing = SPREAD_SPACING
): Spread {
  // Each point starts in its own group; a pair within the threshold merges the
  // two groups, so neighbors chain.
  const group = points.map((_, i) => i);
  points.forEach((a, i) =>
    points.forEach((b, j) => {
      if (j > i && Math.hypot(a.x - b.x, a.y - b.y) <= threshold) {
        const [from, to] = [group[j], group[i]];
        group.forEach((g, k) => {
          if (g === from) group[k] = to;
        });
      }
    })
  );
  const members = new Map<number, SpreadPoint[]>();
  points.forEach((point, i) => {
    const list = members.get(group[i]);
    if (list) list.push(point);
    else members.set(group[i], [point]);
  });
  const offsets = new Map<string, number>();
  const groups: SpreadGroup[] = [];
  for (const list of members.values()) {
    list.forEach((point, i) =>
      offsets.set(point.key, list.length > 1 ? (i - (list.length - 1) / 2) * spacing : 0)
    );
    if (list.length < 2) continue;
    const x = list.reduce((sum, p) => sum + p.x, 0) / list.length;
    const y = list.reduce((sum, p) => sum + p.y, 0) / list.length;
    const tight = list.every((a) =>
      list.every((b) => Math.hypot(a.x - b.x, a.y - b.y) <= SAME_SPOT)
    );
    groups.push({ keys: list.map((p) => p.key), x, y, tight });
  }
  return { offsets, groups };
}

export type SpreadEase = {
  // Call from draw() with the latest targets. When any target changed, the
  // current offsets ease to it over 150ms and onFrame runs each frame.
  retarget(offsets: ReadonlyMap<string, number>): void;
  // The eased offset to draw this frame.
  offset(key: string): number;
};

const SPREAD_MS = 150;

export function spreadEase(signal: AbortSignal, onFrame: () => void): SpreadEase {
  const current = new Map<string, number>();
  let target = new Map<string, number>();
  let running: Tween = settled;
  return {
    offset: (key) => current.get(key) ?? 0,
    retarget(offsets) {
      let changed = offsets.size !== target.size;
      for (const [key, value] of offsets) if ((target.get(key) ?? 0) !== value) changed = true;
      if (!changed) return;
      target = new Map(offsets);
      const from = new Map(current);
      running.cancel();
      running = tween({
        ms: SPREAD_MS,
        ease: easeOut,
        signal,
        onFrame: (p) => {
          for (const [key, to] of target) {
            const start = from.get(key) ?? 0;
            current.set(key, start + (to - start) * p);
          }
          onFrame();
        },
      });
    },
  };
}

// ───── Arrows ──────────────────────────────────────────────────────────────

export type Arrow = { line: SVGLineElement; head: SVGPolygonElement };

export function makeArrow(parent: Element, lineClass: string, headClass: string): Arrow {
  return {
    line: svg('line', { class: lineClass, display: 'none' }, parent),
    head: svg('polygon', { class: headClass, display: 'none' }, parent),
  };
}

const HEAD_PX = 11;
const WING_PX = 4.5;

// A shaft from `from` that stops inside a filled head at `tip`, so the line never
// pokes through the point. An arrow shorter than its head is hidden. Returns
// whether the arrow is shown, for a caller that claims it in the label book.
export function drawArrow(arrow: Arrow, from: Point, tip: Point, u: number): boolean {
  const length = Math.hypot(tip.x - from.x, tip.y - from.y);
  const show = length > HEAD_PX * u;
  arrow.line.setAttribute('display', show ? 'inline' : 'none');
  arrow.head.setAttribute('display', show ? 'inline' : 'none');
  if (!show) return false;
  const ux = (tip.x - from.x) / length;
  const uy = (tip.y - from.y) / length;
  const back = { x: tip.x - ux * HEAD_PX * u, y: tip.y - uy * HEAD_PX * u };
  const wing = WING_PX * u;
  setAttrs(arrow.line, {
    x1: from.x,
    y1: from.y,
    x2: tip.x - ux * HEAD_PX * u * 0.8,
    y2: tip.y - uy * HEAD_PX * u * 0.8,
  });
  const corner = (sign: number): string =>
    `${Math.round((back.x + sign * uy * wing) * 100) / 100},${Math.round((back.y - sign * ux * wing) * 100) / 100}`;
  arrow.head.setAttribute(
    'points',
    `${Math.round(tip.x * 100) / 100},${Math.round(tip.y * 100) / 100} ${corner(-1)} ${corner(1)}`
  );
  return true;
}

// The square an arrowhead at tip paints, wider than the strip its shaft claims.
export function headBox(from: Point, tip: Point, u: number): Box {
  const head = (HEAD_PX / 2) * u;
  const length = Math.hypot(tip.x - from.x, tip.y - from.y) || 1;
  const hx = tip.x - ((tip.x - from.x) / length) * head;
  const hy = tip.y - ((tip.y - from.y) / length) * head;
  return { x0: hx - head, x1: hx + head, y0: hy - head, y1: hy + head };
}

// Claims a drawn arrow: its shaft as a line, its head as paint, so a label
// crosses the shaft before it covers the head.
export function claimArrow(book: Labeler, from: Point, tip: Point, u: number): void {
  book.avoidLine(from, tip);
  book.avoid(headBox(from, tip, u), SPRITE_WEIGHT);
}

// ───── The floor and its axes ──────────────────────────────────────────────

// The 4x4 floor: five lines each way. Even indices run across, odd ones along.
export function gridLines(parent: Element): SVGLineElement[] {
  return Array.from({ length: 10 }, () => svg('line', { class: 'ew-grid' }, parent));
}

export function drawGrid(
  lines: readonly SVGLineElement[],
  at: (s: number, n: number) => Point
): void {
  lines.forEach((line, i) => {
    const t = Math.floor(i / 2) / 4;
    const [a, b] = i % 2 === 0 ? [at(0, t), at(1, t)] : [at(t, 0), at(t, 1)];
    setAttrs(line, { x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  });
}

export type Axis = { arrow: Arrow; label: SVGTextElement };

// How much of an axis is drawn and how visible its name is, each 0 to 1, and
// how many CSS px farther off the axis its name stands (a bracket tag's row).
export type AxisState = { grow: number; label: number; away?: number };

type AxisSpec = { end: Taste; name: string; along: number; offset: number };

// Sweetness, nuttiness and, in the room, citrus brightness. Names of the first
// two run along the axis, on the side away from the floor. The third stands above
// its tip, and its piece places it itself once the drinks have settled.
const AXES: readonly AxisSpec[] = [
  { end: { s: 1, n: 0, c: 0 }, name: 'sweetness', along: 0.5, offset: 30 },
  { end: { s: 0, n: 1, c: 0 }, name: 'nuttiness', along: 0.85, offset: 18 },
  { end: { s: 0, n: 0, c: 1 }, name: 'citrus brightness', along: 1, offset: 44 },
];
const ORIGIN: Taste = { s: 0, n: 0, c: 0 };
const FLOOR_CENTER: Taste = { s: 0.5, n: 0.5, c: 0 };

// layer holds the lines and heads; names go to labels, which must be drawn above
// the sprites. citrus adds the third axis.
export function axisSet(layer: Element, names: Element, citrus: boolean): Axis[] {
  return AXES.slice(0, citrus ? 3 : 2).map((spec, i) => ({
    arrow: makeArrow(
      layer,
      i === 2 ? 'ew-axis ew-axis--citrus' : 'ew-axis',
      i === 2 ? 'ew-head ew-head--amber' : 'ew-head ew-head--axis'
    ),
    label: svgText(names, i === 2 ? 'ew-tag-amber' : '', spec.name),
  }));
}

// Draws the axes through `at` and claims their lines, heads and the names of the
// first two in the label book, before any drink name does, so names slide off the
// axes. states runs parallel to axes; a label state of 0 leaves the name to the caller.
export function drawAxes(
  axes: readonly Axis[],
  at: (taste: Taste) => Point,
  states: readonly AxisState[],
  book: Labeler,
  u: number
): void {
  const origin = at(ORIGIN);
  const center = at(FLOOR_CENTER);
  axes.forEach((axis, i) => {
    const spec = AXES.at(i);
    const state = states.at(i);
    if (!spec || !state) return;
    const end = at(spec.end);
    const tip = {
      x: origin.x + (end.x - origin.x) * state.grow,
      y: origin.y + (end.y - origin.y) * state.grow,
    };
    if (drawArrow(axis.arrow, origin, state.grow < 0.02 ? origin : tip, u)) {
      claimArrow(book, origin, tip, u);
    }
    const visible = state.label > 0;
    axis.label.setAttribute('display', visible ? 'inline' : 'none');
    if (!visible) return;
    axis.label.setAttribute('opacity', String(Math.round(state.label * 100) / 100));
    const mx = origin.x + (end.x - origin.x) * spec.along;
    const my = origin.y + (end.y - origin.y) * spec.along;
    const length = Math.hypot(end.x - origin.x, end.y - origin.y) || 1;
    let nx = -(end.y - origin.y) / length;
    let ny = (end.x - origin.x) / length;
    if (nx * (mx - center.x) + ny * (my - center.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    // Text reads left to right: the angle stays within a quarter turn either side.
    let angle = (Math.atan2(end.y - origin.y, end.x - origin.x) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    const off = (spec.offset + (state.away ?? 0)) * u;
    book.put(axis.label, mx + nx * off, my + ny * off, { angle });
  });
}

// ───── Drinks standing on the page ─────────────────────────────────────────

// A drink at its dot (x, y). key names it in the spread.
export type Stand = { key: string; sprite: Sprite; x: number; y: number };

export type StandsOptions = {
  stands: readonly Stand[];
  spread: Spread;
  eased: SpreadEase;
  book: Labeler;
  // Sprite height in user units, and user units per CSS px.
  h: number;
  u: number;
  // The shared tag for a group, or '' for none.
  tagFor: (keys: readonly string[], tight: boolean) => string;
  // One tag per group, in group order. Unused ones are hidden.
  tags: readonly SVGTextElement[];
  // The drinks that move, named in this order before every other so the still
  // ones settle around them, and what they claim once named (a ring, say).
  lead?: { keys: readonly string[]; claims: readonly Box[] };
  // A name that stands in its row anchored start at x, or centered under its
  // sprite when that starts farther right: on a phone the first coffee stands
  // against the nuttiness axis, which cuts a centered name. With only, it
  // stands nowhere else; without, that place is tried before every other.
  pin?: { key: string; x: number; only: boolean };
  // Runs once the sprites are claimed and before any name: for a label that
  // must clear the cups and that the names must clear in turn.
  first?: () => void;
  // More places a drink's name may try, after the usual ones, given its stand
  // with the sprite's spread position.
  more?: (stand: Stand) => readonly (Point & { anchor: Anchor })[];
};

// Stands every drink on its dot, spread where drinks share a spot, and writes
// the names: a lone drink's name sits directly under its own sprite, or beside
// it, and the names of a shared spot stack in rows beneath it, then its tag.
// Returns the boxes of the names it placed.
export function placeStands({
  stands,
  spread,
  eased,
  book,
  h,
  u,
  tagFor,
  tags,
  lead,
  pin,
  first,
  more,
}: StandsOptions): Box[] {
  const grouped = new Set(spread.groups.flatMap((group) => group.keys));
  // A shared spot's names stack one row each, so a name may drop that many rows.
  const size = (key: string): number =>
    spread.groups.find((g) => g.keys.includes(key))?.keys.length ?? 1;
  const placed = stands.map((stand) => {
    const dx = eased.offset(stand.key);
    stand.sprite.place({ x: stand.x, y: stand.y, h, dx });
    return { ...stand, x: stand.x + dx };
  });
  placed.sort((a, b) => a.x - b.x);
  // The name row: 18 CSS px under the dot, so a name at dot level (4 px under it)
  // and the name in the row below keep a unit of air between them in the book.
  const row = 18 * u;
  const texts: Box[] = [];
  // The painted sprites are claimed before any name (a cup fills about four
  // fifths of its square's width and the lower three fifths of its height). A
  // name stands below its own dot, so its own sprite never blocks it, and it
  // slides off a neighbor's before it covers it.
  for (const stand of placed) {
    book.avoid(
      {
        x0: stand.x - 0.4 * h,
        x1: stand.x + 0.4 * h,
        y0: stand.y - h * (1 - stand.sprite.air),
        y1: stand.y,
      },
      SPRITE_WEIGHT
    );
  }
  first?.();
  // A name stands under its dot, or just beside it (a line may run right down
  // through the dot), or beside its sprite at dot level, just outside the painted
  // cup, or a row lower, and never farther than that: a name far from its dot
  // reads as someone else's. When nothing is clear it takes the place that costs
  // least. Its box is claimed with air either side, so two names never abut and
  // read as one.
  const name = (stand: (typeof placed)[number]): void => {
    const shared = grouped.has(stand.key);
    const beside = 6 * u;
    const edge = 0.4 * h + beside;
    const y = stand.y + row;
    const tries: (Point & { anchor?: Anchor })[] = [
      { x: stand.x + beside, y, anchor: 'start' },
      { x: stand.x - beside, y, anchor: 'end' },
      { x: stand.x - edge, y: stand.y + 4 * u, anchor: 'end' },
      { x: stand.x + edge, y: stand.y + 4 * u, anchor: 'start' },
      ...(more?.(stand) ?? []),
    ];
    const options: PutOptions = {
      anchor: ['middle', 'start', 'end'],
      stack: 1,
      rows: shared ? size(stand.key) : 3,
      tries,
    };
    const name = stand.sprite.name;
    let box: Box;
    if (pin && pin.key === stand.key) {
      const x = Math.max(stand.x - name.getComputedTextLength() / 2, pin.x);
      box = pin.only
        ? book.put(name, x, y, { anchor: 'start' })
        : book.put(name, x, y, {
            ...options,
            anchor: ['start', 'middle', 'end'],
            tries: [{ x: stand.x, y }, ...tries],
          });
    } else {
      box = book.put(name, stand.x, y, options);
    }
    claimAir(book, box, beside, 0);
    texts.push(box);
  };
  const leading = lead?.keys ?? [];
  for (const key of leading) {
    const stand = placed.find((s) => s.key === key);
    if (stand) name(stand);
  }
  for (const claim of lead?.claims ?? []) book.avoid(claim);
  // Lone names first, then the names of shared spots, which give way.
  for (const shared of [false, true]) {
    for (const stand of placed) {
      if (!leading.includes(stand.key) && grouped.has(stand.key) === shared) name(stand);
    }
  }
  tags.forEach((tag, i) => {
    const group = spread.groups.at(i);
    const text = group ? tagFor(group.keys, group.tight) : '';
    tag.textContent = text;
    tag.setAttribute('display', text === '' ? 'none' : 'inline');
    if (group && text !== '') {
      // Beside the cups, level with the middle of the sprites, is the place nearest
      // them; each member of a group stands 18 units either way of the group's center.
      const reach = (group.keys.length - 1) * 18 + h / 2 + 4 * u;
      book.put(tag, group.x, group.y + row, {
        stack: 1,
        anchor: ['middle', 'end', 'start'],
        tries: [{ x: group.x + reach, y: group.y - h / 2 + 4 * u, anchor: 'start' }],
      });
    }
  });
  return texts;
}
