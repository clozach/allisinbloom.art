import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { compile } from 'mdsvex';
import { MAX_POEM_HTML_BYTES, MAX_POEM_TITLE_LENGTH, validatePoemDocument } from '../../src/lib/poemDocument.js';

test('poem validation retains exact text, tabs, entities, trailing spaces and blank blocks', () => {
  const document = {
    title: '  Untitled\u00a0  ',
    html: '<div class="notion-poem svelte-abc123 s-eayoP-27OFfW" aria-label="Untitled"><div class="verse preformatted">*literal* &lt;tag&gt;\n\t  one  \n\n\u00a0two\n\n</div>\n<div class="empty-line" aria-hidden="true"></div><div class="empty-line" aria-hidden="true"></div></div>'
  };
  assert.deepEqual(validatePoemDocument(document), document);
});

test('poem validation accepts current rich formatting, safe links, columns and browser bold/italic', () => {
  const document = {
    title: '',
    html: '<h2>Title</h2><div class="columns"><div class="column"><div class="verse stanza">one\n\t<em>two <strong>three</strong></em> <u>four</u><del>five</del></div></div><div class="column"><blockquote class="verse"><b>bold</b><i>italic</i><span style="font-weight: 700; font-style: italic; text-decoration: underline">word</span><br></blockquote></div></div><aside class="callout"><a href="https://example.com/?a=1&amp;b=2" rel="noopener noreferrer" target="_blank">link</a><a href="mailto:poet@example.com">mail</a><a href="/poems/example">local</a></aside><hr>'
  };
  assert.deepEqual(validatePoemDocument(document), document);
});

test('unsafe or unsupported HTML fails rather than silently losing poem content', () => {
  const hostile = [
    '<script>alert(1)</script>', '<img src="x" onerror="alert(1)">',
    '<p onclick="alert(1)">word</p>', '<p onpointerover="alert(1)">word</p>',
    '<a href="javascript:alert(1)">word</a>', '<a href="java&#x09;script:alert(1)">word</a>',
    '<a href="data:text/html,x">word</a>', '<a href="vbscript:msgbox(1)">word</a>',
    '<svg><a xlink:href="javascript:alert(1)">word</a></svg>',
    '<math><mtext>word</mtext></math>', '<template><p>word</p></template>',
    '<iframe src="https://example.com"></iframe>', '<form><input name="x"></form>',
    '<p style="background:url(https://example.com)">word</p>',
    '<p style="font-weight: expression(alert(1))">word</p>',
    '<p style="position:fixed">word</p>', '<p class="source">word</p>',
    '<div id="poem-editor">word</div>', '<p contenteditable="true">word</p>',
    '<html onclick="alert(1)"><body onload="alert(1)"><p>word</p></body></html>',
    '<!doctype html><p>word</p>', '<p>word</p></div>', '<p>word',
    '<p title="first" title="second">word</p>', '<!-- hidden markup --><p>word</p>',
    '<div><p>word</div>', '<p>\u0000</p>'
  ];
  for (const html of hostile) assert.throws(() => validatePoemDocument({ title: '', html }), /Cannot save this poem/, html);
});

test('validation bounds strings and structure while permitting a deliberately empty poem', () => {
  assert.deepEqual(validatePoemDocument({ title: '', html: '' }), { title: '', html: '' });
  for (const document of [null, [], {}, { title: 3, html: '' }, { title: '', html: {} }]) {
    assert.throws(() => validatePoemDocument(document));
  }
  assert.throws(() => validatePoemDocument({ title: 'x'.repeat(MAX_POEM_TITLE_LENGTH + 1), html: '' }));
  assert.throws(() => validatePoemDocument({ title: '', html: 'x'.repeat(MAX_POEM_HTML_BYTES + 1) }));
  assert.throws(() => validatePoemDocument({ title: '', html: '■'.repeat(Math.ceil(MAX_POEM_HTML_BYTES / 3)) }));
  assert.throws(() => validatePoemDocument({ title: '', html: '<div>'.repeat(130) + 'x' + '</div>'.repeat(130) }));
});

test('every available private draft validates without rewriting a single source character', t => {
  const directory = new URL('../../src/lib/server/drafts/', import.meta.url);
  const files = existsSync(directory) ? readdirSync(directory).filter(file => file.endsWith('.json')) : [];
  if (!files.length) return t.skip('Private sources are intentionally absent from public CI.');
  for (const file of files) {
    const { title, html } = JSON.parse(readFileSync(new URL(file, directory), 'utf8'));
    assert.deepEqual(validatePoemDocument({ title, html }), { title, html }, file);
  }
  t.diagnostic(`${files.length} private drafts retain exact HTML and title.`);
});

test('every public mdsvex poem body validates without rewriting its compiled HTML', async t => {
  const directory = new URL('../../src/routes/poems/', import.meta.url);
  let count = 0;
  for (const name of readdirSync(directory)) {
    const file = new URL(`${name}/+page.svx`, directory);
    if (!existsSync(file)) continue;
    const result = await compile(readFileSync(file, 'utf8'));
    assert.ok(result);
    // mdsvex emits a metadata script plus HTML; code blocks alone use a literal
    // @html template. Public fixtures contain no interpolations or expressions.
    const html = result.code.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/\{@html `([\s\S]*?)`\}/g, (_, body) => body);
    assert.deepEqual(validatePoemDocument({ title: '', html }), { title: '', html }, name);
    count++;
  }
  t.diagnostic(`${count} public poem bodies retain exact compiled HTML.`);
});
