import './vendor/panel-core.js';

type Position = { left: number; top: number };
type Movable = {
  place: (position?: Position) => Position;
  destroy: () => void;
};
type PanelCore = {
  dismissPanelEvent: (event: KeyboardEvent | PointerEvent, options: { close: () => void; inside: boolean }) => boolean;
  makeMovable: (options: {
    element: HTMLElement;
    handle: HTMLElement;
    onMove: (position: Position) => void;
  }) => Movable;
};

// One location per menu for this page session, including Svelte remounts.
// PanelCore owns pointer/keyboard movement and viewport clamping.
const positions = new Map<string, Position>();
const core = (globalThis as typeof globalThis & { PanelCore: PanelCore }).PanelCore;

export function dismissMenuEvent(event: KeyboardEvent | PointerEvent, close: () => void, inside = false) {
  return core.dismissPanelEvent(event, { close, inside });
}

export function movableMenu(element: HTMLElement, key: string) {
  const handle = element.querySelector<HTMLElement>('[data-menu-move-handle]');
  if (!handle) throw new Error('A movable menu needs a title handle');
  const movable = core.makeMovable({
    element,
    handle,
    onMove: (position) => positions.set(key, position),
  });
  movable.place(positions.get(key));

  // Toggling shader controls can make the tuner taller. Refit the same
  // location so its title and controls remain reachable after disclosure.
  const observer = new ResizeObserver(() => movable.place());
  observer.observe(element);
  return {
    destroy() {
      observer.disconnect();
      movable.destroy();
    },
  };
}
