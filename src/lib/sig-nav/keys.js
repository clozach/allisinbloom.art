// keys.js — the Mac keyboard layer: a bare ⌃ TAP and ⌃h.
//
// A tap is detected on keyup: Control keydown (not a repeat) arms; any other
// keydown, any mouse/pointer button, a scroll-wheel turn (⌃+wheel is page
// zoom, and the macOS accessibility zoom gesture), or a window blur disarms; Control keyup
// while still armed fires `onCtrlTap`. That way every ⌃ chord — ⌃h included,
// ⌃-click, VoiceOver's pause key held with something else — is NOT a tap.
// ⌃h (ctrl alone, no ⌘/⌥/⇧) is claimed on keydown with preventDefault.
// Both are skipped while typing in a field, the same guard +layout.svelte
// uses for j/k. Install only when isMac() && isDesktop().

const TYPING = /^(INPUT|TEXTAREA|SELECT|AUDIO|VIDEO)$/;

/** @param {EventTarget | null} t */
const isTyping = (t) => {
  const el = /** @type {HTMLElement | null} */ (t);
  return !!el && (el.isContentEditable || TYPING.test(el.tagName || ''));
};

/**
 * @param {Window} win
 * @param {{ onCtrlTap: () => void, onCtrlH: () => void }} handlers
 * @returns {() => void} uninstall
 */
export function installKeys(win, { onCtrlTap, onCtrlH }) {
  let armed = false;
  const disarm = () => {
    armed = false;
  };

  /** @param {KeyboardEvent} e */
  const onKeyDown = (e) => {
    if (isTyping(e.target)) return disarm();
    if (e.key === 'Control') {
      if (!e.repeat) armed = true;
      return;
    }
    armed = false;
    if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      onCtrlH();
    }
  };

  /** @param {KeyboardEvent} e */
  const onKeyUp = (e) => {
    if (e.key !== 'Control') return;
    const fire = armed && !isTyping(e.target);
    armed = false;
    if (fire) onCtrlTap();
  };

  win.addEventListener('keydown', onKeyDown);
  win.addEventListener('keyup', onKeyUp);
  win.addEventListener('mousedown', disarm, true);
  win.addEventListener('pointerdown', disarm, true);
  win.addEventListener('wheel', disarm, { capture: true, passive: true });
  win.addEventListener('blur', disarm);
  return () => {
    win.removeEventListener('keydown', onKeyDown);
    win.removeEventListener('keyup', onKeyUp);
    win.removeEventListener('mousedown', disarm, true);
    win.removeEventListener('pointerdown', disarm, true);
    win.removeEventListener('wheel', disarm, { capture: true });
    win.removeEventListener('blur', disarm);
  };
}
