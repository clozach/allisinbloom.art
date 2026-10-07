// Render the supported Notion poetry subset without executing source HTML.
// Spaces, tabs, blank blocks and punctuation remain literal; no smart quotes.
export function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function inline(text) {
  const tokens = /\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\*(.+?)\*|_(.+?)_|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|<span\s+underline(?:="true")?>(.*?)<\/span>/g;
  let html = '', from = 0, match;
  while ((match = tokens.exec(text))) {
    html += escapeHtml(text.slice(from, match.index));
    const value = match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5] ?? match[6] ?? match[7] ?? match[9];
    if (match[8]) {
      let safe = false;
      try { safe = ['https:', 'http:', 'mailto:'].includes(new URL(match[8]).protocol); } catch {}
      html += safe ? `<a href="${escapeHtml(match[8])}" rel="noopener noreferrer">${inline(value)}</a>` : escapeHtml(match[0]);
    } else {
      const tag = match[1] || match[2] ? 'strong' : match[3] ? 'del' : match[6] ? 'code' : match[9] ? 'u' : 'em';
      html += `<${tag}>${tag === 'code' ? escapeHtml(value) : inline(value)}</${tag}>`;
    }
    from = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(from));
}

export function renderPoem(markdown) {
  const warnings = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let verse = [], fenced = false;
  function flush() {
    if (verse.length) blocks.push(`<div class="verse stanza">${verse.map(inline).join('\n')}</div>`);
    verse = [];
  }
  for (const line of lines) {
    if (/^\s*```/.test(line)) { flush(); fenced = !fenced; continue; }
    if (fenced) { verse.push(line); continue; }
    if (/^\s*<empty-block\s*\/>\s*$/.test(line)) { flush(); blocks.push('<div class="empty-line" aria-hidden="true"></div>'); continue; }
    if (!line.trim()) { flush(); blocks.push('<div class="empty-line" aria-hidden="true"></div>'); continue; }
    if (/^\s*---\s*$/.test(line)) { flush(); blocks.push('<hr>'); continue; }
    const heading = line.match(/^(#{1,3}) (.*)/);
    if (heading) { flush(); const tag = `h${heading[1].length + 1}`; blocks.push(`<${tag}>${inline(heading[2])}</${tag}>`); continue; }
    if (/^\s*<\/?(?:columns|column)(?:\s[^>]*)?>\s*$/.test(line)) {
      flush();
      blocks.push(line.includes('</') ? '</div>' : `<div class="${line.includes('<columns') ? 'columns' : 'column'}">`);
      continue;
    }
    if (/^\s*<callout\b[^>]*>\s*$/.test(line)) { flush(); blocks.push('<aside class="callout">'); continue; }
    if (/^\s*<\/callout>\s*$/.test(line)) { flush(); blocks.push('</aside>'); continue; }
    if (/^> ?/.test(line)) { flush(); blocks.push(`<blockquote class="verse">${inline(line.replace(/^> ?/, ''))}</blockquote>`); continue; }
    if (/<\/?[a-zA-Z][^>]*>/.test(line) && !/<span\s+underline/.test(line)) warnings.push(`Unsupported Notion markup: ${line.slice(0, 120)}`);
    verse.push(line);
  }
  flush();
  if (fenced) warnings.push('Unclosed code fence');
  return { html: blocks.join('\n'), warnings };
}
