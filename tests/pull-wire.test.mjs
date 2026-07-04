// Tests for /api/pull-wire vertical classification.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessVertical, guessGeo, extractImage, decodeEntities, stripBoilerplate, htmlToParagraphs, smartTrim, cleanTitle, buildRows } from '../api/pull-wire.js';

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

test('guessGeo infers region + country, with a capital dateline when named', () => {
  assert.deepEqual(guessGeo('Lagos traders react to the new tariff'),
    { region:'west-africa', country:'Nigeria', city:'Lagos' });
  assert.deepEqual(guessGeo('Nairobi startup scene heats up'),
    { region:'east-africa', country:'Kenya', city:'Nairobi' });
  // Country named but no capital → region + country, no city dateline.
  const g = guessGeo('Zambia copper output climbs this quarter');
  assert.equal(g.region, 'southern-africa'); assert.equal(g.country, 'Zambia'); assert.equal(g.city, null);
  // Multi-word capital.
  assert.equal(guessGeo('Cape Town water crisis eases').city, 'Cape Town');
  assert.equal(guessGeo('Addis Ababa hosts the AU summit').region, 'east-africa');
});

test('guessGeo uses word boundaries — no false hits inside longer words', () => {
  assert.equal(guessGeo('Global normalisation of trade policy'), null);   // "mali" inside "normalisation"
  assert.equal(guessGeo('A story about nothing geographic at all'), null);
  // "Niger" must not be matched by "Nigeria".
  assert.equal(guessGeo('Nigeria budget passes').country, 'Nigeria');
});

test('buildRows geo-tags wire stories: dateline, country tag, and region', () => {
  const items = [{ title: 'Kinshasa cobalt exporters face new rules', link: 'https://x/1',
    contentSnippet: 'Miners in the DRC capital weigh the impact.' }];
  const rows = buildRows(items, { label: 'Wire Co' }, new Set());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].region, 'central-africa');
  assert.equal(rows[0].payload.dateline, 'Kinshasa');
  assert.ok(rows[0].payload.tags.includes('DRC'), 'country added to tags');
});

test('buildRows leaves dateline "Wire" and region null when no geography is found', () => {
  const items = [{ title: 'An abstract essay on productivity habits', link: 'https://x/2',
    contentSnippet: 'No places are mentioned here whatsoever.' }];
  const rows = buildRows(items, { label: 'Wire Co' }, new Set());
  assert.equal(rows[0].region, null);
  assert.equal(rows[0].payload.dateline, 'Wire');
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

// ── wire text cleanup ──

test('decodeEntities resolves named and numeric HTML entities', () => {
  assert.equal(decodeEntities('AT&amp;T said &quot;yes&quot; &#8212; today'), 'AT&T said "yes" — today');
  assert.equal(decodeEntities('caf&#233; &#x263A;'), 'café ☺');
});

test('stripBoilerplate removes feed tails and share/subscribe cruft', () => {
  assert.equal(stripBoilerplate('Real news here. The post Foo appeared first on BusinessDay.'), 'Real news here.');
  assert.equal(stripBoilerplate('A story. Continue reading at our site.'), 'A story.');
  assert.equal(stripBoilerplate('News […]'), 'News');
});

test('htmlToParagraphs splits block tags into clean paragraphs and strips markup', () => {
  const paras = htmlToParagraphs('<p>First para with <b>bold</b>.</p><p>Second para.</p>');
  assert.deepEqual(paras, ['First para with bold.', 'Second para.']);
});

test('htmlToParagraphs returns [] for empty input', () => {
  assert.deepEqual(htmlToParagraphs(''), []);
  assert.deepEqual(htmlToParagraphs(null), []);
});

test('smartTrim keeps whole words/sentences and never exceeds max+ellipsis', () => {
  assert.equal(smartTrim('Short one.', 100), 'Short one.');
  const long = 'This is a first sentence. This is a much longer second sentence that should be trimmed away entirely.';
  const out = smartTrim(long, 40);
  assert.ok(out.length <= 41, 'within bound');
  assert.ok(!/\bshould\b/.test(out) || out.endsWith('…'), 'trimmed cleanly');
});

test('cleanTitle strips a trailing source-name suffix but keeps real dashes', () => {
  assert.equal(cleanTitle('Naira gains as market rallies | BusinessDay', 'BusinessDay'), 'Naira gains as market rallies');
  assert.equal(cleanTitle('Nigeria hikes rates - central bank move', 'BusinessDay'), 'Nigeria hikes rates - central bank move');
  assert.equal(cleanTitle('Kenya&#8217;s bank holds rate', 'Business Daily'), 'Kenya’s bank holds rate'); // entities decoded
});

test('buildRows produces multi-paragraph body from content:encoded and clean standfirst', () => {
  const items = [{
    title: 'DRC lifts cobalt export rules | MiningWeekly',
    link: 'https://ex.com/a',
    contentEncoded: '<p>The DRC government eased export rules on cobalt this week.</p><p>Officials said output would rise. The post appeared first on MiningWeekly.</p>',
    isoDate: '2026-07-01T00:00:00.000Z'
  }];
  const rows = buildRows(items, { label: 'MiningWeekly' }, new Set());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].headline, 'DRC lifts cobalt export rules');       // suffix stripped
  assert.equal(rows[0].payload.body.length, 2);                          // two paragraphs
  assert.ok(!/appeared first on/i.test(rows[0].body), 'boilerplate stripped');
  assert.equal(rows[0].vertical, 'mining');
});
