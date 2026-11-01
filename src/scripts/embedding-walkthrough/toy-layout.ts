// Layout for piece 4's cards, shared by the live piece and the training script,
// which fits the cloud to each layout offline (fitToy) and ships the result in
// the data file. Pure and DOM-free with erasable syntax only, so Node can import
// it. The toy's addresses are fitted to the stage with one uniform scale (the
// distances stay honest), and the cards, which are wider than the gaps between
// the closest addresses, take free spots in a ring around their dots.

import type { Layout, ToyFit, ToyPoint, ToyTrack } from './model';

// The tallest stage. A stage bound by its width (the compact one) is cut to the
// height its cloud needs; the fit in the data file says how tall each one is.
export const STAGE_HEIGHT = 520;

// CSS px, scaled by u (user units per CSS px) so cards and text stay 12px. A
// monospace font advances 0.6 em per character, which is what the width counts.
export const TEXT_PX = 12;
const ADVANCE_PX = TEXT_PX * 0.6;
const PAD_PX = 8;
export const CARD_PX = 24;
const GAP_PX = 4;
export const DOT_RADIUS = 6;
// The longest line from a card to its dot that the ring around a dot allows, in
// user units. Past it a card is in a far row and the cluster no longer reads.
const LEADER_CAP = 40;
// User units every dot and every card keeps inside the frame, on every side.
const INSET = 24;

// The scale at which the offline fit measures the cards. A stage wider than this
// shows them smaller in user units and a narrower one larger; the fit leaves the
// room for the larger.
export const REFERENCE_U: Record<Layout, number> = { wide: 1.2, compact: 1.32 };

export const cardWidth = (label: string, u: number): number =>
  label.length * ADVANCE_PX * u + 2 * PAD_PX * u;

export function cardOptions(width: number, height: number, u: number): DeclutterOptions {
  return {
    width,
    height,
    h: CARD_PX * u,
    gap: DOT_RADIUS + GAP_PX * u,
    space: GAP_PX * u,
    dot: DOT_RADIUS,
    edge: INSET,
    reach: LEADER_CAP,
  };
}

export function cardFrame(width: number, height: number, u: number): ToyFrame {
  const o = cardOptions(width, height, u);
  return {
    width,
    height,
    // Cards turn inward at the edges, so an edge dot needs only the inset. A dot
    // at the top keeps room for a card above it.
    marginX: INSET,
    marginTop: o.h + o.gap + o.edge,
    marginBottom: INSET,
  };
}

export type ToyBounds = { minX: number; maxX: number; minY: number; maxY: number };

export type ToyFrame = {
  width: number;
  height: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
};

// One scale for both axes, the cloud centered inside the margins. The bounds
// are fixed over the whole run (unseen cards included), so nothing rescales.
export function fitToy(bounds: ToyBounds, frame: ToyFrame): ToyFit {
  const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const roomX = frame.width - 2 * frame.marginX;
  const roomY = frame.height - frame.marginTop - frame.marginBottom;
  const scale = Math.min(roomX / spanX, roomY / spanY);
  return {
    scale,
    ox: frame.marginX + (roomX - spanX * scale) / 2 - bounds.minX * scale,
    oy: frame.marginTop + (roomY - spanY * scale) / 2 - bounds.minY * scale,
  };
}

export function viewPoint(view: ToyFit, p: ToyPoint): ToyPoint {
  return { x: view.ox + p.x * view.scale, y: view.oy + p.y * view.scale };
}

// A dot on the stage and the width of its card.
export type Slot = { id: string; x: number; y: number; w: number };

// Where a card goes: its left edge and its bottom edge.
export type Place = { left: number; bottom: number };

export type DeclutterOptions = {
  width: number;
  height: number;
  // Card height, the gap between a card and its dot, and the gap between cards.
  h: number;
  gap: number;
  space: number;
  // The radius of a dot. No card covers any dot, its own included.
  dot: number;
  // Keeps a card this far inside the edges.
  edge: number;
  // The longest leader a spot in the ring around a dot may have.
  reach: number;
};

export type Box = { left: number; bottom: number; w: number; h: number };
// cost is the length of the leader. rank orders the spots: the cost, plus a penalty for
// a spot that would mislead the eye.
type Candidate = { box: Box; cost: number; rank: number };

// A line (an example's pair line, say) that cards keep off when they can.
export type Segment = readonly [ToyPoint, ToyPoint];

// What a spot nearer another card's dot than its own, or across a line, costs in
// rank: more than the longest leader, so such a spot goes last in its ring.
const MISLEADING = 100;

// Whether the segment passes through the box (Liang and Barsky's clipping test).
export function cuts([a, b]: Segment, box: Box): boolean {
  const edges = [
    [a.x - b.x, a.x - box.left],
    [b.x - a.x, box.left + box.w - a.x],
    [a.y - b.y, a.y - (box.bottom - box.h)],
    [b.y - a.y, box.bottom - a.y],
  ];
  let near = 0;
  let far = 1;
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
    } else if (p < 0) {
      near = Math.max(near, q / p);
    } else {
      far = Math.min(far, q / p);
    }
  }
  return near <= far;
}

const touches = (a: Box, b: Box, space: number): boolean =>
  a.left < b.left + b.w + space &&
  b.left < a.left + a.w + space &&
  a.bottom - a.h < b.bottom + space &&
  b.bottom - b.h < a.bottom + space;

// A card takes a spot around its dot: above, below, right or left, slid along
// that side by these fractions of its length (at the far end a slide reads as a
// diagonal), at these distances from the dot. The distances run from the gap to
// the reach, the ring, and then outward in whole card heights.
const SLIDES = [0, 0.25, 0.5, 1];
const RING_STEPS = [0, 0.5, 1];
const MAX_LIFT = 8;
// How many spots the search for a placement of every card inside its ring may try
// before it gives up and lets a card go farther out.
const SEARCH_LIMIT = 1000;

const lengthTo = (box: Box, at: ToyPoint): number => {
  const l = leaderFor(box, box.w, box.h, at);
  return Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
};

// Every card takes the spot with the shortest leader that no other card or dot
// is in the way of, and no card is ever allowed over a dot, its own included.
// The rings around the dots (leaders no longer than the reach) are searched for a
// placement of all the cards at once, so a crowded cluster spreads out instead of
// pushing its last card far away. If no such placement exists, the search allows
// one card out of its ring, then two, and so on; a card left out takes its
// nearest free spot, however far, once the others are settled. The choice is
// deterministic, so the static plate and the live piece agree. A card with no
// free spot at all (a stage far too small) stays above its dot.
export function declutter(
  slots: readonly Slot[],
  o: DeclutterOptions,
  lines: readonly Segment[] = []
): Map<string, Place> {
  const dots = slots.map((slot): Box => ({
    left: slot.x - o.dot,
    bottom: slot.y + o.dot,
    w: 2 * o.dot,
    h: 2 * o.dot,
  }));
  const order = [...slots].sort((a, b) => b.y - a.y || (a.id < b.id ? -1 : 1));
  const row = o.h + o.space;
  const distances = [
    ...RING_STEPS.map((share) => o.gap + share * (o.reach - o.gap)),
    ...Array.from({ length: MAX_LIFT }, (_, k) => o.reach + (k + 1) * row),
  ];
  // Every spot a card could take, best rank first (ties keep the order listed:
  // above, below, right, left). A spot over any dot is not a spot, nor one
  // nearer a dot than gap.
  const spotsOf = (slot: Slot, gap: number): Candidate[] => {
    const w = slot.w;
    const out: Candidate[] = [];
    for (const d of distances) {
      for (const slide of SLIDES) {
        for (const lean of slide === 0 ? [0] : [-1, 1]) {
          const along = lean * slide;
          const middle = slot.y + o.h / 2 + along * o.h;
          const across = slot.x - w / 2 + along * w;
          for (const spot of [
            { left: across, bottom: slot.y - d },
            { left: across, bottom: slot.y + d + o.h },
            { left: slot.x + d, bottom: middle },
            { left: slot.x - d - w, bottom: middle },
          ]) {
            const left = Math.max(o.edge, Math.min(o.width - o.edge - w, spot.left));
            const box = { left, bottom: spot.bottom, w, h: o.h };
            const cost = lengthTo(box, slot);
            const inside = box.bottom - o.h >= o.edge && box.bottom <= o.height - o.edge;
            if (cost > o.dot && inside && dots.every((dot) => !touches(box, dot, gap))) {
              const astray = slots.some((other) => other !== slot && lengthTo(box, other) < cost);
              const crossed = lines.some((line) => cuts(line, box));
              out.push({ box, cost, rank: cost + (astray || crossed ? MISLEADING : 0) });
            }
          }
        }
      }
    }
    return out.sort((a, b) => a.rank - b.rank);
  };
  // The air between a card and its neighbors, cards and dots: the usual space,
  // and none before any card is left out, since cards that touch read better
  // than a leader across the stage. The lists of spots are made per gap.
  let gap = o.space;
  let lists: Candidate[][] = [];
  const clear = (box: Box, placed: readonly Box[]): boolean =>
    placed.every((other) => !touches(box, other, gap));

  // Depth first through the rings, fail first: the card with the fewest spots
  // left goes next, and each card placed strikes the spots it blocks from the
  // others. A branch is dropped as soon as more cards than may be left out have
  // no spot. A card left out keeps a null.
  const chosen: (Box | null)[] = order.map(() => null);
  let tries = 0;
  const settle = (open: Candidate[][], pending: number[], leave: number): boolean => {
    if (pending.length === 0) return true;
    tries += 1;
    const next = pending.reduce((best, i) => (open[i].length < open[best].length ? i : best));
    const rest = pending.filter((i) => i !== next);
    for (const { box } of tries < SEARCH_LIMIT ? open[next] : []) {
      const after = open.map((list, i) =>
        rest.includes(i) ? list.filter((spot) => !touches(spot.box, box, gap)) : list
      );
      if (rest.filter((i) => after[i].length === 0).length > leave) continue;
      chosen[next] = box;
      if (settle(after, rest, leave)) return true;
    }
    chosen[next] = null;
    return leave > 0 && settle(open, rest, leave - 1);
  };
  // A card whose ring holds no spot at all (other dots fill it) goes first, to the
  // nearest spot it has, and the rest settle around it: left for last, it would take
  // whatever far spot the others left it. Every card in its ring with the usual
  // air is tried before any card is left out with none, and so on.
  const attempt = (leave: number, air: number): boolean => {
    gap = air;
    lists = order.map((slot) => spotsOf(slot, gap));
    chosen.fill(null);
    const inRing = lists.map((list) => list.filter((spot) => spot.cost <= o.reach));
    const early = order.flatMap((_, index) => {
      const best = lists.at(index)?.at(0);
      if (inRing.at(index)?.length !== 0 || !best) return [];
      chosen[index] = best.box;
      return [best.box];
    });
    const rings = inRing.map((list) => list.filter((spot) => clear(spot.box, early)));
    const everyone = order.flatMap((_, index) => (chosen[index] ? [] : [index]));
    tries = 0;
    return settle(rings, everyone, leave);
  };
  [...order.keys(), order.length].some((leave) => [o.space, 0].some((air) => attempt(leave, air)));

  const seated: Box[] = chosen.flatMap((box) => (box ? [box] : []));
  const out = new Map<string, Place>();
  order.forEach((slot, index) => {
    const box =
      chosen.at(index) ?? lists.at(index)?.find((spot) => clear(spot.box, seated))?.box ?? null;
    const centered = Math.max(o.edge, Math.min(o.width - o.edge - slot.w, slot.x - slot.w / 2));
    const seat = box ?? { left: centered, bottom: slot.y - o.gap, w: slot.w, h: o.h };
    if (chosen.at(index) === null) seated.push(seat);
    out.set(slot.id, { left: seat.left, bottom: seat.bottom });
  });
  return out;
}

// Every card's address after n examples.
export function positionsAt(tracks: readonly ToyTrack[], n: number): Map<string, ToyPoint> {
  const out = new Map<string, ToyPoint>();
  for (const track of tracks) {
    const x = track.xs.at(n);
    const y = track.ys.at(n);
    if (x !== undefined && y !== undefined) out.set(track.id, { x, y });
  }
  return out;
}

export type Leader = { x1: number; y1: number; x2: number; y2: number };

// The thin line from a card to its dot, from the card's nearest point. It is
// always drawn, so a card beside a dot never reads as belonging to another one.
export function leaderFor(place: Place, w: number, h: number, at: ToyPoint): Leader {
  return {
    x1: Math.max(place.left, Math.min(place.left + w, at.x)),
    y1: Math.max(place.bottom - h, Math.min(place.bottom, at.y)),
    x2: at.x,
    y2: at.y,
  };
}

// The card whose address is nearest a point (the first, on a tie), leaving out
// `except`. The same rule serves the page's readout and the story assertions.
export function nearestTo(
  at: ToyPoint,
  positions: ReadonlyMap<string, ToyPoint>,
  except?: string
): string | undefined {
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const [id, p] of positions) {
    if (id === except) continue;
    const d = (p.x - at.x) ** 2 + (p.y - at.y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = id;
    }
  }
  return best;
}

export function slotsFor(
  view: ToyFit,
  positions: ReadonlyMap<string, ToyPoint>,
  widths: ReadonlyMap<string, number>
): Slot[] {
  const out: Slot[] = [];
  for (const [id, p] of positions) {
    const w = widths.get(id);
    if (w === undefined) continue;
    const at = viewPoint(view, p);
    out.push({ id, x: at.x, y: at.y, w });
  }
  return out;
}
