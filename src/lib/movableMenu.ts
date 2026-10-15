import './vendor/panel-core.js';

type Position = { left: number; top: number };
type Geometry = Position & {
  width: number;
  height: number;
  desiredWidth?: number;
  desiredHeight?: number;
};
type Movable = {
  place: (position?: Position | Geometry) => Position;
  destroy: () => void;
};
type PanelCore = {
  dismissPanelEvent: (event: KeyboardEvent | PointerEvent, options: { close: () => void; inside: boolean }) => boolean;
  makeMovable: (options: {
    element: HTMLElement;
    handle: HTMLElement;
    resize: { minWidth: number; minHeight: number };
    onMove: (geometry: Geometry) => void;
  }) => Movable;
};

// Keep the menu's requested size across remounts and smaller viewports.
// A menu remains content-sized until its first deliberate edge resize.
const geometryByMenu = new Map<string, Geometry>();
const core = (globalThis as typeof globalThis & { PanelCore: PanelCore }).PanelCore;

export function dismissMenuEvent(event: KeyboardEvent | PointerEvent, close: () => void, inside = false) {
  return core.dismissPanelEvent(event, { close, inside });
}

export function movableMenu(element: HTMLElement, key: string) {
  const handle = element.querySelector<HTMLElement>('[data-menu-move-handle]');
  if (!handle) throw new Error('A movable menu needs a title handle');
  const saved = geometryByMenu.get(key);
  const movable = core.makeMovable({
    element,
    handle,
    resize: { minWidth: 260, minHeight: 120 },
    onMove: (geometry) => geometryByMenu.set(key, geometry),
  });
  movable.place(saved?.desiredWidth ? saved : saved && { left: saved.left, top: saved.top });

  // Content disclosure changes the natural height before the first resize.
  // Afterwards, PanelCore preserves the requested size and scrolls the body.
  const observer = new ResizeObserver(() => movable.place());
  observer.observe(element);
  return {
    destroy() {
      observer.disconnect();
      movable.destroy();
    },
  };
}
