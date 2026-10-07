import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPoem } from '../../scripts/notion-poem.mjs';

test('poetry keeps literal indentation, stanza breaks, blank blocks and emphasis', () => {
  const { html, warnings } = renderPoem('one\n\t*two*\n  three\n\n<empty-block/>\nlast');
  assert.match(html, /one\n\t<em>two<\/em>\n  three/);
  assert.equal((html.match(/class="empty-line"/g) || []).length, 2);
  assert.deepEqual(warnings, []);
});
test('source HTML and unsafe links are text, not executable markup', () => {
  const { html, warnings } = renderPoem('<script>alert(1)</script>\n[read](javascript:alert)');
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script|href="javascript/);
  assert.equal(warnings.length, 1);
});
test('column and divider structure survives, without rewriting punctuation', () => {
  const { html, warnings } = renderPoem('<columns>\n<column>\n“me”—you\n</column>\n<column>\nother\n---\n</column>\n</columns>');
  assert.match(html, /class="columns"/);
  assert.match(html, /“me”—you/);
  assert.match(html, /<hr>/);
  assert.deepEqual(warnings, []);
});


test('code poetry preserves literal stars, markup, tabs and every blank line', () => {
  const source = '*why?\n\t  [me](https://example.com) <br>\n\n\n■';
  const { html, warnings } = renderPoem(source, 'preformatted');
  assert.equal(html, '<div class="verse preformatted">*why?\n\t  [me](https://example.com) &lt;br&gt;\n\n\n■</div>');
  assert.deepEqual(warnings, []);
});
test('Notion soft breaks and escaped punctuation retain their intended display', () => {
  const { html, warnings } = renderPoem('one<br>two\n<empty-block/>\n\\*snap\\* awake!\n\\[repeat\\]');
  assert.match(html, /one\ntwo/);
  assert.match(html, /\*snap\* awake!/);
  assert.match(html, /\[repeat\]/);
  assert.doesNotMatch(html, /<em>snap/);
  assert.deepEqual(warnings, []);
});
