// Tests for /api/pull-wire vertical classification.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessVertical, extractImage } from '../api/pull-wire.js';

test('guessVertical routes headlines to the right vertical', () => {
  const cases = [
    ['Nigeria election results and parliament vote', 'politics'],
    ['Cobalt mining output rises in DRC', 'mining'],
    ['Naira gains as the stock market rallies', 'markets'],
    ['New fintech startup raises a funding round', 'tech'],
    ['Afrobeats album tops the charts', 'culture'],
    ['Super Eagles win the match', 'sports']
  ];
  for (const [title, expected] of cases) {
    assert.equal(guessVertical(title, ''), expected, `"${title}" → expected ${expected}`);
  }
});

test('guessVertical always returns a non-empty string', () => {
  const v = guessVertical('Some entirely unclassifiable string 12345', '');
  assert.equal(typeof v, 'string');
  assert.ok(v.length > 0);
});

test('extractImage reads media:content, thumbnail, enclosure, itunes, and inline <img>', () => {
  assert.equal(
    extractImage({ mediaContent: [{ $: { url: 'http://cdn.x/p.jpg', medium: 'image' } }] }),
    'https://cdn.x/p.jpg', 'media:content + http→https upgrade');
  assert.equal(
    extractImage({ mediaThumbnail: [{ $: { url: 'https://cdn.x/thumb.jpg' } }] }),
    'https://cdn.x/thumb.jpg', 'media:thumbnail');
  assert.equal(
    extractImage({ enclosure: { url: 'https://cdn.x/e.png', type: 'image/png' } }),
    'https://cdn.x/e.png', 'enclosure');
  assert.equal(
    extractImage({ itunesImage: { $: { href: 'https://cdn.x/pod.jpg' } } }),
    'https://cdn.x/pod.jpg', 'itunes:image');
  assert.equal(
    extractImage({ content: '<p>hi</p><img src="https://cdn.x/inline.jpg" alt="x">' }),
    'https://cdn.x/inline.jpg', 'first inline <img>');
});

test('extractImage returns null when there is no image, and ignores non-image media', () => {
  assert.equal(extractImage({ title: 'no media here' }), null);
  assert.equal(extractImage({ enclosure: { url: 'https://cdn.x/a.mp3', type: 'audio/mpeg' } }), null);
  assert.equal(extractImage({ mediaContent: [{ $: { url: 'https://cdn.x/v.mp4', medium: 'video' } }] }), null);
});
