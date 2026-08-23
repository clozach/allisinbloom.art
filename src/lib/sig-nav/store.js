// store.js — the signature nav's state, a tagged union in a module-level
// writable so it survives client-side poem changes (every prev/next move
// remounts the signature) and dies on a real reload.
//
//   idle → blossoming → bloomed → labeling → labeled
//
// Only the exported transitions can move it; each is a no-op when the
// current kind does not allow it, so a stray click or a second ⌃ tap can
// never corrupt the chain. `placement` is the chosen flower spot in document
// coordinates for the CURRENT page — a new poem re-runs placement and swaps
// it in with `rePlace` without regrowing anything.

import { writable, get } from 'svelte/store';

/**
 * @typedef {{ id: string, rect: {x:number,y:number,w:number,h:number}, origin: {x:number,y:number}, strategy: string, fallback?: boolean }} Placement
 * @typedef {{ kind: 'idle' }
 *   | { kind: 'blossoming', placement: Placement, clickQueued: boolean }
 *   | { kind: 'bloomed', placement: Placement }
 *   | { kind: 'labeling', placement: Placement }
 *   | { kind: 'labeled', placement: Placement }} SigNavState
 */

/** @type {import('svelte/store').Writable<SigNavState>} */
export const sigNav = writable({ kind: 'idle' });

/** @param {(s: SigNavState) => SigNavState | null} step */
const transition = (step) =>
  sigNav.update((s) => {
    const next = step(s);
    return next === null ? s : next;
  });

/** idle → blossoming. @param {Placement} placement */
export const startBloom = (placement) =>
  transition((s) => (s.kind === 'idle' ? { kind: 'blossoming', placement, clickQueued: false } : null));

/** A click during blossoming: the creature arrives the moment growth finishes. */
export const queueClick = () =>
  transition((s) => (s.kind === 'blossoming' ? { ...s, clickQueued: true } : null));

/** blossoming → bloomed. */
export const bloomDone = () =>
  transition((s) => (s.kind === 'blossoming' ? { kind: 'bloomed', placement: s.placement } : null));

/** bloomed → labeling. */
export const startLabel = () =>
  transition((s) => (s.kind === 'bloomed' ? { kind: 'labeling', placement: s.placement } : null));

/** labeling → labeled. */
export const labelDone = () =>
  transition((s) => (s.kind === 'labeling' ? { kind: 'labeled', placement: s.placement } : null));

/** A new page: keep the kind, swap the spot. No-op while idle. @param {Placement} placement */
export const rePlace = (placement) =>
  transition((s) => (s.kind === 'idle' ? null : { ...s, placement }));

/** Current snapshot (for the orchestrator's decisions and the test hook). */
export const snapshot = () => get(sigNav);
