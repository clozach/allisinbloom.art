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
