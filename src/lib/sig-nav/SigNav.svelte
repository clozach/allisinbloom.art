<script context="module">
  // ⌃ tap / ⌃h counts for the test hook — module-level so a ⌃h that navigates
  // (and remounts the signature) can still be inspected afterwards.
  const counters = { ctrlTap: 0, ctrlH: 0 };
</script>

<script>
  // SigNav.svelte — the orchestrator. Mounted as the last child of ByLine's
  // `.author`, it owns the ⌃ badge and the garden (a calla lily that becomes
  // the "home" link). ByLine decides WHAT happened (hover / click / focus /
  // tap) and calls `hover()` / `activate()`; this component decides what the
  // state machine does about it and schedules every phase with timers from
  // TIMINGS — never animationend, which does not fire at 0 s or under reduce.
  import { onMount, tick } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { CALLA } from './art/calla.js';
  import { HOVERFLY } from './art/hoverfly.js';
  import Badge from './Badge.svelte';
  import Flower from './Flower.svelte';
  import Fly from './Fly.svelte';
  import Word from './Word.svelte';
  import { sigNav, startBloom, queueClick, bloomDone, startLabel, labelDone, rePlace, snapshot } from './store.js';
  import { TIMINGS, scaled, testHook, randomSeed, bloomLength, labelLength } from './timing.js';
  import { isDesktop, isMac, subscribeDesktop, subscribeReducedMotion } from './platform.js';
  import { installKeys } from './keys.js';
  import { plan, toLocal } from './garden.js';
  import { docRect } from './measure.js';

  /**
   * @typedef {import('./garden.js').Placement} Placement
   * @typedef {{ x: number, y: number }} Pt
   * @typedef {{x:number,y:number,w:number,h:number}} Rect
   * @typedef {{ rect: Rect, origin: Pt, landing: Pt, hang: Pt, avoid: Rect, bounds: {minX:number,maxX:number}, scale: number }} Local
   */

  /** the `.author` line the garden hangs from @type {HTMLElement | null} */
  export let authorEl = null;
  /** the signature image — the stem anchor @type {HTMLElement | null} */
  export let anchorEl = null;

  const WORD = 'home';
  const [, , VBW, VBH] = CALLA.viewBox.split(/\s+/).map(Number);

  $: routes = $page.data.routes || ['opening-in-sight'];
  $: homeHref = `/poems/${routes[0]}`;

  let mac = false;
  let desktop = false;
  let reduced = false;
  /** @type {ReturnType<typeof testHook>} */ let hook = null;
  let seed = 0;
  let speed = 1;
  let progress = 0; // frames visible
  let flying = false;
  let settled = false; // final pose, no entrance animation (remount / skip)
  let badgeOn = false;
  let engaged = false; // word hovered/focused
  let tabVisible = true;
  let onScreen = true;
  /** @type {Local | null} */ let local = null; // in author px
  /** @type {Record<string, any> | null} */ let diag = null;
  let focusWordOnLand = false;
  let pending = false; // a remount waiting for ByLine's bind:this elements
  /** @type {HTMLElement | null} */ let badgeEl = null;
  /** @type {HTMLElement | null} */ let gardenEl = null;
  /** @type {Word | null} */ let word = null;
  /** @type {ReturnType<typeof setTimeout>[]} */ let timers = [];

  $: state = $sigNav;
  $: shown = state.kind !== 'idle';
  $: labelled = state.kind === 'labeling' || state.kind === 'labeled';
  $: macDesktop = mac && desktop;
  // entrance animations (growth, fly-in, letter drop) are skipped on a remount;
  // the hint's fade is a live control and only goes still under reduce / speed 0
  $: instant = settled || reduced || speed === 0;
  $: still = reduced || speed === 0;
  $: sway = reduced || speed === 0 || !shown ? 'off' : engaged || !tabVisible || !onScreen ? 'paused' : 'on';
  $: vars = cssVars(speed, reduced);
  // arriving on a new poem with the garden already up: re-anchor once the
  // author line and signature elements have been bound (after onMount)
  $: if (pending && authorEl && anchorEl) {
    pending = false;
    replace().then((p) => p && rePlace(p));
  }

  /** a duration at the current run's speed @param {number} ms */
  const T = (ms) => scaled(ms, speed);
  /** every CSS duration the garden animates with, at speed `spd` @param {number} spd @param {boolean} reduce */
  function cssVars(spd, reduce) {
    /** @param {number} ms */
    const t = (ms) => `${scaled(ms, spd)}ms`;
    // the last letter lands as the fly does
    const letterDelay = Math.max(0, TIMINGS.flyIn - ((WORD.length - 1) * TIMINGS.letterStagger + TIMINGS.letterDrop));
    return [
      `--frame-fade:${t(TIMINGS.frameFade)}`,
      `--fly-in:${t(TIMINGS.flyIn)}`,
      `--letter-drop:${t(TIMINGS.letterDrop)}`,
      `--letter-stagger:${t(TIMINGS.letterStagger)}`,
      `--letter-delay:${t(letterDelay)}`,
      `--hint-fade:${reduce ? 0 : TIMINGS.hintFade}ms`,
      `--sway-period:${TIMINGS.swayPeriod}ms`,
      `--badge-fade:${t(TIMINGS.badgeFade)}`
    ].join(';');
  }

  /** @param {number} ms @param {() => void} fn */
  const after = (ms, fn) => (ms <= 0 ? fn() : timers.push(setTimeout(fn, ms)));
  const cancelTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  /** @param {number} dflt */
  const hookSpeed = (dflt) => hook?.speed ?? dflt;

  /** Re-run placement for this page and convert it to author-relative px. */
  async function replace() {
    await tick(); // the badge must be in the DOM to count as an obstacle
    // measure against the real metrics: under `display=swap` the poem reflows
    // when the web fonts land, and a box placed against the fallback serif
    // can end up on a line
    if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
    if (!authorEl || !anchorEl) return null;
    const out = plan({ authorEl, anchorEl, badgeEl: macDesktop ? badgeEl : null, seed });
    diag = out.diag;
    const r = out.placement.rect;
    const rect = { ...toLocal(r, authorEl), w: r.w, h: r.h };
    const pageLeft = toLocal({ x: 0, y: 0 }, authorEl).x; // page x=0 in author px
    // the signature button (padded on coarse pointers) paints above the
    // garden, so the word's strip must never land on it
    const btn = docRect(anchorEl.closest('button') || anchorEl);
    local = {
      avoid: { ...toLocal(btn, authorEl), w: btn.w, h: btn.h },
      rect,
      origin: toLocal(out.placement.origin, authorEl),
      landing: { x: rect.x + (CALLA.landing.x / VBW) * rect.w, y: rect.y + (CALLA.landing.y / VBH) * rect.h },
      hang: { x: rect.x + (CALLA.base.x / VBW) * rect.w, y: rect.y + rect.h * 0.6 },
      bounds: { minX: pageLeft + 64, maxX: pageLeft + out.diag.pageWidth - 8 },
      scale: rect.w / VBW
    };
    return out.placement;
  }

  /** Hover phase: place, then grow frame by frame. Resolves once growth is scheduled. @param {number} spd */
  async function bloom(spd) {
    if (snapshot().kind !== 'idle') return;
    speed = reduced ? 0 : spd; // reduced motion behaves as speed 0
    settled = false;
    badgeOn = macDesktop;
    const p = await replace();
    if (!p || snapshot().kind !== 'idle') return;
    startBloom(p);
    for (let k = 0; k < TIMINGS.frames; k++) {
      after(T(TIMINGS.bloomStartDelay + k * TIMINGS.frameBeat), () => (progress = k + 1));
    }
    after(T(bloomLength()), () => {
      const s = snapshot();
      const queued = s.kind === 'blossoming' && s.clickQueued;
      bloomDone();
      if (queued) label();
    });
  }

  /** Click phase: the fly comes in and the word drops. */
  function label() {
    if (snapshot().kind !== 'bloomed') return;
    startLabel();
    flying = true;
    after(T(TIMINGS.flyIn), () => (flying = false));
    after(T(labelLength(TIMINGS, WORD.length)), () => {
      labelDone();
      landed();
    });
  }

  /** The word has landed after a keyboard activation: move focus to it —
   * unless the reader has already Tabbed on elsewhere meanwhile. */
  function landed() {
    if (!focusWordOnLand) return;
    focusWordOnLand = false;
    const a = document.activeElement;
    if (a && a !== document.body && !authorEl?.contains(a)) return;
    tick().then(() => word?.focus());
  }

  /** Finish whatever is in flight, at once (reduced motion flipping on, remount). */
  function jumpToRest() {
    cancelTimers();
    flying = false;
    const s = snapshot();
    if (s.kind === 'blossoming') {
      progress = TIMINGS.frames;
      bloomDone();
      if (s.clickQueued) {
        startLabel();
        labelDone();
      }
    } else if (s.kind === 'labeling') labelDone();
    landed();
  }

  /** A second tap on a phone: skip to the end. */
  function finishNow() {
    settled = true;
    progress = TIMINGS.frames;
    jumpToRest();
    if (snapshot().kind === 'bloomed') {
      startLabel();
      labelDone();
      landed();
    }
  }

  /** Pointer entered the author line / signature button focused. */
  export function hover() {
    bloom(hookSpeed(1));
  }

  /** Signature (or badge) clicked, ⌃ tapped, Enter/Space pressed, phone tapped. */
  export async function activate({ touch = false, keyboard = false } = {}) {
    if (keyboard) focusWordOnLand = true;
    const s = snapshot();
    if (s.kind === 'idle') {
      await bloom(hookSpeed(touch ? TIMINGS.phoneSpeed : 1));
      if (snapshot().kind === 'blossoming') queueClick();
      if (snapshot().kind === 'bloomed') label(); // speed 0: growth already done
    } else if (s.kind === 'blossoming') touch ? finishNow() : queueClick();
    else if (s.kind === 'bloomed') label();
    else if (s.kind === 'labeling' && touch) finishNow();
    else if (s.kind === 'labeled' && keyboard) landed();
  }

  onMount(() => {
    hook = testHook();
    seed = hook?.seed ?? randomSeed();
    speed = hookSpeed(1);
    mac = isMac();
    desktop = isDesktop();
    const unsubs = [
      subscribeDesktop((v) => (desktop = v)),
      subscribeReducedMotion((v) => {
        reduced = v;
        if (v) jumpToRest();
      })
    ];
    if (mac && desktop) {
      unsubs.push(
        installKeys(window, {
          onCtrlTap: () => {
            counters.ctrlTap++;
            activate({ keyboard: true }); // focus lands on the word, scrolling it into view
          },
          onCtrlH: () => {
            counters.ctrlH++;
            goto(homeHref);
          }
        })
      );
    }
    // arriving on a new poem with the garden already up: final pose, re-anchored, no regrowth
    if (snapshot().kind !== 'idle') {
      settled = true;
      progress = TIMINGS.frames;
      jumpToRest();
      badgeOn = mac && desktop;
      pending = true;
    }
    // the pointer may already be resting on the author line when hydration
    // lands (the SSR DOM swallowed the pointerenter): level-trigger the hover
    if (desktop && authorEl?.matches(':hover')) hover();
    let width = window.innerWidth;
    const reanchor = () => {
      if (snapshot().kind !== 'idle') replace().then((p) => p && rePlace(p));
    };
    const onResize = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      reanchor();
    };
    // a late web-font swap reflows the poem under a placed flower
    document.fonts?.addEventListener?.('loadingdone', reanchor);
    const onVisibility = () => (tabVisible = !document.hidden);
    // sway only while the signature is near the viewport (the garden box itself is 0×0)
    const io = typeof IntersectionObserver !== 'undefined' && (anchorEl || gardenEl)
      ? new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { rootMargin: '200px' })
      : null;
    io?.observe(/** @type {Element} */ (anchorEl || gardenEl));
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    if (hook) {
      /** @type {any} */ (window).__sigNav = {
        get state() { return snapshot(); },
        get placement() { const s = snapshot(); return s.kind === 'idle' ? null : s.placement; },
        get diag() { return diag; },
        get local() { return local; },
        counters
      };
    }
    return () => {
      cancelTimers();
      unsubs.forEach((u) => u());
      io?.disconnect();
      window.removeEventListener('resize', onResize);
      document.fonts?.removeEventListener?.('loadingdone', reanchor);
      document.removeEventListener('visibilitychange', onVisibility);
      if (hook) delete (/** @type {any} */ (window)).__sigNav;
    };
  });
</script>

{#if macDesktop && (badgeOn || shown)}
  <Badge bind:el={badgeEl} fade={settled ? 0 : T(TIMINGS.badgeFade)} onActivate={() => activate()} />
{/if}

<div id="sig-nav-garden" class="garden" class:shown class:reduced class:instant bind:this={gardenEl} style={vars}>
  {#if shown && local}
    <div
      class="grove"
      class:sway={sway === 'on'}
      class:paused={sway === 'paused'}
      style="--pivot-x:{local.rect.x + local.rect.w / 2}px; --pivot-y:{local.rect.y + local.rect.h}px"
    >
      <Flower art={CALLA} rect={local.rect} origin={local.origin} {progress} {instant} sway="off" />
      {#if labelled}
        <Fly art={HOVERFLY} at={local.landing} scale={local.scale} {flying} {instant} />
        <Word
          bind:this={word}
          href={homeHref}
          text={WORD}
          label="{WORD} — first poem"
          at={local.hang}
          bounds={local.bounds}
          avoid={local.avoid}
          hint={macDesktop}
          {instant}
          {still}
          onEngage={(v) => (engaged = v)}
        />
      {/if}
    </div>
  {/if}
</div>

<style>
  .garden {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    overflow: visible;
    pointer-events: none;
    z-index: 1;
    color: var(--ink);
    --sig-paper: color-mix(in srgb, var(--bg) 92%, var(--accent) 8%);
  }
  .garden.reduced {
    opacity: 0;
    transition: opacity 350ms ease-out;
  }
  .garden.reduced.shown {
    opacity: 1;
  }
  .grove {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: var(--pivot-x) var(--pivot-y);
  }
  .grove.sway {
    animation: sway var(--sway-period, 6000ms) ease-in-out infinite alternate;
  }
  .grove.paused {
    animation: sway var(--sway-period, 6000ms) ease-in-out infinite alternate;
    animation-play-state: paused;
  }
  @keyframes sway {
    from {
      transform: rotate(-2.5deg);
    }
    to {
      transform: rotate(2.5deg);
    }
  }
</style>
