/* VENDORED COPY -- do not edit here.
 * Canonical: /Users/c/amaanah/projects/pixel-reveal/src/component/panel-core.js
 * sha256: 57052421e6effecbfb2a6c11680e938a60d8ca57dade178e3d08e2ff570660ac
 * synced: 2026-10-15
 * Edit the canonical file, then run:
 *   node projects/pixel-reveal/src/component/vendor-sync.mjs
 */
/* panel-core.js -- the vault's canonical live-control PANEL SHELL. ONE
 * implementation of the surface that holds live controls; consumers vendor or
 * import it, never hand-roll a second one (vault AGENTS.md sec. component seams
 * reify by DRY refactoring, never a second hand-roll).
 *
 * CANONICAL SOURCE: /Users/c/amaanah/projects/pixel-reveal/src/component/panel-core.js
 * A vendored COPY must carry a header naming that path (copies, never
 * symlinks -- vault AGENTS.md sec. Obsidian plugin installs must be copies).
 * Sync copies with: node projects/pixel-reveal/src/component/vendor-sync.mjs
 *
 * SIBLING OF field-core.js. field-core owns ONE numeric control; panel-core
 * owns the SHELL that holds controls. A consumer may vendor both, either, or
 * neither. field-core's documented Escape policy ("no pending edit + Escape ->
 * do NOTHING and let it propagate, so the host's Escape ladder gets it") names
 * this file as that host.
 *
 * Lineage: allisinbloom.art BloomTuner.svelte (the shell half, and the ` summon
 * in BloomShader.svelte) + propsheet.js (build/toggle/skin/glass) + jit-panel.js
 * (Escape ladder, viewport clamp, focus cycle) -> this extraction.
 *
 * THE CONTRACT (vault AGENTS.md; .MAC-ONLY/AGENTS.md sec. Live controls persist,
 * sec. Keyboard focus order, sec. Clamp positioned overlays, sec. Contain focus in
 * plugin overlays, sec. User-visible strings are never truncated):
 *   - APPLYING NEVER DISMISSES. A row's own action never closes the panel.
 *     The only closers are: outside click, contained Escape and the summon
 *     toggle. A live control is a scrubber, not a
 *     shutter.
 *   - Escape is CONTAINED -- consumed at window capture with
 *     stopImmediatePropagation, so it cannot reach an editor, a vim mode, or a
 *     host popover's own handler beneath.
 *   - Focus is TRAPPED and CYCLIC. Tab from the last control returns to the
 *     first; Shift+Tab is the exact reverse. Initial focus lands on the
 *     dominant control -- the first interactive row. The title move handle
 *     comes LAST; ordinary panels need no dismiss button.
 *   - The panel is CLAMPED inside the viewport and can never widen the page.
 *     Its CSS width is min(320px, 100vw - 2*PAD), so the clamp arithmetic has
 *     no unsatisfiable case even at a 320px viewport.
 *   - Labels are never truncated. They wrap. Enforced in the skin AND with an
 *     inline style per label, so a consumer that drops the skin still obeys.
 *   - NO PLACEHOLDER ROWS. A row renders only if its control works end to end.
 *     The "all N values" disclosure row is data-driven -- it appears only when
 *     rows.length > paletteCount -- so a one-row panel simply never grows one.
 *   - FLOATING PALETTE IS OPT-IN. `mode: "floating-palette"` starts expanded,
 *     content-sized, at the right/25vh; `floating.initialState:"tab"` starts
 *     docked instead. A consumer may add `floating.stateStorageKey` to retain
 *     the settled tab/palette state and location in same-origin localStorage.
 *     Its header drags, meaningful viewport overflow docks it as a right-edge
 *     tab, and ordinary outside clicks do not minimize it. Its default 72ch
 *     measure sits in the middle of the recommended 45--90-character range;
 *     tokens.measure can tune it. Ordinary panels use makeMovable: drag the
 *     title, or focus it and press arrows (Shift moves ten pixels). Positions
 *     survive reopening, row refresh, disclosure and viewport changes during
 *     the page session; they do not write browser storage.
 *   - RELATED PANELS opt into the same interactionGroup string. Pointer
 *     events in a peer are inside the group; keyboard focus and Escape belong
 *     to the targeted panel. The shared summon remains reachable.
 *   - PRODUCT-SPECIFIC CONTENT uses `{kind:"custom", mount:function (el) {}}
 *     and appends real DOM. No HTML string seam and no product-specific kind.
 *
 * SUMMON. Desktop: the ` key, with BloomShader's guards (no meta/ctrl/alt, and
 * ignored whenever the event target is an editable one, so typing a backtick
 * stays a backtick). Touch: a long hold in a viewport corner, because a coarse
 * pointer has no ` key -- this is the touch entry that
 * projects/jit-affordances/AGENTS.md sec. Open questions parked as undecided.
 *
 * SCOPING: an OPEN shadow root. Prefixed classes would protect a host page from
 * the panel but do nothing to protect the panel from the host -- one unprefixed
 * `a {}` or `button {}` rule in a page's stylesheet repaints it. Shadow DOM is
 * bidirectional. Open, not closed: closed buys nothing and blocks debugging,
 * and Playwright pierces open roots by default.
 *   Three traps that fail SILENTLY if you get them wrong, all handled here:
 *     1. root.activeElement, NOT document.activeElement. From outside the root,
 *        document.activeElement retargets to the HOST, so a Tab-cycle index
 *        lookup always yields -1 and the trap collapses to a no-op.
 *     2. event.composedPath(), NOT host.contains(event.target). Retargeting
 *        makes event.target the host, so contains() returns false for clicks
 *        INSIDE the panel and the outside-click handler closes on every use.
 *     3. Inherited properties still cross the boundary (font, color,
 *        line-height, direction, text-align) -- all declared explicitly.
 *
 * ASCII ONLY, on purpose. The first consumer (the CourseLit dev rig) reaches
 * the page through CourseLit's Code Injection field, which the app decodes with
 * the `base-64` npm package: its encode() throws on any character outside
 * Latin1 and its decode() mojibakes UTF-8 bytes. panel-core.test.mjs asserts
 * this file is pure ASCII so the constraint cannot rot. Use \uXXXX escapes for
 * any glyph the UI needs.
 *
 * LOADING -- no build step, no npm deps, no imports, ES5 syntax:
 *   (a) browser IIFE/global:  <script src="panel-core.js"> then
 *                             window.PanelCore.createPanel(...)
 *   (b) CommonJS / node:      require() or eval-in-wrapper, read module.exports
 *   (c) ESM / Vite / TS:      node ESM gets it through CJS interop
 *                             (`import PanelCore from "./panel-core.js"`), and
 *                             a bundler that refuses CJS in src/ can
 *                             side-effect import it and read globalThis.PanelCore.
 *
 * CSS: shipped inline as SKIN and injected into the shadow root. No external
 * stylesheet, no host-token dependency -- see the SKIN comment for why the
 * palette is self-contained rather than inheriting CourseLit's theme vars.
 */
(function () {
  "use strict";

  var VERSION = "1.8.0";

  // Hold-gesture constants. Each is a platform number, not a taste:
  //   HOLD_MS 600   Android ViewConfiguration.getLongPressTimeout() is 500ms and
  //                 iOS's touch-and-hold callout is ~500ms. 600 sits just past
  //                 both, so ours reads as deliberate instead of racing them.
  //   CUE_AT_MS 200 past slop-settle, so the ring only appears once a hold is
  //                 plausible.
  //   SLOP_PX 10    platform touch slop (Android 8dp, WebKit ~10px). Matching it
  //                 means a hold that becomes a scroll cancels exactly when the
  //                 platform thinks it did.
  //   CORNER_PX 56  >= 44 (Apple HIG) and >= 48 (Material) minimum target, plus
  //                 margin for a thumb reaching a screen corner.
  var HOLD_MS = 600, CUE_AT_MS = 200, SLOP_PX = 10, CORNER_PX = 56, PAD = 12;
  var FLOAT_OVERFLOW_PX = 8, TAB_RESTORE_PX = 48;
  var PALETTE_REVEAL_MS = 100, TAB_PEEK_MS = 900, TAB_RETRACT_MS = 480;
  var RESIZE_SEQ = 0;

  // ---------------------------------------------------------------- utils

  function isFn(v) { return typeof v === "function"; }
  function noop() {}

  function getGlobal() {
    if (typeof globalThis !== "undefined") return globalThis;
    if (typeof window !== "undefined") return window;
    if (typeof self !== "undefined") return self;
    return null;
  }

  // ------------------------------------------------------- pure helpers
  // Everything in this block is DOM-free and clock-injectable, which is what
  // makes the gesture and geometry testable without a device or a browser.

  /* <input> types that hold no text. Focusing one is not "typing", so a summon
     key must keep working while a checkbox or a range slider has focus. Ported
     verbatim from slydeshow.js, where the missing test made EVERY deck key dead
     after a single verify checkbox was clicked. */
  var NON_TEXT_INPUT = /^(checkbox|radio|button|submit|reset|image|file|range|color)$/;

  /* True when the event is aimed at something the user is typing into.
     composedPath()[0] first so it sees through a shadow boundary; the
     activeElement fallback covers synthetic events with no useful target. */
  function isEditingTarget(ev, doc) {
    var d = doc || (typeof document !== "undefined" ? document : null);
    var active = d ? d.activeElement : null;
    var el = (ev && ev.composedPath && ev.composedPath()[0]) || (ev && ev.target) || active;
    if (!el || el === (typeof window !== "undefined" ? window : null) || el === d) el = active;
    if (!el || !el.tagName) return false;
    var tag = String(el.tagName).toLowerCase();
    if (tag === "input") return !NON_TEXT_INPUT.test(String(el.type || "text").toLowerCase());
    if (tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  /* Keys whose browser DEFAULT action moves the page. While the panel is open
     that page is the surface underneath it, so the default has to be
     suppressed: a keystroke raised inside an overlay must never scroll what the
     overlay is covering. stopPropagation cannot do this -- it stops listeners,
     not default actions -- which is exactly how this leaked. Measured on the
     CourseLit rig 2026-08-24 with the panel open and its link focused: Space
     and PageDown scrolled the page beneath by 760px, End by 4963px, ArrowDown
     by 40px. */
  var SCROLL_KEYS = /^(?: |ArrowDown|ArrowUp|ArrowLeft|ArrowRight|PageDown|PageUp|End|Home)$/;

  /* ...but a control that consumes the key ITSELF must keep it, or suppressing
     the scroll would break the control. Space presses a button and toggles a
     checkbox; arrows and Home/End step a range. Text-entry targets are covered
     separately by isEditingTarget, which owns every key. */
  function ownsKeyNatively(el, key) {
    if (!el || !el.tagName) return false;
    var tag = String(el.tagName).toLowerCase();
    if (tag === "button" || tag === "summary") return key === " ";
    if (tag === "input") {
      var type = String(el.type || "text").toLowerCase();
      if (type === "range") return true;
      return key === " ";
    }
    return false;
  }

  /* BloomShader.svelte's guards, exactly: the key must match, no meta/ctrl/alt
     (those chords belong to the host app), and never while the user is typing.
     Shift is not tested because Shift+backtick yields "~", which cannot match.

     NOTE on e.key vs e.code: this matches e.key, which is layout dependent.
     That is deliberate and inherited from BloomShader. Do NOT add
     `|| e.code === "Backquote"` as an OR -- on several keyboard layouts that
     physical key emits an unrelated character, and the OR would produce phantom
     summons for anyone typing that character. */
  function classifySummonKey(ev, key, doc) {
    if (!ev || ev.key !== (key || "`")) return "ignore";
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return "ignore";
    if (isEditingTarget(ev, doc)) return "ignore";
    return "toggle";
  }

  /* Keep a box of w x h fully inside a vp of w x h, with `pad` clearance on
     every side. Cannot fail: when the box is wider than the viewport the
     Math.max wins and the box is pinned at `pad`, overflowing right rather than
     left -- which is why the skin caps width at 100vw - 2*pad so that case
     never arises for the panel itself. */
  function clampToViewport(w, h, want, vp, pad) {
    var p = typeof pad === "number" ? pad : PAD;
    return {
      left: Math.max(p, Math.min(want.left, vp.w - w - p)),
      top: Math.max(p, Math.min(want.top, vp.h - h - p))
    };
  }

  /* Move only the requested edges; the opposite edges stay anchored. Minimum
     sizes yield to a smaller viewport, so no resize can strand its controls. */
  function resizeRect(rect, edge, dx, dy, vp, limits) {
    var l = limits || {}, p = typeof l.pad === "number" ? l.pad : PAD;
    var left = (vp.left || 0) + p, top = (vp.top || 0) + p;
    var right = (vp.left || 0) + vp.w - p, bottom = (vp.top || 0) + vp.h - p;
    var minW = Math.min(l.minWidth || 220, Math.max(1, right - left));
    var minH = Math.min(l.minHeight || 100, Math.max(1, bottom - top));
    var x = rect.left, y = rect.top, r = x + rect.width, b = y + rect.height;
    if (edge.indexOf("w") !== -1) x = Math.max(left, Math.min(x + dx, r - minW));
    if (edge.indexOf("e") !== -1) r = Math.min(right, Math.max(r + dx, x + minW));
    if (edge.indexOf("n") !== -1) y = Math.max(top, Math.min(y + dy, b - minH));
    if (edge.indexOf("s") !== -1) b = Math.min(bottom, Math.max(b + dy, y + minH));
    return { left: x, top: y, width: r - x, height: b - y };
  }

  /* Shared ordinary-panel dismissal. Callers own visibility, peer panels and
     pending-edit checks; this seam owns the event's closing effect. */
  function dismissPanelEvent(e, spec) {
    var s = spec || {};
    if (!e || !isFn(s.close)) return false;
    if (e.type === "pointerdown" && !s.inside) {
      s.close("outside");
      return true;
    }
    if (e.key !== "Escape" || s.escape === false || e.metaKey || e.ctrlKey || e.altKey) return false;
    if (isFn(e.preventDefault)) e.preventDefault();
    if (isFn(e.stopImmediatePropagation)) e.stopImmediatePropagation();
    s.close("escape");
    return true;
  }

  /* Move through a title grip; optional resize creates eight interior margin
     targets. place(want) restores position plus optional dimensions; place()
     reclamps while retaining requested dimensions through viewport changes.
     onMove receives actual geometry plus desiredWidth/desiredHeight after a
     resize. No storage, animation or floating-palette docking lives here. */
  function makeMovable(spec) {
    var s = spec || {}, element = s.element, handle = s.handle;
    var win = s.window || (typeof window !== "undefined" ? window : null);
    if (!element || !handle || !win) throw new Error("panel-core: makeMovable needs element, handle and window");
    var doc = element.ownerDocument || win.document;
    var pad = typeof s.pad === "number" ? s.pad : PAD;
    var position = null, session = null, destroyed = false, bound = [], size = null;
    var resizing = s.resize && typeof s.resize === "object" ? s.resize : null;
    var resizeHandles = [], resizeStyle = null, directions = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
    var instructions = "Drag to move; arrow keys move 1px; Shift+arrow keys move 10px";
    handle.setAttribute("tabindex", "0");
    handle.setAttribute("aria-roledescription", "move handle");
    handle.setAttribute("aria-label", String(s.label || handle.textContent || "Panel") + ". " + instructions);
    handle.setAttribute("title", instructions);
    handle.style.cursor = "grab";
    handle.style.touchAction = "none";
    handle.style.userSelect = "none";
    handle.style.webkitUserSelect = "none";

    function positive(value, fallback) {
      return typeof value === "number" && isFinite(value) && value > 0 ? value : fallback;
    }
    function arrangeHandles() {
      if (!resizing) return;
      var coarse = isFn(win.matchMedia) && win.matchMedia("(pointer: coarse)").matches;
      var edge = positive(resizing.edgeSize, coarse ? 12 : 8);
      var corner = Math.max(edge, positive(resizing.cornerSize, coarse ? 24 : 22));
      var cut = 100 * edge / corner, rest = 100 - cut;
      var polygons = {
        nw: "0 0,100% 0,100% " + cut + "%," + cut + "% " + cut + "%," + cut + "% 100%,0 100%",
        ne: "0 0,100% 0,100% 100%," + rest + "% 100%," + rest + "% " + cut + "%,0 " + cut + "%",
        se: "100% 0,100% 100%,0 100%,0 " + rest + "%," + rest + "% " + rest + "%," + rest + "% 0",
        sw: "0 0," + cut + "% 0," + cut + "% " + rest + "%,100% " + rest + "%,100% 100%,0 100%"
      };
      for (var i = 0; i < resizeHandles.length; i++) {
        var node = resizeHandles[i], d = directions[i], corner_ = d.length === 2;
        node.style.left = d.indexOf("w") !== -1 ? "0px" : d.indexOf("e") !== -1 ? "auto" : corner + "px";
        node.style.right = d.indexOf("e") !== -1 ? "0px" : d.indexOf("w") !== -1 ? "auto" : corner + "px";
        node.style.top = d.indexOf("n") !== -1 ? "0px" : d.indexOf("s") !== -1 ? "auto" : corner + "px";
        node.style.bottom = d.indexOf("s") !== -1 ? "0px" : d.indexOf("n") !== -1 ? "auto" : corner + "px";
        node.style.width = corner_ ? corner + "px" : /[ew]/.test(d) ? edge + "px" : "auto";
        node.style.height = corner_ ? corner + "px" : /[ns]/.test(d) ? edge + "px" : "auto";
        node.style.clipPath = corner_ ? "polygon(" + polygons[d] + ")" : "none";
      }
    }
    if (resizing) {
      var resizeId = "panel-resize-" + (++RESIZE_SEQ);
      element.setAttribute("data-panel-resizable", resizeId);
      resizeStyle = doc.createElement("style");
      resizeStyle.textContent = '[data-panel-resizable="' + resizeId + '"]>[data-panel-resize]{background:transparent;}' +
        '[data-panel-resizable="' + resizeId + '"]>[data-panel-resize]:focus-visible{' +
        'outline:2px solid currentColor;outline-offset:-2px;background:rgb(255 200 61 / .22);}';
      element.appendChild(resizeStyle);
      var names = { n: "top edge", ne: "top right corner", e: "right edge", se: "bottom right corner",
        s: "bottom edge", sw: "bottom left corner", w: "left edge", nw: "top left corner" };
      for (var ri = 0; ri < directions.length; ri++) {
        var zone = doc.createElement("span"), direction = directions[ri];
        zone.className = "panel-resize";
        zone.setAttribute("data-panel-resize", direction);
        zone.setAttribute("tabindex", "0");
        zone.setAttribute("role", "group");
        zone.setAttribute("aria-roledescription", "resize handle");
        zone.setAttribute("aria-label", "Resize " + names[direction] + "; arrow keys resize 1px; Shift+arrow keys resize 10px");
        zone.setAttribute("title", "Drag to resize " + names[direction]);
        zone.style.cssText = "position:absolute;z-index:20;pointer-events:auto;box-sizing:border-box;";
        zone.style.cursor = direction === "n" || direction === "s" ? "ns-resize" :
          direction === "e" || direction === "w" ? "ew-resize" : direction === "ne" || direction === "sw" ? "nesw-resize" : "nwse-resize";
        zone.style.touchAction = "none";
        zone.style.userSelect = "none";
        zone.style.webkitUserSelect = "none";
        element.appendChild(zone);
        resizeHandles.push(zone);
      }
      arrangeHandles();
    }

    function viewport_() {
      var vv = win.visualViewport;
      return { w: vv ? vv.width : win.innerWidth, h: vv ? vv.height : win.innerHeight,
        left: vv ? vv.offsetLeft || 0 : 0, top: vv ? vv.offsetTop || 0 : 0 };
    }
    function rect_() {
      return isFn(element.getBoundingClientRect) ? element.getBoundingClientRect() : {
        left: parseFloat(element.style.left) || 0, top: parseFloat(element.style.top) || 0,
        width: parseFloat(element.style.width) || element.offsetWidth || 0,
        height: parseFloat(element.style.height) || element.offsetHeight || 0
      };
    }
    function geometry(rect) {
      var r = rect || rect_();
      var out = { left: r.left, top: r.top, width: r.width, height: r.height };
      if (size) { out.desiredWidth = size.width; out.desiredHeight = size.height; }
      return out;
    }
    function place_(want, reason) {
      if (destroyed) return position;
      var rect = rect_();
      var vp = viewport_(), desired = want || position || rect;
      if (resizing && want && (positive(want.width, 0) || positive(want.desiredWidth, 0))) {
        size = { width: positive(want.desiredWidth, positive(want.width, rect.width)),
          height: positive(want.desiredHeight, positive(want.height, rect.height)) };
      }
      if (size) {
        element.style.boxSizing = "border-box";
        element.style.width = Math.min(Math.max(size.width, positive(resizing.minWidth, 220)), Math.max(1, vp.w - pad * 2)) + "px";
        element.style.height = Math.min(Math.max(size.height, positive(resizing.minHeight, 100)), Math.max(1, vp.h - pad * 2)) + "px";
        element.style.maxWidth = Math.max(1, vp.w - pad * 2) + "px";
        element.style.maxHeight = Math.max(1, vp.h - pad * 2) + "px";
        rect = rect_();
      }
      var at = clampToViewport(rect.width, rect.height,
        { left: desired.left - vp.left, top: desired.top - vp.top }, vp, pad);
      at.left += vp.left;
      at.top += vp.top;
      position = { left: at.left, top: at.top };
      element.style.right = "auto";
      element.style.bottom = "auto";
      element.style.left = at.left + "px";
      element.style.top = at.top + "px";
      arrangeHandles();
      if (isFn(s.onMove)) s.onMove(geometry({ left: at.left, top: at.top, width: rect.width, height: rect.height }), reason || "place");
      return { left: at.left, top: at.top };
    }
    function consume(e) {
      if (isFn(e.preventDefault)) e.preventDefault();
      if (isFn(e.stopPropagation)) e.stopPropagation();
    }
    function matchesPointer(e) {
      return session && (session.pointerId === undefined || e.pointerId === undefined ||
        session.pointerId === e.pointerId);
    }
    function end(cancelled) {
      if (!session) return;
      var previous = session;
      session = null; // releasePointerCapture can synchronously raise lostpointercapture
      handle.style.cursor = "grab";
      if (previous.pointerId !== undefined && isFn(previous.capture.releasePointerCapture)) {
        try { previous.capture.releasePointerCapture(previous.pointerId); } catch (_) {}
      }
      if (cancelled) {
        if (previous.kind === "resize") {
          size = previous.size;
          for (var k in previous.styles) if (Object.prototype.hasOwnProperty.call(previous.styles, k)) element.style[k] = previous.styles[k];
        }
        place_({ left: previous.origin.left, top: previous.origin.top }, "cancel");
      }
    }
    function down(e) {
      if (destroyed || session || e.isPrimary === false || (e.button !== undefined && e.button !== 0)) return;
      var path = isFn(e.composedPath) ? e.composedPath() : [e.target];
      var zone = null;
      for (var z = 0; z < path.length; z++) if (resizeHandles.indexOf(path[z]) !== -1) { zone = path[z]; break; }
      if (zone) {
        consume(e);
        place_();
        session = { kind: "resize", capture: zone, pointerId: e.pointerId,
          x: e.clientX, y: e.clientY, origin: geometry(), edge: zone.getAttribute("data-panel-resize"),
          size: size && { width: size.width, height: size.height }, styles: {
            width: element.style.width || "", height: element.style.height || "", boxSizing: element.style.boxSizing || "",
            maxWidth: element.style.maxWidth || "", maxHeight: element.style.maxHeight || ""
          } };
        zone.focus();
        if (e.pointerId !== undefined && isFn(zone.setPointerCapture)) {
          try { zone.setPointerCapture(e.pointerId); } catch (_) {}
        }
        return;
      }
      var inside = false;
      for (var i = 0; i < path.length; i++) {
        var node = path[i];
        if (node === handle) { inside = true; break; }
        if (!node || !node.tagName) continue;
        var tag = String(node.tagName).toLowerCase();
        var role = isFn(node.getAttribute) ? node.getAttribute("role") || "" : "";
        if (/^(button|input|select|textarea|summary|a|label)$/.test(tag) || node.isContentEditable ||
            /^(button|link|checkbox|radio|switch|slider|spinbutton|textbox|combobox)$/.test(role)) return;
      }
      if (!inside) return;
      consume(e);
      var origin = place_();
      session = { kind: "move", capture: handle, pointerId: e.pointerId, x: e.clientX, y: e.clientY, origin: origin };
      handle.style.cursor = "grabbing";
      if (isFn(handle.focus)) handle.focus();
      if (e.pointerId !== undefined && isFn(handle.setPointerCapture)) {
        try { handle.setPointerCapture(e.pointerId); } catch (_) {}
      }
    }
    function move(e) {
      if (!matchesPointer(e)) return;
      consume(e);
      if (session.kind === "resize") {
        place_(resizeRect(session.origin, session.edge, e.clientX - session.x, e.clientY - session.y,
          viewport_(), { pad: pad, minWidth: resizing.minWidth, minHeight: resizing.minHeight }), "resize");
      } else place_({ left: session.origin.left + e.clientX - session.x,
        top: session.origin.top + e.clientY - session.y }, "pointer");
    }
    function up(e) { if (matchesPointer(e)) { move(e); end(false); } }
    function cancel(e) { if (!e || matchesPointer(e)) end(true); }
    function key_(e) {
      var target = (isFn(e.composedPath) && e.composedPath()[0]) || e.target;
      var zone = resizeHandles.indexOf(target) !== -1;
      if (destroyed || (target !== handle && !zone) || e.metaKey || e.ctrlKey || e.altKey ||
          !/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
      consume(e);
      if (isFn(e.stopImmediatePropagation)) e.stopImmediatePropagation();
      end(false);
      var at = geometry(), step = e.shiftKey ? 10 : 1;
      var dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      var dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      if (zone) place_(resizeRect(at, target.getAttribute("data-panel-resize"), dx, dy, viewport_(),
        { pad: pad, minWidth: resizing.minWidth, minHeight: resizing.minHeight }), "resize-keyboard");
      else place_({ left: at.left + dx, top: at.top + dy }, "keyboard");
    }
    function resize() {
      end(false);
      if (position && !element.hidden && element.offsetWidth && element.offsetHeight) place_();
    }
    function hidden() { end(true); }
    function bind_(target, type, fn, opts) {
      if (!target || !isFn(target.addEventListener)) return;
      target.addEventListener(type, fn, opts);
      bound.push([target, type, fn, opts]);
    }
    bind_(win, "pointerdown", down, true);
    bind_(win, "pointermove", move, true);
    bind_(win, "pointerup", up, true);
    bind_(win, "pointercancel", cancel, true);
    bind_(handle, "lostpointercapture", cancel);
    for (var zi = 0; zi < resizeHandles.length; zi++) bind_(resizeHandles[zi], "lostpointercapture", cancel);
    bind_(win, "keydown", key_, true);
    bind_(win, "blur", hidden);
    bind_(doc, "visibilitychange", hidden);
    bind_(win, "resize", resize);
    bind_(win, "orientationchange", resize);
    if (win.visualViewport) {
      bind_(win.visualViewport, "resize", resize);
      bind_(win.visualViewport, "scroll", resize);
    }
    return {
      place: place_,
      getRect: function () { return geometry(); },
      resizeHandles: resizeHandles,
      hasPosition: function () { return position !== null; },
      cancel: function () { end(true); },
      destroy: function () {
        if (destroyed) return;
        end(true);
        destroyed = true;
        for (var i = 0; i < bound.length; i++) {
          var b = bound[i];
          if (isFn(b[0].removeEventListener)) b[0].removeEventListener(b[1], b[2], b[3]);
        }
        bound = [];
        for (var h = 0; h < resizeHandles.length; h++) {
          if (isFn(resizeHandles[h].remove)) resizeHandles[h].remove();
        }
        resizeHandles.length = 0;
        if (resizeStyle && isFn(resizeStyle.remove)) resizeStyle.remove();
        if (resizing && isFn(element.removeAttribute)) element.removeAttribute("data-panel-resizable");
      }
    };
  }

  /* Where a box of w x h WANTS to sit for a named corner, or an explicit
     viewport point (just-in-place: the fastest target is the pixel under the
     cursor). The result is pre-clamp; callers always clamp after. */
  function anchorPoint(anchor, w, h, vp, pad) {
    var p = typeof pad === "number" ? pad : PAD;
    if (anchor && typeof anchor === "object") {
      return { left: anchor.x, top: anchor.y };
    }
    switch (anchor || "bottom-left") {
      case "top-left": return { left: p, top: p };
      case "top-right": return { left: vp.w - w - p, top: p };
      case "bottom-right": return { left: vp.w - w - p, top: vp.h - h - p };
      case "bottom-left":
      default: return { left: p, top: vp.h - h - p };
    }
  }

  /* A floating palette is allowed to brush the viewport edge by a few pixels:
     shadows and fractional layout rounding are not a failed hit. More than
     `threshold` CSS pixels on any edge is meaningful overflow and docks it. */
  function viewportHitTest(rect, vp, threshold) {
    var t = typeof threshold === "number" ? threshold : FLOAT_OVERFLOW_PX;
    var over = {
      left: Math.max(0, -rect.left),
      top: Math.max(0, -rect.top),
      right: Math.max(0, rect.left + rect.width - vp.w),
      bottom: Math.max(0, rect.top + rect.height - vp.h)
    };
    return {
      fits: over.left <= t && over.top <= t && over.right <= t && over.bottom <= t,
      overflow: over
    };
  }

  function floatingStart(w, h, vp, pad) {
    var p = typeof pad === "number" ? pad : PAD;
    return clampToViewport(w, h, {
      left: vp.w - w - p,
      top: Math.round(vp.h * .25)
    }, vp, p);
  }

  function paletteUnderPointer(point, w, h, vp, pad) {
    return clampToViewport(w, h, {
      left: point.x - w + 32,
      top: point.y - 20
    }, vp, typeof pad === "number" ? pad : PAD);
  }

  /* The right-edge attachment lane is pointer-based, not panel-based. That
     keeps one stable boundary under the hand: cross left and the palette
     expands; cross right and the tab attaches. Release chooses the final
     state, so crossing the line during a drag is only a reversible preview. */
  function insideTabAttachmentLane(x, vp, width) {
    var lane = typeof width === "number" ? width : TAB_RESTORE_PX;
    return x >= vp.w - lane;
  }

  /* Public pure reducer for consumers/tests that want to reason about the
     palette without a DOM. State is a tagged union, not a boolean bag. */
  function nextFloatingState(state, action) {
    var a = action || {};
    if (!state || !state.tag) throw new Error("panel-core: floating state needs a tag");
    if (a.type === "dock") return { tag: "tab", phase: "docking", y: a.y };
    if (state.tag === "palette" && a.type === "drag-start") {
      return { tag: "palette", phase: "dragging", left: state.left, top: state.top,
        pointerX: a.x, pointerY: a.y, originLeft: state.left, originTop: state.top };
    }
    if (state.tag === "palette" && state.phase === "dragging" && a.type === "drag-move") {
      return { tag: "palette", phase: "dragging",
        left: state.originLeft + a.x - state.pointerX,
        top: state.originTop + a.y - state.pointerY,
        pointerX: state.pointerX, pointerY: state.pointerY,
        originLeft: state.originLeft, originTop: state.originTop };
    }
    if (state.tag === "tab" && a.type === "drag-start") {
      return { tag: "tab", phase: "dragging", y: state.y,
        pointerX: a.x, pointerY: a.y, originY: state.y };
    }
    if (state.tag === "tab" && state.phase === "dragging" && a.type === "drag-move") {
      return { tag: "tab", phase: "dragging", y: state.originY + a.y - state.pointerY,
        pointerX: state.pointerX, pointerY: state.pointerY, originY: state.originY };
    }
    if (state.tag === "tab" && a.type === "peek") return { tag: "tab", phase: "peeking", y: state.y };
    if (state.tag === "tab" && a.type === "retract") return { tag: "tab", phase: "retracting", y: state.y };
    if (state.tag === "tab" && a.type === "settle") return { tag: "tab", phase: "settled", y: state.y };
    if (state.tag === "tab" && a.type === "restore") {
      return { tag: "palette", phase: "revealing", left: a.left, top: a.top };
    }
    if (state.tag === "palette" && a.type === "settle") {
      return { tag: "palette", phase: "settled", left: state.left, top: state.top };
    }
    return state;
  }

  /* The cyclic focus step. Separated from the DOM so the wrap-around at both
     ends is a tested fact rather than a hopeful line inside a keydown handler.
     cur === -1 means "focus is not on any tracked control" (the common case
     right after open, and the case document.activeElement silently creates when
     someone forgets trap #1 above): Tab goes to the first, Shift+Tab to the
     last. */
  function nextFocusIndex(len, cur, shift) {
    if (len <= 0) return -1;
    if (shift) return cur <= 0 ? len - 1 : cur - 1;
    return (cur < 0 || cur >= len - 1) ? 0 : cur + 1;
  }

  /* The long-hold state machine. A tagged `state`, never a bag of booleans
     (global AGENTS.md sec. Make Impossible States Impossible) -- "cueing but also
     fired" is unrepresentable. The clock is injected so a test can hold a
     finger down for 599ms without waiting 599ms. */
  function createHoldRecognizer(opts) {
    var o = opts || {};
    var holdMs = typeof o.holdMs === "number" ? o.holdMs : HOLD_MS;
    var cueAtMs = typeof o.cueAtMs === "number" ? o.cueAtMs : CUE_AT_MS;
    var slopPx = typeof o.slopPx === "number" ? o.slopPx : SLOP_PX;
    var now = isFn(o.now) ? o.now : function () { return Date.now(); };
    var onCue = isFn(o.onCue) ? o.onCue : noop;
    var onFire = isFn(o.onFire) ? o.onFire : noop;
    var onCancel = isFn(o.onCancel) ? o.onCancel : noop;

    var state = "idle";
    var t0 = 0, ox = 0, oy = 0;

    function reset() { state = "idle"; }

    function cancel(reason) {
      if (state === "idle") return;
      reset();
      onCancel(reason || "lift");
    }

    var api = {
      get state() { return state; },
      get holdMs() { return holdMs; },
      get cueAtMs() { return cueAtMs; },

      start: function (x, y, touchCount) {
        if (touchCount > 1) { cancel("multitouch"); return; }
        state = "pending";
        t0 = now();
        ox = x; oy = y;
      },

      move: function (x, y, touchCount) {
        if (state !== "pending" && state !== "cueing") return;
        if (touchCount > 1) { cancel("multitouch"); return; }
        var dx = x - ox, dy = y - oy;
        if (Math.sqrt(dx * dx + dy * dy) > slopPx) cancel("move");
      },

      /* Drive from rAF (or a test). Cue first, then fire, so a single coarse
         tick that straddles both thresholds still produces both callbacks in
         the order a human would have seen them. */
      tick: function () {
        if (state !== "pending" && state !== "cueing") return;
        var dt = now() - t0;
        if (state === "pending" && dt >= cueAtMs) { state = "cueing"; onCue(); }
        if (dt >= holdMs) { state = "fired"; onFire(); }
      },

      /* Finger lifted. Before the threshold that is a cancel; after it the
         hold already fired and this is just cleanup, with no cancel callback --
         firing onCancel here would tell a consumer the gesture failed when it
         had in fact succeeded. */
      end: function () {
        if (state === "fired") { reset(); return; }
        cancel("lift");
      },

      cancel: cancel,

      /* 0..1 across the hold, for a progress cue. Clamped at both ends. */
      progress: function () {
        if (state !== "pending" && state !== "cueing") return 0;
        var dt = now() - t0;
        if (dt <= 0) return 0;
        return dt >= holdMs ? 1 : dt / holdMs;
      }
    };
    return api;
  }

  // ------------------------------------------------------------- row specs
  // A discriminated union on `kind` (global AGENTS.md sec. Make Impossible States
  // Impossible). A row can never be simultaneously a link and a number, and an
  // unknown kind throws at build time rather than rendering an empty box --
  // silent empty rows are exactly the placeholder the vault rules forbid.

  var ROW_KINDS = ["link", "action", "toggle", "select", "choice", "number", "note", "custom", "group"];

  function assertRowKind(row, i) {
    var kind = row && row.kind;
    if (kind === "group") {
      if (typeof row.id !== "string" || !row.id || typeof row.label !== "string" ||
          !Array.isArray(row.rows)) {
        throw new Error('panel-core: a "group" row needs id, label and rows');
      }
      for (var j = 0; j < row.rows.length; j++) assertRowKind(row.rows[j], i + "." + j);
    }
    for (var k = 0; k < ROW_KINDS.length; k++) if (ROW_KINDS[k] === kind) return kind;
    throw new Error(
      "panel-core: row " + i + ' has unknown kind "' + kind + '". Known kinds: ' +
      ROW_KINDS.join(", ")
    );
  }

  // ------------------------------------------------------------------ skin
  // The palette is SELF-CONTAINED and deliberately does not inherit host theme
  // tokens. In CourseLit, `.courselit-theme` (which carries the Anahata tokens)
  // is applied to inner divs, never to <body> or <html>, and its tokens are
  // bare HSL triplets usable only as hsl(var(--x)) -- so a body-level shadow
  // host reading var(--background) would silently resolve to stock shadcn
  // blue-grey and LOOK themed while being wrong. Mounting inside the themed
  // subtree instead would be worse: it varies per route, React can unmount it,
  // and position:fixed inside a transformed ancestor resolves against that
  // ancestor rather than the viewport, which breaks the clamp outright.
  //
  // Opacity is .92, not propsheet.js's measured .58. That .58 keeps near-white
  // text at ~4.6:1 over a white ground -- the accessibility edge -- which is
  // fine over a poetry site's dark field and too close to the line over
  // CourseLit's cream page. .92 is ~13:1 over white and unchanged over dark.
  // A dev panel should read as a dev panel on both hosts, not blend into
  // product chrome.
  //
  // Consumers retheme through the --jp-* custom properties only (spec.tokens).
  var SKIN = [
    ":host{all:initial;}",
    ".panel{position:fixed;pointer-events:auto;box-sizing:border-box;",
    /* width can never exceed vw - 2*PAD, so clampToViewport's Math.max branch
       is unreachable for the panel and the page can never be widened. */
    "width:min(320px,calc(100vw - " + (PAD * 2) + "px));",
    "max-height:min(70vh,calc(100dvh - " + (PAD * 2) + "px));",
    "overflow-y:auto;overflow-x:hidden;",
    "padding:10px 12px;border-radius:10px;",
    "border:1px solid var(--jp-line,rgb(255 255 255 / .16));",
    "background:var(--jp-bg,rgb(20 16 20 / .92));",
    "-webkit-backdrop-filter:blur(12px) saturate(1.2);backdrop-filter:blur(12px) saturate(1.2);",
    "color:var(--jp-fg,#f1ecf4);",
    "font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;",
    "text-align:left;direction:ltr;letter-spacing:0;",
    "box-shadow:0 10px 30px rgb(0 0 0 / .5);}",
    ".panel[hidden]{display:none;}",
    ".panel[data-panel-resizable]:not([hidden]){display:flex;flex-direction:column;overflow:hidden;}",
    ".panel[data-panel-resizable]>.hd{flex:0 0 auto;}",
    ".panel[data-panel-resizable]>.rows{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;}",
    /* Floating palettes hold short controls plus explanatory prose. Keep the
       whole surface inside a readable measure (Butterick: 45--90 characters)
       while the viewport remains the hard outer bound. Consumers can tune the
       measure through tokens.measure without reaching into the shadow root. */
    ".panel.floating{width:max-content;max-width:min(var(--jp-measure,72ch),calc(100vw - " + (PAD * 2) + "px));}",
    ".panel.floating[data-phase=dragging]{transition:none;animation:none;user-select:none;}",
    ".panel.floating[data-phase=revealing],.panel.floating[data-phase=expanding]{",
    "transform-origin:right 20px;animation:jp-palette-in " + PALETTE_REVEAL_MS + "ms linear;}",
    "@keyframes jp-palette-in{from{opacity:.68;transform:scale(.12,.2)}to{opacity:1;transform:none}}",
    /* min-width:0 everywhere: the grid/flex default of min-content width is
       what makes a long label force a horizontal scrollbar. */
    ".panel *,.panel *::before,.panel *::after{box-sizing:inherit;min-width:0;}",
    ".hd{display:flex;align-items:baseline;gap:8px;margin:0 0 8px;}",
    ".floating .hd{cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;}",
    ".floating[data-phase=dragging] .hd{cursor:grabbing;}",
    ".ttl{margin:0;flex:1;font:inherit;font-weight:600;",
    "white-space:normal;overflow-wrap:anywhere;}",
    ".ttl[tabindex]::after{content:' \\2194';opacity:.6;}",
    ".ttl[tabindex]:focus-visible{outline:2px solid currentColor;outline-offset:3px;border-radius:2px;}",
    ".ver{color:var(--jp-muted,#a59fb3);font-size:10px;white-space:nowrap;}",
    ".x{flex:0 0 auto;font:inherit;line-height:1;color:inherit;cursor:pointer;",
    "background:rgb(255 255 255 / .08);border:1px solid rgb(255 255 255 / .22);",
    "border-radius:6px;padding:2px 7px;}",
    ".rows{display:flex;flex-direction:column;gap:10px;}",
    ".row{display:flex;flex-direction:column;gap:4px;}",
    /* Grouped panels scroll their rows, keeping the close control reachable.
       Ungrouped and floating consumers retain their existing shell geometry. */
    ".panel.has-groups{display:flex;flex-direction:column;overflow:hidden;}",
    ".panel.has-groups[hidden]{display:none;}",
    ".has-groups>.hd{flex-shrink:0;}",
    ".has-groups>.rows{min-height:0;overflow-y:auto;overflow-x:hidden;gap:4px;padding:2px;}",
    ".group{border:1px solid var(--jp-line,rgb(255 255 255 / .16));border-radius:6px;}",
    ".group,.group *{box-sizing:border-box;}",
    ".group>summary{min-height:44px;padding:11px 10px;cursor:pointer;",
    "font-weight:600;white-space:normal;overflow-wrap:anywhere;}",
    ".group>summary:hover{background:rgb(255 255 255 / .08);}",
    ".group>.rows{padding:4px 10px 12px;}",
    ".group:not([open])>.rows{display:none;}",
    "@media (pointer:coarse){.has-groups .x{min-width:44px;min-height:44px;}}",
    /* Label ABOVE the control, wrapping, never truncated
       (vault AGENTS.md sec. User-visible strings are never truncated). */
    ".lbl{white-space:normal;overflow-wrap:anywhere;}",
    ".hint{color:var(--jp-muted,#a59fb3);white-space:normal;overflow-wrap:anywhere;}",
    ".btn{display:block;width:100%;text-align:left;font:inherit;color:inherit;",
    "text-decoration:none;background:rgb(255 255 255 / .08);",
    "border:1px solid rgb(255 255 255 / .22);border-radius:6px;padding:7px 10px;",
    "cursor:pointer;white-space:normal;overflow-wrap:anywhere;}",
    ".x:hover:not(:disabled),.btn:hover:not(:disabled){background:rgb(255 255 255 / .14);}",
    ".x:active:not(:disabled),.btn:active:not(:disabled){background:rgb(255 255 255 / .22);}",
    ".x:disabled,.btn:disabled{opacity:.45;cursor:not-allowed;}",
    ".choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;}",
    ".choice{position:relative;min-height:44px;padding:8px;}",
    ".choice[aria-checked=true]{border-color:var(--jp-accent,#ffc83d);",
    "box-shadow:inset 0 0 0 1px var(--jp-accent,#ffc83d);}",
    ".choice[aria-checked=true] .choice-label::after{content:' \\2713';}",
    ".swatches{display:flex;height:12px;margin-bottom:5px;border-radius:3px;overflow:hidden;}",
    ".swatch{flex:1;}",
    ".panel :focus-visible,.panel :focus{outline:2px solid var(--jp-accent,#ffc83d);outline-offset:2px;}",
    ".note{color:var(--jp-muted,#a59fb3);white-space:normal;overflow-wrap:anywhere;}",
    /* Measure the touch summon zone without intercepting controls beneath it.
       Window capture recognizes a hold only over non-interactive content. */
    ".corner{position:fixed;width:calc(" + CORNER_PX + "px + env(safe-area-inset-left,0px));",
    "height:calc(" + CORNER_PX + "px + env(safe-area-inset-bottom,0px));",
    "pointer-events:none;background:transparent;",
    "-webkit-tap-highlight-color:transparent;}",
    "@media (pointer:fine){.corner{display:none;}}",
    ".corner[hidden]{display:none;}",
    /* Progress cue. A phone has no discoverable ` key and no hover, so the ring
       is the only confirmation that a hold is being recognised the first time
       someone tries it. */
    ".ring{position:fixed;width:36px;height:36px;margin:-18px 0 0 -18px;",
    "border-radius:50%;border:2px solid var(--jp-accent,#ffc83d);",
    "opacity:0;transform:scale(.4);pointer-events:none;",
    "transition:opacity .12s linear,transform .4s linear;}",
    ".ring.on{opacity:.9;transform:scale(1);}",
    ".tab{position:fixed;right:0;pointer-events:auto;touch-action:none;cursor:grab;writing-mode:vertical-rl;",
    "-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;",
    "min-width:44px;min-height:44px;max-height:calc(100dvh - 24px);padding:10px 8px;border:1px solid var(--jp-line,rgb(255 255 255 / .16));",
    "border-right:0;border-radius:9px 0 0 9px;background:var(--jp-bg,rgb(20 16 20 / .92));",
    "color:var(--jp-fg,#f1ecf4);font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;",
    "text-align:left;white-space:normal;overflow-wrap:anywhere;box-shadow:0 8px 24px rgb(0 0 0 / .4);",
    "transform:none;transition:transform " + TAB_RETRACT_MS + "ms cubic-bezier(.18,.7,.25,1);}",
    ".tab[hidden]{display:none;}",
    ".tab[data-phase=peeking]{transform:translateX(-16px);transition:transform " + PALETTE_REVEAL_MS + "ms linear;}",
    ".tab[data-phase=docking],.tab[data-phase=retracting]{transform:none;",
    "animation:jp-tab-dock " + TAB_RETRACT_MS + "ms cubic-bezier(.18,.7,.25,1);}",
    "@keyframes jp-tab-dock{from{transform:translateX(-16px)}to{transform:none}}",
    ".tab[data-phase=attaching]{transform-origin:right center;",
    "animation:jp-tab-attach " + PALETTE_REVEAL_MS + "ms linear;}",
    "@keyframes jp-tab-attach{from{opacity:.7;transform:scale(1.8,1.12)}to{opacity:1;transform:none}}",
    ".tab[data-phase=dragging]{transition:none;cursor:grabbing;}",
    ".tab:focus-visible,.tab:focus{outline:2px solid var(--jp-accent,#ffc83d);outline-offset:2px;}",
    "@media (prefers-reduced-motion:reduce){.ring,.panel.floating,.tab{transition:none!important;animation:none!important;}}"
  ].join("");

  // -------------------------------------------------------------- renderers
  // Each returns { el, focusables } and the shell concatenates focusables in
  // row order to build the Tab cycle.

  function labelEl(doc, text) {
    var l = doc.createElement("div");
    l.className = "lbl";
    l.textContent = text == null ? "" : String(text);
    // Belt and braces: the skin says this too, but a consumer that drops the
    // skin must still not truncate a user-visible string.
    l.style.whiteSpace = "normal";
    l.style.overflowWrap = "anywhere";
    return l;
  }

  function hintEl(doc, text) {
    var h = doc.createElement("div");
    h.className = "hint";
    h.textContent = String(text);
    h.style.whiteSpace = "normal";
    h.style.overflowWrap = "anywhere";
    return h;
  }

  /* One mutually exclusive value, with optional decorative color previews.
     Native buttons keep click/Space/Enter activation. Arrow keys are routed by
     the shell's capture listener; target listeners cannot run after containment.
     get/set are synchronous, like the existing toggle/select row contract. */
  function renderChoice(doc, row, ctx) {
    var options = row.options || [];
    if (!options.length || !isFn(row.get) || !isFn(row.set)) {
      throw new Error('panel-core: a "choice" row needs options, get and set');
    }
    var values = options.map(function (option) {
      if (!option || typeof option.value !== "string" || typeof option.label !== "string") {
        throw new Error('panel-core: choice options need string value and label');
      }
      return option.value;
    });
    if (values.some(function (value, index) { return values.indexOf(value) !== index; })) {
      throw new Error('panel-core: choice option values must be unique');
    }
    var el = doc.createElement("div");
    el.className = "row";
    el.appendChild(labelEl(doc, row.label));
    var group = doc.createElement("div");
    group.className = "choices";
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", String(row.label));
    el.appendChild(group);
    if (row.hint) {
      var hint = hintEl(doc, row.hint);
      var hintId = "choice-hint-" + ctx.rowIndex;
      hint.setAttribute("id", hintId);
      group.setAttribute("aria-describedby", hintId);
      el.appendChild(hint);
    }
    var buttons = options.map(function (option, index) {
      var button = doc.createElement("button");
      button.className = "btn choice";
      button.setAttribute("type", "button");
      button.setAttribute("role", "radio");
      button.setAttribute("aria-label", option.label);
      if (option.swatches && option.swatches.length) {
        var strip = doc.createElement("span");
        strip.className = "swatches";
        strip.setAttribute("aria-hidden", "true");
        option.swatches.forEach(function (color) {
          var swatch = doc.createElement("span");
          swatch.className = "swatch";
          swatch.style.backgroundColor = String(color);
          strip.appendChild(swatch);
        });
        button.appendChild(strip);
      }
      var label = doc.createElement("span");
      label.className = "choice-label";
      label.textContent = option.label;
      button.appendChild(label);
      button.addEventListener("click", function () { choose(index, false); });
      group.appendChild(button);
      return button;
    });
    function sync() {
      var selected = values.indexOf(row.get());
      buttons.forEach(function (button, index) {
        button.setAttribute("aria-checked", String(index === selected));
        button.setAttribute("tabindex", index === (selected < 0 ? 0 : selected) ? "0" : "-1");
      });
    }
    function choose(index, focus) {
      row.set(values[index]);
      sync();
      if (focus) buttons[index].focus();
    }
    sync();
    return {
      el: el,
      focusables: buttons,
      sync: sync,
      onKey: function (event, active) {
        var index = buttons.indexOf(active);
        if (index < 0) return false;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") index = (index + 1) % buttons.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") index = (index + buttons.length - 1) % buttons.length;
        else if (event.key === "Home") index = 0;
        else if (event.key === "End") index = buttons.length - 1;
        else return false;
        event.preventDefault();
        event.stopImmediatePropagation();
        choose(index, true);
        return true;
      }
    };
  }

  /* Groups keep every child mounted. Their lifecycle delegates once per child,
     so custom async content and choice keyboard handling work at any depth. */
  function renderGroup(doc, row, ctx) {
    var el = doc.createElement("details");
    el.className = "group";
    el.setAttribute("data-panel-group-row", row.id);
    var summary = doc.createElement("summary");
    summary.textContent = row.label;
    el.appendChild(summary);
    var content = doc.createElement("div");
    content.className = "rows";
    el.appendChild(content);
    var focusables = [summary];
    var controls = row.rows.map(function (child, index) {
      var childCtx = {
        numberFactory: ctx.numberFactory, fields: ctx.fields,
        rowIndex: ctx.rowIndex + "-" + index, onDisclosure: ctx.onDisclosure
      };
      var built = renderRow(doc, child, childCtx);
      content.appendChild(built.el);
      focusables = focusables.concat(built.focusables);
      return built;
    });
    function toggleGroup() { ctx.onDisclosure(el, summary); }
    el.addEventListener("toggle", toggleGroup);
    return {
      el: el, focusables: focusables,
      sync: function () {
        controls.forEach(function (control) { if (isFn(control.sync)) control.sync(); });
      },
      onKey: function (event, active) {
        return controls.some(function (control) {
          return isFn(control.onKey) && control.onKey(event, active);
        });
      },
      destroy: function () {
        el.removeEventListener("toggle", toggleGroup);
        controls.forEach(function (control) { if (isFn(control.destroy)) control.destroy(); });
      }
    };
  }

  function renderRow(doc, row, ctx) {
    if (row.kind === "group") return renderGroup(doc, row, ctx);
    if (row.kind === "choice") return renderChoice(doc, row, ctx);
    var el = doc.createElement("div");
    el.className = "row";
    var focusables = [];

    if (row.kind === "custom") {
      if (!isFn(row.mount)) throw new Error('panel-core: a "custom" row needs mount(el)');
      var mounted = row.mount(el) || {};
      if (mounted.focusables && !Array.isArray(mounted.focusables)) {
        throw new Error('panel-core: custom focusables must be an array');
      }
      return {
        el: el,
        focusables: mounted.focusables || [],
        sync: isFn(mounted.sync) ? mounted.sync : null,
        destroy: isFn(mounted.destroy) ? mounted.destroy : null
      };
    }

    if (row.kind === "note") {
      var n = doc.createElement("div");
      n.className = "note";
      n.textContent = String(row.text == null ? "" : row.text);
      n.style.whiteSpace = "normal";
      n.style.overflowWrap = "anywhere";
      el.appendChild(n);
      return { el: el, focusables: focusables };
    }

    if (row.kind === "link") {
      // A real <a>, not a button + window.open: it survives popup blockers and
      // gives middle-click, cmd-click and "Copy Link Address" for free.
      // rel="noopener noreferrer" because the destination is untrusted-by-
      // default local content.
      var a = doc.createElement("a");
      a.className = "btn";
      a.setAttribute("href", String(row.href));
      a.setAttribute("target", row.target || "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      a.textContent = String(row.label);
      a.style.whiteSpace = "normal";
      a.style.overflowWrap = "anywhere";
      el.appendChild(a);
      if (row.hint) el.appendChild(hintEl(doc, row.hint));
      focusables.push(a);
      return { el: el, focusables: focusables };
    }

    if (row.kind === "action") {
      var b = doc.createElement("button");
      b.className = "btn";
      b.setAttribute("type", "button");
      b.textContent = String(row.label);
      b.style.whiteSpace = "normal";
      b.style.overflowWrap = "anywhere";
      // Running an action NEVER dismisses -- the panel is here so values can be
      // compared rapidly, and a control that closes on use is a video scrubber
      // that vanishes every time a frame is displayed.
      b.addEventListener("click", function () { if (isFn(row.run)) row.run(); });
      el.appendChild(b);
      if (row.hint) el.appendChild(hintEl(doc, row.hint));
      focusables.push(b);
      return { el: el, focusables: focusables };
    }

    if (row.kind === "toggle") {
      var wrap = doc.createElement("label");
      wrap.className = "lbl";
      wrap.style.whiteSpace = "normal";
      wrap.style.overflowWrap = "anywhere";
      var cb = doc.createElement("input");
      cb.setAttribute("type", "checkbox");
      if (row.get && row.get()) cb.checked = true;
      cb.addEventListener("change", function () {
        if (isFn(row.set)) row.set(!!cb.checked);
      });
      var span = doc.createElement("span");
      span.textContent = " " + String(row.label);
      wrap.appendChild(cb);
      wrap.appendChild(span);
      el.appendChild(wrap);
      if (row.hint) el.appendChild(hintEl(doc, row.hint));
      focusables.push(cb);
      return { el: el, focusables: focusables };
    }

    if (row.kind === "select") {
      el.appendChild(labelEl(doc, row.label));
      var sel = doc.createElement("select");
      sel.className = "btn";
      var opts = row.options || [];
      for (var i = 0; i < opts.length; i++) {
        var o = opts[i];
        var value = (o && typeof o === "object") ? o.value : o;
        var text = (o && typeof o === "object") ? (o.label || o.value) : o;
        var opt = doc.createElement("option");
        opt.setAttribute("value", String(value));
        opt.textContent = String(text);
        sel.appendChild(opt);
      }
      if (isFn(row.get)) sel.value = String(row.get());
      sel.addEventListener("change", function () {
        if (isFn(row.set)) row.set(sel.value);
      });
      el.appendChild(sel);
      if (row.hint) el.appendChild(hintEl(doc, row.hint));
      focusables.push(sel);
      return { el: el, focusables: focusables };
    }

    // kind === "number": delegate to field-core, which owns the scrub/type/
    // nudge/revert contract. This shell never reimplements a numeric control --
    // that is the seam the two files exist to keep closed.
    var factory = ctx.numberFactory;
    if (!isFn(factory)) {
      throw new Error(
        'panel-core: a "number" row needs field-core. Pass spec.numberFactory, ' +
        "or load field-core.js first so globalThis.PropsheetField exists."
      );
    }
    var handle = factory(row.field || {});
    el.appendChild(handle.el);
    if (row.hint) el.appendChild(hintEl(doc, row.hint));
    ctx.fields.push(handle);
    // field-core's public node map owns its input; older adapters may expose
    // input directly. Its wrapper is not a keyboard stop in the real browser.
    focusables.push(handle.input || (handle.nodes && handle.nodes.input) || handle.el);
    return { el: el, focusables: focusables };
  }

  // ------------------------------------------------------------ createPanel

  function createPanel(spec) {
    var s = spec || {};

    if (s.mode && s.mode !== "floating-palette") {
      throw new Error('panel-core: unknown mode "' + s.mode + '"');
    }

    // Validate the SPEC before looking at the environment. A malformed row is
    // the author's bug and should say so wherever the code runs -- including a
    // node test with no DOM at all, where an environment error would mask it.
    var rows = s.rows || [];
    for (var v = 0; v < rows.length; v++) assertRowKind(rows[v], v);

    var win = s.window || (typeof window !== "undefined" ? window : null);
    var doc = s.document || (win && win.document) || (typeof document !== "undefined" ? document : null);
    if (!doc) throw new Error("panel-core: no document available");

    var id = s.id || "panel";

    var interactionGroup = typeof s.interactionGroup === "string" ? s.interactionGroup : "";
    var anchor = s.anchor || "bottom-left";
    var floating = s.mode === "floating-palette";
    var floatingSpec = floating ? (s.floating || {}) : null;
    var summonSpec = s.summon === false ? null : (s.summon || {});
    var onOpen = isFn(s.onOpen) ? s.onOpen : noop;
    var onClose = isFn(s.onClose) ? s.onClose : noop;
    var numberFactory = s.numberFactory ||
      (getGlobal() && getGlobal().PropsheetField && getGlobal().PropsheetField.createNumberField);

    var open = false, destroyed = false;
    var fields = [];
    var focusList = [];
    var rowControls = [];
    var restoreFocusTo = null;
    var surfaceState = null;
    var dragSession = null;
    var dragCaptureEl = null;
    var peekTimers = [];
    var stateStorageKey = floating && floatingSpec &&
      typeof floatingSpec.stateStorageKey === "string" ?
      floatingSpec.stateStorageKey : "";

    /* Browser storage is an optional convenience: a blocked/private storage
       context leaves the palette usable at its default location. The stored
       shape deliberately contains only geometry and presentation state -- never
       a release action, account identity, or status payload. */
    function floatingStorage() {
      if (!stateStorageKey || !win) return null;
      try { return win.localStorage || null; } catch (_) { return null; }
    }

    function validCoordinate(value) {
      return typeof value === "number" && isFinite(value);
    }

    function readStoredSurfaceState() {
      var storage = floatingStorage();
      if (!storage) return null;
      try {
        var raw = storage.getItem(stateStorageKey);
        if (!raw) return null;
        var saved = JSON.parse(raw);
        if (!saved || saved.version !== 1) return null;
        if (saved.tag === "palette" && validCoordinate(saved.left) &&
            validCoordinate(saved.top)) {
          return { tag: "palette", phase: "settled", left: saved.left, top: saved.top };
        }
        if (saved.tag === "tab" && validCoordinate(saved.y)) {
          return { tag: "tab", phase: "settled", y: saved.y };
        }
      } catch (_) {
        // Storage may be denied or contain an interrupted/corrupt write.
      }
      return null;
    }

    function persistSurfaceState() {
      var storage = floatingStorage();
      if (!storage || !surfaceState) return;
      var saved = surfaceState.tag === "palette" ?
        { version: 1, tag: "palette", left: surfaceState.left, top: surfaceState.top } :
        { version: 1, tag: "tab", y: surfaceState.y };
      try { storage.setItem(stateStorageKey, JSON.stringify(saved)); } catch (_) {}
    }

    // ---- host + shadow root
    var hostEl = doc.createElement("div");
    hostEl.setAttribute("data-panel", id);
    if (interactionGroup) hostEl.setAttribute("data-panel-group", interactionGroup);
    // A zero-size fixed anchor: never affects page flow, never blocks a click.
    // z-index is just under the 32-bit max so a host's own "always on top"
    // overlay at 2147483647 (CourseLit's media-debug overlay does exactly that)
    // can still win if it needs to.
    hostEl.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483000;pointer-events:none;";
    var root = isFn(hostEl.attachShadow) ? hostEl.attachShadow({ mode: "open" }) : hostEl;

    var styleEl = doc.createElement("style");
    styleEl.textContent = SKIN;
    root.appendChild(styleEl);

    // ---- panel
    var panelEl = doc.createElement("div");
    panelEl.className = "panel";
    panelEl.setAttribute("role", "dialog");
    panelEl.setAttribute("aria-label", String(s.title || id));
    panelEl.setAttribute("tabindex", "-1");
    panelEl.hidden = true;
    if (floating) panelEl.className = "panel floating";
    if (s.tokens) {
      for (var t in s.tokens) {
        if (Object.prototype.hasOwnProperty.call(s.tokens, t)) {
          panelEl.style.setProperty("--jp-" + t, s.tokens[t]);
        }
      }
    }

    var hd = doc.createElement("div");
    hd.className = "hd";
    var ttl = doc.createElement("h2");
    ttl.className = "ttl";
    ttl.textContent = String(s.title || id);
    ttl.style.whiteSpace = "normal";
    ttl.style.overflowWrap = "anywhere";
    hd.appendChild(ttl);
    if (s.version) {
      var ver = doc.createElement("span");
      ver.className = "ver";
      ver.textContent = String(s.version);
      hd.appendChild(ver);
    }
    var closeBtn = null;
    if (floating) {
      closeBtn = doc.createElement("button");
      closeBtn.className = "x";
      closeBtn.setAttribute("type", "button");
      closeBtn.setAttribute("aria-label", "Minimize palette");
      closeBtn.setAttribute("title", "Minimize palette");
      closeBtn.textContent = "\u00d7"; // ASCII-only source
      closeBtn.addEventListener("click", function () { close("close-button"); });
      hd.appendChild(closeBtn);
    }
    panelEl.appendChild(hd);

    var rowsEl = doc.createElement("div");
    rowsEl.className = "rows";
    panelEl.appendChild(rowsEl);
    root.appendChild(panelEl);

    var tabEl = null;
    if (floating) {
      tabEl = doc.createElement("div");
      tabEl.className = "tab";
      tabEl.setAttribute("role", "button");
      tabEl.setAttribute("tabindex", "0");
      tabEl.setAttribute("aria-label", "Show " + String(s.title || id));
      tabEl.textContent = String((floatingSpec && floatingSpec.tabLabel) || s.title || id);
      tabEl.style.whiteSpace = "normal";
      tabEl.style.overflowWrap = "anywhere";
      if (s.tokens) {
        for (var tabToken in s.tokens) {
          if (Object.prototype.hasOwnProperty.call(s.tokens, tabToken)) {
            tabEl.style.setProperty("--jp-" + tabToken, s.tokens[tabToken]);
          }
        }
      }
      tabEl.hidden = true;
      root.appendChild(tabEl);
    }

    // ---- touch summon zone + progress ring
    var cornerEl = null, ringEl = null, recognizer = null, holdTimers = [];
    if (summonSpec && summonSpec.corner !== false) {
      cornerEl = doc.createElement("div");
      cornerEl.className = "corner";
      placeCorner(summonSpec.corner || "bottom-left");
      root.appendChild(cornerEl);

      ringEl = doc.createElement("div");
      ringEl.className = "ring";
      root.appendChild(ringEl);
    }

    function placeCorner(which) {
      if (!cornerEl) return;
      var css = "";
      if (which === "bottom-right") css = "right:0;bottom:0;";
      else if (which === "top-left") css = "left:0;top:0;";
      else if (which === "top-right") css = "right:0;top:0;";
      else css = "left:0;bottom:0;";
      cornerEl.style.cssText = cornerEl.style.cssText + css;
      cornerEl.style.left = which === "bottom-right" || which === "top-right" ? "" : "0px";
      cornerEl.style.right = which === "bottom-right" || which === "top-right" ? "0px" : "";
      cornerEl.style.top = which === "top-left" || which === "top-right" ? "0px" : "";
      cornerEl.style.bottom = which === "top-left" || which === "top-right" ? "" : "0px";
    }

    if (doc.body && isFn(doc.body.appendChild)) doc.body.appendChild(hostEl);

    var movable = floating || !win ? null : makeMovable({ element: panelEl, handle: ttl, window: win,
      resize: s.resize === false ? null : (s.resize || { minWidth: 220, minHeight: 100 }) });

    // ------------------------------------------------------------- render

    function renderRows() {
      for (var c = 0; c < rowControls.length; c++) {
        if (isFn(rowControls[c].destroy)) rowControls[c].destroy();
      }
      while (rowsEl.firstChild) rowsEl.removeChild(rowsEl.firstChild);
      for (var i = 0; i < fields.length; i++) {
        if (isFn(fields[i].destroy)) fields[i].destroy();
      }
      fields = [];
      panelEl.className = "panel" + (floating ? " floating" : "") +
        (rows.some(function (row) { return row.kind === "group"; }) ? " has-groups" : "");
      var ctx = { numberFactory: numberFactory, fields: fields, onDisclosure: onDisclosure };
      var rowFocus = [];
      rowControls = [];
      for (var j = 0; j < rows.length; j++) {
        ctx.rowIndex = j;
        var built = renderRow(doc, rows[j], ctx);
        rowControls.push(built);
        rowsEl.appendChild(built.el);
        for (var k = 0; k < built.focusables.length; k++) rowFocus.push(built.focusables[k]);
      }
      // Focus order: rows first (task priority -- the reason the panel exists),
      // then the move handle (or floating minimize) LAST. Vault rule:
      // "Order the first 3-5 Tab stops by task importance."
      focusList = rowFocus.concat([floating ? closeBtn : ttl]).concat(movable ? movable.resizeHandles : []);
    }
    renderRows();

    function onDisclosure(group, summary) {
      if (!open || destroyed) return;
      var active = activeInRoot();
      if (!group.open && active !== summary) {
        for (var node = active; node && node !== group; node = node.parentNode) {}
        if (node === group) summary.focus();
      }
      place();
    }

    // Evaluate visibility for each Tab: choices, disabled async controls and
    // nested disclosures can change without rebuilding or losing focus. Stop
    // at the shell so the debug seam still reports controls while it is shut.
    function tabStops() {
      return focusList.filter(function (node) {
        if (node.disabled || (isFn(node.matches) && node.matches(":disabled")) ||
            (isFn(node.getAttribute) && node.getAttribute("tabindex") === "-1")) return false;
        for (var child = node; child && child !== panelEl; child = child.parentNode) {
          if (child.hidden || child.inert ||
              (isFn(child.getAttribute) && child.getAttribute("aria-hidden") === "true")) return false;
          var style = win && isFn(win.getComputedStyle) ? win.getComputedStyle(child) : child.style;
          if (style && (style.display === "none" || style.visibility === "hidden" ||
              style.visibility === "collapse")) return false;
          var parent = child.parentNode;
          if (parent && String(parent.tagName).toLowerCase() === "details" && !parent.open &&
              !(String(child.tagName).toLowerCase() === "summary" && child === parent.firstChild)) return false;
        }
        return true;
      });
    }

    // ------------------------------------------------------- shadow helpers

    // Trap #2: composedPath, not contains. See the header.
    function composedInside(ev) {
      if (!ev || !isFn(ev.composedPath)) return false;
      var path = ev.composedPath();
      for (var i = 0; i < path.length; i++) if (path[i] === hostEl) return true;
      return false;
    }

    // Trap #1: root.activeElement, not document.activeElement. See the header.
    function activeInRoot() {
      return (root && root.activeElement) || null;
    }

    function anyFieldHasPendingEdit() {
      for (var i = 0; i < fields.length; i++) {
        if (isFn(fields[i].hasPendingEdit) && fields[i].hasPendingEdit()) return true;
      }
      return false;
    }

    // --------------------------------------------------------- positioning

    function viewport() {
      return { w: win ? win.innerWidth : 0, h: win ? win.innerHeight : 0 };
    }

    function px(value) {
      var n = parseFloat(value);
      return isNaN(n) ? 0 : n;
    }

    function clampTabY(y) {
      var h = tabEl ? (tabEl.offsetHeight || 0) : 0;
      return Math.max(PAD, Math.min(y, viewport().h - h - PAD));
    }

    function applySurfaceState() {
      if (!floating || !surfaceState) return;
      if (surfaceState.tag === "palette") {
        panelEl.hidden = false;
        tabEl.hidden = true;
        panelEl.style.left = surfaceState.left + "px";
        panelEl.style.top = surfaceState.top + "px";
        panelEl.setAttribute("data-phase", surfaceState.phase);
        tabEl.setAttribute("aria-expanded", "true");
      } else {
        panelEl.hidden = true;
        tabEl.hidden = false;
        surfaceState.y = clampTabY(surfaceState.y);
        tabEl.style.top = surfaceState.y + "px";
        tabEl.setAttribute("data-phase", surfaceState.phase);
        tabEl.setAttribute("aria-expanded", "false");
      }
    }

    function place() {
      // Measure IN the DOM, after insert, with visibility hidden so the
      // pre-clamp position never flashes. Never assume the size.
      panelEl.style.visibility = "hidden";
      panelEl.style.left = "0px";
      panelEl.style.top = "0px";
      var w = panelEl.offsetWidth || 0;
      var h = panelEl.offsetHeight || 0;
      var vp = viewport();
      var want = floating ? floatingStart(w, h, vp, PAD) : anchorPoint(anchor, w, h, vp, PAD);
      if (floating && surfaceState && surfaceState.tag === "palette") {
        want = { left: surfaceState.left, top: surfaceState.top };
      }
      var at = clampToViewport(w, h, want, vp, PAD);
      if (movable) at = movable.hasPosition() ? movable.place() : movable.place(at);
      else {
        panelEl.style.left = at.left + "px";
        panelEl.style.top = at.top + "px";
      }
      panelEl.style.visibility = "";
      if (floating) {
        surfaceState = { tag: "palette", phase: "settled", left: at.left, top: at.top };
        applySurfaceState();
        persistSurfaceState();
      }
      return at;
    }

    function onViewportChange() {
      if (open) place();
      else if (floating && surfaceState && surfaceState.tag === "tab") {
        surfaceState.y = clampTabY(surfaceState.y);
        applySurfaceState();
        persistSurfaceState();
      }
    }

    // ---------------------------------------------------------- open/close

    function open_() {
      if (destroyed || open) return;
      open = true;
      restoreFocusTo = doc.activeElement || null;
      panelEl.hidden = false;
      if (tabEl) tabEl.hidden = true;
      if (cornerEl) cornerEl.hidden = true;   // the panel covers it anyway
      rowControls.forEach(function (control) { if (isFn(control.sync)) control.sync(); });
      place();
      // Initial focus on the DOMINANT control -- the first interactive row.
      var stops = tabStops();
      var first = stops.length ? stops[0] : panelEl;
      if (first && isFn(first.focus)) first.focus();
      onOpen();
    }

    function close(reason) {
      if (destroyed || !open) return;
      if (movable) movable.cancel();
      open = false;
      panelEl.hidden = true;
      if (floating) {
        var y = surfaceState && surfaceState.tag === "palette" ? surfaceState.top : viewport().h * .25;
        surfaceState = nextFloatingState(surfaceState || { tag: "palette", phase: "settled", left: 0, top: y },
          { type: "dock", y: clampTabY(y) });
        applySurfaceState();
        persistSurfaceState();
        clearPeekTimers();
        settleDockSoon();
        if (tabEl && isFn(tabEl.focus)) tabEl.focus();
        restoreFocusTo = null;
        onClose(reason || "minimize");
        return;
      }
      if (cornerEl) cornerEl.hidden = false;
      if (restoreFocusTo && isFn(restoreFocusTo.focus) &&
          (restoreFocusTo.isConnected === undefined || restoreFocusTo.isConnected)) {
        restoreFocusTo.focus();
      }
      restoreFocusTo = null;
      onClose(reason || "toggle");
    }

    function toggle() { if (open) close("toggle"); else open_(); }

    function clearPeekTimers() {
      if (win && isFn(win.clearTimeout)) {
        for (var i = 0; i < peekTimers.length; i++) win.clearTimeout(peekTimers[i]);
      }
      peekTimers = [];
    }

    function settleDockSoon() {
      if (!win || !isFn(win.setTimeout)) return;
      peekTimers.push(win.setTimeout(function () {
        if (destroyed || open || !surfaceState || surfaceState.tag !== "tab" ||
            surfaceState.phase !== "docking") return;
        surfaceState = nextFloatingState(surfaceState, { type: "settle" });
        applySurfaceState();
      }, TAB_RETRACT_MS));
    }

    function peekTab() {
      if (!floating || open || !surfaceState || surfaceState.tag !== "tab") return;
      clearPeekTimers();
      surfaceState = nextFloatingState(surfaceState, { type: "peek" });
      applySurfaceState();
      if (!win || !isFn(win.setTimeout)) return;
      peekTimers.push(win.setTimeout(function () {
        if (destroyed || open || !surfaceState || surfaceState.tag !== "tab") return;
        surfaceState = nextFloatingState(surfaceState, { type: "retract" });
        applySurfaceState();
        peekTimers.push(win.setTimeout(function () {
          if (destroyed || open || !surfaceState || surfaceState.tag !== "tab") return;
          surfaceState = nextFloatingState(surfaceState, { type: "settle" });
          applySurfaceState();
        }, TAB_RETRACT_MS));
      }, TAB_PEEK_MS));
    }

    function consumeDragEvent(e) {
      if (e && isFn(e.preventDefault)) e.preventDefault();
      if (e && isFn(e.stopPropagation)) e.stopPropagation();
    }

    function captureDragPointer(el, e) {
      dragCaptureEl = el || null;
      if (dragCaptureEl && e && e.pointerId !== undefined &&
          isFn(dragCaptureEl.setPointerCapture)) {
        dragCaptureEl.setPointerCapture(e.pointerId);
      }
    }

    function releaseDragPointer(e) {
      if (dragCaptureEl && e && e.pointerId !== undefined &&
          isFn(dragCaptureEl.releasePointerCapture)) {
        dragCaptureEl.releasePointerCapture(e.pointerId);
      }
      dragCaptureEl = null;
    }

    function palettePointForDrag(session, x, y) {
      if (session.tag === "tab") {
        // display:none has no box. Reveal invisibly for one synchronous measure
        // so expansion uses the palette's real content size, never 0 x 0.
        panelEl.hidden = false;
        panelEl.style.visibility = "hidden";
        panelEl.style.left = "0px";
        panelEl.style.top = "0px";
        var under = paletteUnderPointer({ x: x, y: y }, panelEl.offsetWidth || 0,
          panelEl.offsetHeight || 0, viewport(), PAD);
        panelEl.style.visibility = "";
        return under;
      }
      return {
        left: session.originLeft + x - session.pointerX,
        top: session.originTop + y - session.pointerY
      };
    }

    function previewFloatingDrag(e) {
      if (!dragSession) return;
      var x = e.clientX || 0, y = e.clientY || 0;
      var dx = x - dragSession.pointerX, dy = y - dragSession.pointerY;
      if (Math.sqrt(dx * dx + dy * dy) >= 4) dragSession.moved = true;
      var priorTag = surfaceState && surfaceState.tag;
      if (insideTabAttachmentLane(x, viewport(), TAB_RESTORE_PX)) {
        var tabY = dragSession.tag === "tab" ? dragSession.originY + dy : y - 20;
        surfaceState = {
          tag: "tab",
          phase: priorTag === "palette" ? "attaching" : "dragging",
          y: clampTabY(tabY)
        };
        open = false;
      } else {
        var at = palettePointForDrag(dragSession, x, y);
        surfaceState = {
          tag: "palette",
          phase: priorTag === "tab" ? "expanding" : "dragging",
          left: at.left,
          top: at.top
        };
        open = true;
      }
      applySurfaceState();
    }

    // ------------------------------------------------------- key handling
    // Window CAPTURE, because a host's own handler may be attached earlier and
    // at a lower level. CourseLit's login popover, for instance, swallows
    // Escape with a React onKeyDown calling stopPropagation on its wrapper --
    // a bubble-phase listener would never see the key at all, and would look
    // correct in isolation while failing in the one scenario that matters.

    function onKeyCapture(e) {
      if (destroyed) return;
      // A companion panel owns its keys and focus cycle, while the shared
      // summon must still reach the panel that coordinates group visibility.
      if (composedInsidePeer(e) &&
          !(summonSpec && classifySummonKey(e, summonSpec.key, doc) === "toggle")) return;

      if (!open) {
        if (floating && tabEl && composedInsideEl(e, tabEl) &&
            (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          e.stopImmediatePropagation();
          peekTab();
          return;
        }
        if (summonSpec && classifySummonKey(e, summonSpec.key, doc) === "toggle") {
          e.preventDefault();
          open_();
        }
        return;
      }

      if (e.key === "Tab") {
        var stops = tabStops();
        if (!stops.length) return;
        var cur = stops.indexOf(activeInRoot());
        var n = nextFocusIndex(stops.length, cur, !!e.shiftKey);
        e.preventDefault();
        e.stopImmediatePropagation();
        if (stops[n] && isFn(stops[n].focus)) stops[n].focus();
        return;
      }

      if (e.key === "Escape") {
        // field-core's Escape policy: a field with an unsubmitted edit owns the
        // key and reverts; the ladder only collapses a tier once nothing is
        // pending.
        if (anyFieldHasPendingEdit()) return;
        if (dismissPanelEvent(e, { inside: composedInside(e), close: close })) return;
      }

      if (summonSpec && classifySummonKey(e, summonSpec.key, doc) === "toggle") {
        e.preventDefault();
        e.stopImmediatePropagation();
        close("toggle");
        return;
      }

      if (composedInside(e) && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        for (var r = 0; r < rowControls.length; r++) {
          if (isFn(rowControls[r].onKey) && rowControls[r].onKey(e, activeInRoot())) return;
        }
      }

      // Space presses the focused control. A link row RENDERS as a button and
      // reads as one, but an <a> is not Space-activatable natively -- so
      // without this the key falls through to its default and scrolls the page
      // underneath the panel instead of opening the link. Handled here rather
      // than on the anchor because this window-capture listener calls
      // stopPropagation below, so a listener on the element itself would never
      // be reached.
      if (e.key === " " && !e.metaKey && !e.ctrlKey && !e.altKey && composedInside(e)) {
        var pressed = activeInRoot();
        if (pressed && String(pressed.tagName).toLowerCase() === "a") {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (isFn(pressed.click)) pressed.click();
          return;
        }
      }

      // Contain every other BARE key raised from inside the panel, so a host's
      // single-key shortcut cannot fire from a panel control. Chords bearing
      // meta/ctrl/alt pass through untouched: those belong to the host app.
      //
      // stopPropagation stops listeners but NOT default actions, so the
      // page-moving keys additionally need preventDefault -- otherwise a
      // keystroke raised inside the overlay scrolls the surface it is covering.
      // Never for a text-entry target (it owns every key, and typing must still
      // type) and never for a control that consumes the key itself.
      if (composedInside(e) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (SCROLL_KEYS.test(e.key) && !isEditingTarget(e, doc) &&
            !ownsKeyNatively(activeInRoot(), e.key)) {
          e.preventDefault();
        }
        e.stopPropagation();
      }
    }

    // -------------------------------------------------------- outside click

    function onPointerDownCapture(e) {
      if (destroyed) return;

      if (floating && open && composedInsideEl(e, hd) && !composedInsideEl(e, closeBtn)) {
        consumeDragEvent(e);
        clearPeekTimers();
        dragSession = {
          tag: "palette",
          pointerId: e.pointerId,
          pointerX: e.clientX,
          pointerY: e.clientY,
          originLeft: surfaceState.left,
          originTop: surfaceState.top,
          moved: false,
          wasOpen: true
        };
        captureDragPointer(hd, e);
        surfaceState = nextFloatingState(surfaceState, {
          type: "drag-start", x: e.clientX, y: e.clientY
        });
        applySurfaceState();
        return;
      }

      if (floating && !open && tabEl && composedInsideEl(e, tabEl)) {
        consumeDragEvent(e);
        clearPeekTimers();
        dragSession = {
          tag: "tab",
          pointerId: e.pointerId,
          pointerX: e.clientX,
          pointerY: e.clientY,
          originY: surfaceState.y,
          moved: false,
          wasOpen: false
        };
        captureDragPointer(tabEl, e);
        surfaceState = nextFloatingState(surfaceState, {
          type: "drag-start", x: e.clientX, y: e.clientY
        });
        applySurfaceState();
        return;
      }

      // Touch summon. Handled at window capture so it lands BEFORE any
      // document-level bubble listener the host uses to dismiss its own
      // popovers -- CourseLit's login popover closes on exactly such a
      // listener, and losing it would cost the user a typed email plus another
      // request against a 3-per-60s sign-in limiter. stopPropagation is scoped
      // to empty corner content; real controls retain their native pointer path.
      if (!open && recognizer && cornerOwnsPress(e)) {
        e.stopPropagation();
        recognizer.start(e.clientX, e.clientY, 1);
        showRing(e.clientX, e.clientY);
        scheduleHold();
        return;
      }

      if (open && !floating) dismissPanelEvent(e, {
        inside: composedInside(e) || composedInsidePeer(e), close: close
      });
    }

    function composedInsidePeer(ev) {
      if (!interactionGroup || !ev || !isFn(ev.composedPath)) return false;
      var path = ev.composedPath();
      for (var i = 0; i < path.length; i++) {
        var node = path[i];
        if (node !== hostEl && isFn(node.getAttribute) &&
            node.getAttribute("data-panel-group") === interactionGroup) return true;
      }
      return false;
    }

    function composedInsideEl(ev, el) {
      if (!ev || !isFn(ev.composedPath)) return false;
      var path = ev.composedPath();
      for (var i = 0; i < path.length; i++) if (path[i] === el) return true;
      return false;
    }

    function cornerOwnsPress(ev) {
      if (!cornerEl || cornerEl.hidden) return false;
      var rect = cornerEl.getBoundingClientRect();
      if (!rect.width || !rect.height || ev.clientX < rect.left ||
          ev.clientX >= rect.right || ev.clientY < rect.top || ev.clientY >= rect.bottom) return false;
      var path = isFn(ev.composedPath) ? ev.composedPath() : [ev.target];
      for (var i = 0; i < path.length; i++) {
        var node = path[i];
        if (!node || !node.tagName) continue;
        var tag = String(node.tagName).toLowerCase();
        if (/^(button|input|select|textarea|summary|label)$/.test(tag) ||
            (tag === "a" && node.getAttribute("href") !== null) ||
            ((tag === "audio" || tag === "video") && node.controls) ||
            node.isContentEditable || node.tabIndex >= 0) return false;
        var role = node.getAttribute("role") || "";
        if (/^(button|link|checkbox|radio|switch|slider|spinbutton|textbox|combobox|listbox|option|menuitem|menuitemcheckbox|menuitemradio|tab|treeitem)$/.test(role)) return false;
      }
      return true;
    }

    // ------------------------------------------------------ the hold gesture

    function showRing(x, y) {
      if (!ringEl) return;
      ringEl.style.left = x + "px";
      ringEl.style.top = y + "px";
      ringEl.className = "ring";
    }

    function cueRing() {
      if (!ringEl || !recognizer) return;
      var remain = Math.max(0, recognizer.holdMs - recognizer.cueAtMs);
      ringEl.style.transitionDuration = ".12s," + remain + "ms";
      ringEl.className = "ring on";
    }

    function hideRing() {
      if (!ringEl) return;
      ringEl.className = "ring";
    }

    /* The hold's two deadlines, on TIMERS -- deliberately not on
       requestAnimationFrame.
       rAF is an animation-frame callback, and a browser PAUSES it outright
       whenever the page is not being painted (a background tab,
       document.visibilityState === "hidden", some power-saving modes). A
       gesture threshold is a deadline, not a frame, and a threshold that
       silently never arrives is the worst kind of bug: the finger is down, the
       ring never fills, and nothing anywhere reports an error. Measured
       2026-08-24 -- in a hidden tab, rAF never fired once and the hold could
       not be completed at all.
       Nothing here needs per-frame work: the ring is a CSS transition, so the
       browser animates it without our help. Two setTimeouts are both simpler
       and strictly more robust. */
    function scheduleHold() {
      clearHoldTimers();
      if (!win || !isFn(win.setTimeout) || !recognizer) return;
      var fire = function () {
        if (destroyed || !recognizer) return;
        recognizer.tick();
      };
      // +1ms so the recogniser's `dt >= holdMs` is unambiguously satisfied;
      // some engines fire a timer a fraction early.
      holdTimers.push(win.setTimeout(fire, recognizer.cueAtMs));
      holdTimers.push(win.setTimeout(fire, recognizer.holdMs + 1));
    }

    function clearHoldTimers() {
      if (win && isFn(win.clearTimeout)) {
        for (var i = 0; i < holdTimers.length; i++) win.clearTimeout(holdTimers[i]);
      }
      holdTimers = [];
    }

    if (cornerEl) {
      recognizer = createHoldRecognizer({
        // Injectable clock, same seam as spec.document/spec.window: without it
        // the gesture can only be exercised in real wall-clock time, which is
        // how the rAF scheduling bug reached a browser in the first place.
        now: s.now,
        onCue: cueRing,
        onFire: function () {
          clearHoldTimers();
          hideRing();
          // Android gives haptic confirmation; iOS Safari has no vibrate, which
          // is exactly why the ring is the primary cue and not the fallback.
          if (win && win.navigator && isFn(win.navigator.vibrate)) win.navigator.vibrate(10);
          toggle();
        },
        onCancel: function () { clearHoldTimers(); hideRing(); }
      });
    }

    function onPointerMove(e) {
      if (floating && dragSession) {
        if (dragSession.pointerId !== undefined && e.pointerId !== undefined &&
            dragSession.pointerId !== e.pointerId) return;
        consumeDragEvent(e);
        previewFloatingDrag(e);
        return;
      }
      if (recognizer) recognizer.move(e.clientX, e.clientY, 1);
    }
    function onPointerUp(e) {
      if (floating && dragSession) {
        if (dragSession.pointerId !== undefined && e.pointerId !== undefined &&
            dragSession.pointerId !== e.pointerId) return;
        consumeDragEvent(e);
        releaseDragPointer(e);
        var session = dragSession;
        dragSession = null;
        var x = e.clientX || 0, y = e.clientY || 0;

        if (session.tag === "tab" && !session.moved) {
          open = false;
          surfaceState = { tag: "tab", phase: "settled", y: clampTabY(session.originY) };
          applySurfaceState();
          peekTab();
          return;
        }

        var at = palettePointForDrag(session, x, y);
        var test = viewportHitTest({
          left: at.left,
          top: at.top,
          width: panelEl.offsetWidth || 0,
          height: panelEl.offsetHeight || 0
        }, viewport(), typeof floatingSpec.overflowThreshold === "number" ?
          floatingSpec.overflowThreshold : FLOAT_OVERFLOW_PX);
        var attach = insideTabAttachmentLane(x, viewport(), TAB_RESTORE_PX) || !test.fits;
        if (attach) {
          var tabY = session.tag === "tab" ? session.originY + y - session.pointerY : y - 20;
          open = false;
          surfaceState = { tag: "tab", phase: "docking", y: clampTabY(tabY) };
          applySurfaceState();
          persistSurfaceState();
          settleDockSoon();
          if (session.wasOpen) onClose("drag-attach");
        } else {
          var safe = clampToViewport(panelEl.offsetWidth || 0, panelEl.offsetHeight || 0,
            at, viewport(), PAD);
          open = true;
          surfaceState = { tag: "palette", phase: "settled", left: safe.left, top: safe.top };
          applySurfaceState();
          persistSurfaceState();
          if (!session.wasOpen) onOpen();
          var restoredStops = tabStops();
          var restoredFocus = restoredStops.length ? restoredStops[0] : panelEl;
          if (!session.wasOpen && restoredFocus && isFn(restoredFocus.focus)) restoredFocus.focus();
        }
        return;
      }
      if (recognizer) recognizer.end();
    }
    function onPointerCancel(e) {
      if (floating && dragSession) {
        releaseDragPointer(e || {});
        if (dragSession.tag === "palette") {
          open = true;
          surfaceState = { tag: "palette", phase: "settled",
            left: dragSession.originLeft, top: dragSession.originTop };
        } else {
          open = false;
          surfaceState = { tag: "tab", phase: "settled", y: clampTabY(dragSession.originY) };
        }
        dragSession = null;
        applySurfaceState();
        persistSurfaceState();
      }
      if (recognizer) recognizer.cancel("lift");
    }
    function onScroll() { if (recognizer) recognizer.cancel("scroll"); }
    function onHidden() { if (recognizer) recognizer.cancel("hidden"); }
    function onContextMenu(e) {
      // Android raises the long-press context menu on our zone; suppress it
      // there and nowhere else.
      if (!open && cornerOwnsPress(e)) e.preventDefault();
    }

    // ------------------------------------------------------------- binding

    var bound = [];
    function bind(target, type, fn, opts) {
      if (!target || !isFn(target.addEventListener)) return;
      target.addEventListener(type, fn, opts);
      bound.push([target, type, fn, opts]);
    }

    if (win) {
      bind(win, "keydown", onKeyCapture, true);
      bind(win, "pointerdown", onPointerDownCapture, true);
      bind(win, "pointermove", onPointerMove, true);
      bind(win, "pointerup", onPointerUp, true);
      bind(win, "pointercancel", onPointerCancel, true);
      bind(win, "scroll", onScroll, { capture: true, passive: true });
      bind(win, "blur", onHidden);
      bind(win, "resize", onViewportChange);
      bind(win, "orientationchange", onViewportChange);
      if (win.visualViewport) {
        // The iOS soft keyboard changes the usable viewport without a resize.
        bind(win.visualViewport, "resize", onViewportChange);
        bind(win.visualViewport, "scroll", onViewportChange);
      }
    }
    bind(doc, "visibilitychange", onHidden);
    bind(doc, "contextmenu", onContextMenu, true);

    if (floating) {
      surfaceState = readStoredSurfaceState();
      if (!surfaceState && floatingSpec.initialState === "tab") {
        surfaceState = {
          tag: "tab",
          phase: "settled",
          y: clampTabY(viewport().h * .25)
        };
      }
      if (surfaceState && surfaceState.tag === "tab") {
        applySurfaceState();
        persistSurfaceState();
      } else {
        open_();
      }
    }

    // -------------------------------------------------------------- handle

    return {
      el: hostEl,
      root: root,
      get isOpen() { return open; },
      get floatingState() { return surfaceState; },
      open: open_,
      close: close,
      minimize: function () { close("minimize"); },
      toggle: toggle,
      place: place,

      /* Re-render after mutating rows. Row specs are re-validated, so a bad
         kind still throws rather than silently producing an empty box. */
      refresh: function (nextRows) {
        if (nextRows) {
          for (var i = 0; i < nextRows.length; i++) assertRowKind(nextRows[i], i);
          rows = nextRows;
        }
        renderRows();
        if (open) place();
      },

      /* Test/debug seams -- the shell's own view of its focus cycle. */
      focusables: function () { return tabStops(); },

      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        clearHoldTimers();
        clearPeekTimers();
        if (movable) movable.destroy();
        for (var i = 0; i < bound.length; i++) {
          var b = bound[i];
          if (isFn(b[0].removeEventListener)) b[0].removeEventListener(b[1], b[2], b[3]);
        }
        bound = [];
        for (var j = 0; j < fields.length; j++) {
          if (isFn(fields[j].destroy)) fields[j].destroy();
        }
        for (var k = 0; k < rowControls.length; k++) {
          if (isFn(rowControls[k].destroy)) rowControls[k].destroy();
        }
        fields = [];
        dragSession = null;
        dragCaptureEl = null;
        if (open) { open = false; onClose("destroy"); }
        if (isFn(hostEl.remove)) hostEl.remove();
        else if (hostEl.parentNode && isFn(hostEl.parentNode.removeChild)) {
          hostEl.parentNode.removeChild(hostEl);
        }
      }
    };
  }

  // ----------------------------------------------------------- createSummon
  // Standalone, for a consumer that already has its own surface and wants only
  // the summon contract. createPanel does not use this -- it binds its own
  // listeners so open/close/toggle stay one state machine -- but the guard
  // logic is the same tested function.

  function createSummon(spec) {
    var s = spec || {};
    var win = s.window || (typeof window !== "undefined" ? window : null);
    var doc = s.document || (win && win.document) || null;
    var onSummon = isFn(s.onSummon) ? s.onSummon : noop;
    if (!win) return { destroy: noop };

    function onKey(e) {
      if (s.key === false) return;
      if (classifySummonKey(e, s.key, doc) !== "toggle") return;
      e.preventDefault();
      onSummon();
    }
    win.addEventListener("keydown", onKey, true);

    return {
      destroy: function () { win.removeEventListener("keydown", onKey, true); }
    };
  }

  // -------------------------------------------------------------- export

  var API = {
    VERSION: VERSION,
    HOLD_MS: HOLD_MS,
    CUE_AT_MS: CUE_AT_MS,
    SLOP_PX: SLOP_PX,
    CORNER_PX: CORNER_PX,
    PAD: PAD,
    FLOAT_OVERFLOW_PX: FLOAT_OVERFLOW_PX,
    TAB_RESTORE_PX: TAB_RESTORE_PX,
    PALETTE_REVEAL_MS: PALETTE_REVEAL_MS,
    TAB_PEEK_MS: TAB_PEEK_MS,
    TAB_RETRACT_MS: TAB_RETRACT_MS,
    ROW_KINDS: ROW_KINDS,
    SKIN: SKIN,
    createPanel: createPanel,
    makeMovable: makeMovable,
    dismissPanelEvent: dismissPanelEvent,
    createSummon: createSummon,
    createHoldRecognizer: createHoldRecognizer,
    classifySummonKey: classifySummonKey,
    isEditingTarget: isEditingTarget,
    ownsKeyNatively: ownsKeyNatively,
    SCROLL_KEYS: SCROLL_KEYS,
    clampToViewport: clampToViewport,
    resizeRect: resizeRect,
    anchorPoint: anchorPoint,
    viewportHitTest: viewportHitTest,
    floatingStart: floatingStart,
    paletteUnderPointer: paletteUnderPointer,
    insideTabAttachmentLane: insideTabAttachmentLane,
    nextFloatingState: nextFloatingState,
    nextFocusIndex: nextFocusIndex,
    assertRowKind: assertRowKind
  };

  // UMD tail, matching field-core.js: module.exports for CommonJS (node, an
  // eval-in-wrapper host); the global ALWAYS, so a bundler that refuses to
  // transform CJS in src/ can side-effect import this file and read
  // globalThis.PanelCore.
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  var G = getGlobal();
  if (G) G.PanelCore = API;
})();
