// Entry for the interactive figures in "From a line to an embedding". The blog
// page imports this module lazily, only when a [data-ew] figure exists, and
// calls mountEmbeddingWalkthrough() on every astro:page-load.
import type { MountPiece, PieceName } from './embedding-walkthrough/stage';
import { mount as coffeePlacement } from './embedding-walkthrough/coffee-placement';
import { mount as pageToRoom } from './embedding-walkthrough/page-to-room';
import { mount as rulerOrArrows } from './embedding-walkthrough/ruler-or-arrows';

const PIECES: Record<PieceName, MountPiece> = {
  'coffee-placement': coffeePlacement,
  'page-to-room': pageToRoom,
  'ruler-or-arrows': rulerOrArrows,
};

function isPieceName(value: string | undefined): value is PieceName {
  return value !== undefined && Object.hasOwn(PIECES, value);
}

// One scope per document. Every listener, observer, frame and timer a piece
// makes is tied to its signal, so a view transition leaves nothing behind.
let pageScope: AbortController | null = null;

document.addEventListener('astro:before-swap', () => {
  pageScope?.abort();
  pageScope = null;
});

export function mountEmbeddingWalkthrough(): void {
  if (!pageScope) pageScope = new AbortController();
  for (const figure of document.querySelectorAll('.workshop-prose figure[data-ew]')) {
    if (!(figure instanceof HTMLElement) || figure.hasAttribute('data-live')) continue;
    const name = figure.dataset.ew;
    const stage = figure.querySelector(':scope > .ew-stage');
    if (!isPieceName(name) || !(stage instanceof HTMLDivElement)) continue;
    PIECES[name](figure, stage, pageScope.signal);
    // Set only after the mount succeeds: a throw leaves the fallback plate showing.
    figure.setAttribute('data-live', '');
  }
}
