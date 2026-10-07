import { parseFragment } from 'parse5';

export const MAX_POEM_TITLE_LENGTH = 500;
export const MAX_POEM_HTML_BYTES = 256 * 1024;

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const tags = new Set(['div', 'p', 'pre', 'code', 'span', 'em', 'strong', 'b', 'i', 'u', 's', 'del', 'strike', 'br', 'hr', 'blockquote', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a']);
const voidTags = new Set(['br', 'hr']);
const classes = new Set(['notion-poem', 'verse', 'preformatted', 'title-verse', 'stanza', 'empty-line', 'indent', 'columns', 'column', 'callout']);
const editorAttributes = new Set(['contenteditable', 'spellcheck', 'autocapitalize', 'autocorrect', 'data-poem-editable']);
const simpleStyles = new Map([
  ['font-weight', /^(?:normal|bold|[1-9]00)$/],
  ['font-style', /^(?:normal|italic)$/],
  ['text-decoration', /^(?:none|underline|line-through|underline line-through)$/],
  ['text-decoration-line', /^(?:none|underline|line-through|underline line-through)$/],
  ['white-space', /^(?:pre|pre-wrap|pre-line|normal)$/]
]);

/** @param {string} reason @returns {never} */
function invalid(reason) { throw new Error(`Cannot save this poem: ${reason}`); }

/** @param {string} value */
function validateStyles(value) {
  for (const declaration of value.split(';')) {
    if (!declaration.trim()) continue;
    const match = declaration.trim().match(/^([a-z-]+)\s*:\s*(.+)$/i);
    if (!match || !simpleStyles.get(match[1].toLowerCase())?.test(match[2].trim().toLowerCase())) {
      invalid('unsupported text styling. Use the editor formatting controls.');
    }
  }
}

/** @param {string} value */
function validateLink(value) {
  try {
    const url = new URL(value, 'https://poem.invalid/');
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) invalid('unsupported link protocol.');
  } catch { invalid('unsupported link address.'); }
}

/**
 * Validate, without rewriting, the supported poem HTML. Rejecting unsupported
 * markup instead of silently removing it prevents an apparently successful
 * save from discarding a stanza, indent or emphasis. Browser and server use
 * the same HTML parser; original entity spelling and whitespace are retained.
 *
 * @param {unknown} document
 * @returns {{title: string, html: string}}
 */
export function validatePoemDocument(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) invalid('a poem document is required.');
  const { title, html } = /** @type {{title?: unknown, html?: unknown}} */ (document);
  if (typeof title !== 'string' || typeof html !== 'string') invalid('title and poem text must be strings.');
  if (title.length > MAX_POEM_TITLE_LENGTH) invalid(`the title exceeds ${MAX_POEM_TITLE_LENGTH} characters.`);
  if (new TextEncoder().encode(html).byteLength > MAX_POEM_HTML_BYTES) invalid('the poem is too large.');
  // eslint-disable-next-line no-control-regex -- Reject unsupported control characters without changing poem whitespace.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(title + html)) invalid('the poem contains unsupported control characters.');

  const fragment = parseFragment(html, {
    sourceCodeLocationInfo: true,
    onParseError: () => invalid('the poem contains malformed HTML.')
  });
  /** @type {Array<[number, number]>} */
  const coverage = [];
  let count = 0;
  /** @param {import('parse5').DefaultTreeAdapterTypes.ChildNode} node @param {number} depth */
  function visit(node, depth) {
    if (++count > 15000 || depth > 128) invalid('the poem structure is too complex.');
    if (node.nodeName === '#text' && !('tagName' in node)) {
      const location = node.sourceCodeLocation;
      if (!location) invalid('unsupported generated text.');
      coverage.push([location.startOffset, location.endOffset]);
      return;
    }
    if (!('tagName' in node) || node.namespaceURI !== HTML_NAMESPACE || !tags.has(node.tagName)) {
      invalid('unsupported markup. Paste plain text and use the editor formatting controls.');
    }
    const location = node.sourceCodeLocation;
    if (!location?.startTag || (!voidTags.has(node.tagName) && !location.endTag)) invalid('the poem contains unbalanced HTML.');
    coverage.push([location.startTag.startOffset, location.startTag.endOffset]);
    if (location.endTag) coverage.push([location.endTag.startOffset, location.endTag.endOffset]);

    for (const { name, value, namespace, prefix } of node.attrs) {
      if (namespace || prefix) invalid('unsupported namespaced markup.');
      if (name === 'class') {
        for (const token of value.split(/\s+/).filter(Boolean)) {
          if (!classes.has(token) && !/^svelte-[a-z0-9]+$/.test(token) && !/^s-[A-Za-z0-9_-]{6,40}$/.test(token) && !/^language-[a-z0-9_+-]+$/i.test(token)) invalid('unsupported poem class.');
        }
      } else if (name === 'aria-label' || name === 'title') {
        if (value.length > MAX_POEM_TITLE_LENGTH) invalid('an accessibility label is too long.');
      } else if (name === 'aria-hidden' && ['true', 'false'].includes(value)) {
        // Explicit empty Notion blocks retain their original accessibility flag.
      } else if (name === 'style') {
        validateStyles(value);
      } else if (node.tagName === 'a' && name === 'href') {
        validateLink(value);
      } else if (node.tagName === 'a' && name === 'rel') {
        if (value.split(/\s+/).some(token => !['noopener', 'noreferrer', 'nofollow'].includes(token))) invalid('unsupported link relationship.');
      } else if (node.tagName === 'a' && name === 'target' && ['_blank', '_self'].includes(value)) {
        // The browser isolates _blank links; renderer links also set noopener.
      } else {
        invalid(`unsupported ${name} attribute.`);
      }
    }
    for (const child of node.childNodes) visit(child, depth + 1);
  }
  for (const node of fragment.childNodes) visit(node, 0);

  // Fragment parsing can silently discard body/html tags, doctypes and stray
  // closing tags. Require every source character to belong to a validated node.
  coverage.sort((a, b) => a[0] - b[0]);
  let offset = 0;
  for (const [start, end] of coverage) {
    if (start !== offset) invalid('unsupported or malformed HTML structure.');
    offset = end;
  }
  if (offset !== html.length) invalid('unsupported or malformed HTML structure.');
  return { title, html };
}

/**
 * Serialize only the selected poem body container, retaining stanza wrappers,
 * Unicode whitespace and emphasis. Svelte hydration comments and temporary
 * editing attributes are not part of the document. This never mutates the live
 * editable DOM, so browser selection and native undo remain intact.
 * @param {HTMLElement} element
 * @returns {string}
 */
export function serializePoemElement(element) {
  const clone = /** @type {HTMLElement} */ (element.cloneNode(true));
  finishPoemEditing(clone);
  const walker = element.ownerDocument.createTreeWalker(clone, 128 /* SHOW_COMMENT */);
  /** @type {Node[]} */
  const comments = [];
  let comment;
  while ((comment = walker.nextNode())) comments.push(comment);
  for (const node of comments) node.parentNode?.removeChild(node);
  for (const child of clone.querySelectorAll('*')) {
    for (const attribute of [...child.attributes]) {
      if (editorAttributes.has(attribute.name)) child.removeAttribute(attribute.name);
    }
  }
  return validatePoemDocument({ title: '', html: clone.innerHTML }).html;
}

const caretMarker = 'br[data-poem-edit-caret]';
const editingBlocks = '.verse, p, pre, h1, h2, h3, h4, h5, h6, blockquote';

/**
 * A trailing literal LF has no last line box in contenteditable. Browsers then
 * move the next keystroke before it. A non-text, non-editable trailing break
 * gives that final caret a line; browsers consume the break once text fills it.
 * These temporary markers never enter saved HTML or the poem's textContent.
 * Call after taking a cancel snapshot and again when adding a literal newline.
 * @param {HTMLElement} element
 */
export function preparePoemEditing(element) {
  const blocks = [...element.querySelectorAll(editingBlocks)].filter(block => !block.querySelector(editingBlocks));
  if (!blocks.length) blocks.push(element);
  for (const block of blocks) {
    if (block.lastElementChild?.matches(caretMarker)) continue;
    const marker = element.ownerDocument.createElement('br');
    marker.setAttribute('data-poem-edit-caret', '');
    marker.setAttribute('contenteditable', 'false');
    marker.setAttribute('aria-hidden', 'true');
    block.append(marker);
  }
}

/** Remove only transient non-text editing markers, preserving every character.
 * @param {HTMLElement} element
 */
export function finishPoemEditing(element) {
  for (const marker of element.querySelectorAll(caretMarker)) marker.remove();
}

/** Position the starting caret before a final editing marker in the last leaf.
 * @param {HTMLElement} element
 */
export function placePoemCaretAtEnd(element) {
  const blocks = [...element.querySelectorAll(editingBlocks)].filter(block => !block.querySelector(editingBlocks));
  const block = blocks.at(-1) || element;
  const range = element.ownerDocument.createRange();
  const marker = block.lastElementChild;
  if (marker?.matches(caretMarker)) range.setStartBefore(marker);
  else { range.selectNodeContents(block); range.collapse(false); }
  range.collapse(true);
  const selection = element.ownerDocument.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * Insert literal plaintext without interpreting markup or Markdown. insertText
 * turns LF into sibling blocks and normalizes tabs in Chrome/Safari. Escaped
 * insertHTML keeps exact characters AND the browser's native undo transaction.
 * The Range fallback keeps literal text when an engine lacks editing commands.
 * @param {HTMLElement} element
 * @param {string} text
 * @returns {boolean}
 */
export function insertTextAtSelection(element, text) {
  const document = element.ownerDocument;
  const selection = document.getSelection();
  if (!selection?.rangeCount) return false;
  const range = selection.getRangeAt(0);
  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) return false;
  const prefix = range.cloneRange();
  prefix.selectNodeContents(element);
  prefix.setEnd(range.startContainer, range.startOffset);
  const endOffset = prefix.toString().length + text.length;
  if (text.includes('\n')) preparePoemEditing(element);
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  try {
    if (document.execCommand?.('insertHTML', false, escaped)) {
      if (text.endsWith('\n')) {
        // A second Enter can consume the first temporary break. Restore the
        // final line box, then place the caret after every inserted LF instead
        // of the browser's normalized position before the last invisible LF.
        preparePoemEditing(element);
        const walker = document.createTreeWalker(element, 4 /* SHOW_TEXT */);
        let remaining = endOffset;
        let node;
        while ((node = walker.nextNode())) {
          const length = node.textContent?.length || 0;
          if (remaining <= length) {
            const caret = document.createRange();
            caret.setStart(node, remaining);
            caret.collapse(true);
            selection.removeAllRanges();
            selection.addRange(caret);
            break;
          }
          remaining -= length;
        }
      }
      return true;
    }
  } catch { /* Fall back to literal DOM insertion, never to HTML interpretation. */ }
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}
