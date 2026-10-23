// The Net's data (src/lib/net/net.json, built by scripts/net/build.mjs): the shape
// the renderer relies on, the size budget, and the Vercel regions at hubs 0..18.
// Nodes 0..h-1 are hubs; nodes h.. are junctions where a cable branches at sea.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NODES } from '../../src/lib/net/nodes.js';

const file = new URL('../../src/lib/net/net.json', import.meta.url);
const raw = fs.readFileSync(file);
const net = JSON.parse(raw.toString('utf8'));
const nodes = net.n.length / 2;
/** @type {{ a: number, b: number, cables: number, terr: number, tether: number }[]} */
const links = [];
for (let i = 0; i < net.l.length; i += 3) {
  const t = net.l[i + 2];
  links.push({ a: net.l[i], b: net.l[i + 1], cables: t >> 2, terr: (t >> 1) & 1, tether: t & 1 });
}

test('net.json parses, has the agreed keys, and stays under 36,000 bytes', () => {
  assert.deepEqual(Object.keys(net), ['v', 'license', 'credits', 'h', 'n', 'l']);
  assert.equal(net.v, 1);
  assert.equal(net.license, 'https://creativecommons.org/licenses/by-nc-sa/3.0/');
  assert.equal(net.credits, '/credits');
  assert.ok(raw.length < 36000, `${raw.length} bytes`);
  assert.doesNotMatch(raw.toString('utf8'), /\s/, 'no whitespace');
});

test('nodes come in lon/lat pairs of whole tenths of a degree, hubs before junctions', () => {
  assert.ok(Number.isInteger(net.h) && net.h >= NODES.length && net.h <= nodes, `h = ${net.h} of ${nodes}`);
  assert.equal(net.n.length % 2, 0);
  for (let i = 0; i < net.n.length; i += 2) {
    assert.ok(Number.isInteger(net.n[i]) && Math.abs(net.n[i]) <= 1800, `lon of node ${i / 2}`);
    assert.ok(Number.isInteger(net.n[i + 1]) && Math.abs(net.n[i + 1]) <= 900, `lat of node ${i / 2}`);
  }
  assert.equal(net.l.length % 3, 0);
});

test('every link joins two different nodes that exist', () => {
  for (const [k, l] of links.entries()) {
    assert.ok(l.a >= 0 && l.a < nodes && l.b >= 0 && l.b < nodes, `link ${k} index out of range`);
    assert.notEqual(l.a, l.b, `link ${k} is a self-loop`);
    assert.ok(l.cables > 0 || l.terr || l.tether, `link ${k} has no kind`);
  }
});

test('a junction appears only in links that carry a cable', () => {
  for (const [k, l] of links.entries()) {
    if (l.a >= net.h || l.b >= net.h) assert.ok(l.cables >= 1, `link ${k} reaches a junction without a cable`);
  }
});

test('hubs 0..18 are the Vercel regions, in order, within 0.15°, each with a link', () => {
  const degree = new Array(nodes).fill(0);
  for (const l of links) {
    degree[l.a]++;
    degree[l.b]++;
  }
  NODES.forEach((node, i) => {
    assert.ok(Math.abs(net.n[2 * i] / 10 - node.lon) <= 0.15, `${node.code} lon`);
    assert.ok(Math.abs(net.n[2 * i + 1] / 10 - node.lat) <= 0.15, `${node.code} lat`);
    assert.ok(degree[i] >= 1, `${node.code} has no link`);
  });
  assert.ok(degree.every((d) => d >= 1), 'every node has a link');
});

test('the globe is full: at least 400 hubs and 400 links, 300 of them submarine', () => {
  assert.ok(net.h >= 400, `${net.h} hubs`);
  assert.ok(links.length >= 400, `${links.length} links`);
  assert.ok(links.filter((l) => l.cables >= 1).length >= 300, 'submarine links');
});
