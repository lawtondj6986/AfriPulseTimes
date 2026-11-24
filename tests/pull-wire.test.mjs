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

test('buildRows sends wire stories to the review gate (not straight to the front page)', () => {
  const items = [{ title: 'Any wire story headline here', link: 'https://x/gate',
    contentSnippet: 'Some body text.' }];
  const rows = buildRows(items, { label: 'Wire Co' }, new Set());
  assert.equal(rows[0].status, 'review', 'row status must be review');
  assert.equal(rows[0].payload.status, 'review', 'payload status must be review');
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

// ── section classifier: real headlines that were misfiled in production ──
import { isJunkText, correctionFor } from '../api/pull-wire.js';

test('classifier matches whole words, so real misfiled headlines land correctly', () => {
  const cases = [
    // was Markets: "frustrate" contains "rate"
    ['New Zealand’s Mitchell, Phillips frustrate India as first Test ends in draw', 'New Zealand rescued a draw on the final day, surviving 120 overs to finish on 239-5.', 'sports'],
    // was Front Page: no tennis vocabulary at all
    ['Alcaraz storms past world number one Zverev to win maiden ATP Finals title', '', 'sports'],
    // was Culture: "counterpart" contains "art"
    ['Kenya: Ruto, Tshisekedi Agree to Restore Full Diplomatic Relations Between Kenya and DR Congo', 'President William Ruto and his counterpart agreed to restore full diplomatic relations.', 'politics'],
    ['Sudan: Drones Strikes Hit UN Building in Residential Area of Khartoum', 'The drones targeted Khartoum.', 'politics'],
    // was Politics
    ['NPFL Roundup: Rivers, Barau record big wins as Rangers maintain lead', 'Rivers United and Barau FC recorded emphatic victories.', 'sports'],
    ['Pochettino’s nightmare start as Man U thrashed by Liverpool', '', 'sports'],
    // was Markets: "West Bank" is not a bank
    ['Israeli attacks on medics in occupied West Bank surge by 350%: Rights group', 'Medics face escalation in violence from soldiers and settlers.', 'politics'],
    ['Aradel, Zenith Bank, NASCON top stock pick this week', 'A stock investment guide.', 'markets'],
    ['Kenya’s internet metering bill raises privacy and affordability concerns', '', 'tech'],
    ['EDITORIAL: Sustaining the Flamingos’ flourish', 'The Under-17 girls are worthy ambassadors.', 'opinions'],
    ['Makinde: Bride or side-chick?, By Wole Olaoye', '', 'opinions'],
    ['Nigeria: At least 24 Dead After Boat Capsizes', 'The boat carrying mourners overturned.', 'front']
  ];
  for (const [title, desc, expected] of cases) {
    assert.equal(guessVertical(title, desc), expected, `"${title}" → expected ${expected}`);
  }
});

test('classifier: fragments never match, one weak body word decides nothing, hints break silence', () => {
  assert.equal(guessVertical('Party department starts artillery partnership', ''), 'front', 'no "art" inside other words');
  assert.equal(guessVertical('Evening roundup', 'The firm separately noted progress.'), 'front', 'one weak body word stays on the front page');
  assert.equal(guessVertical('Quarterly roundup', '', 'tech'), 'tech', 'a feed hint decides when nothing else does');
  assert.equal(guessVertical('Evening roundup', 'The awards were presented on Saturday.'), 'front', 'a listed plural is not counted twice');
});

test('isJunkText catches leaked styling, sponsor lines and repeated headlines', () => {
  assert.ok(isJunkText('/* Scoped resets */.tc-daily-wrapper * { box-sizing: border-box; }', 'H'));
  assert.ok(isJunkText('In partnership with', 'H'));
  assert.ok(isJunkText('Don Toliver concert chaos after ‘substance’ let off in crowd', 'Don Toliver concert chaos after ‘substance’ let off in crowd'));
  assert.ok(isJunkText('<div class="x">hello there world</div>', 'H'));
  assert.ok(!isJunkText('Rescuers search for 30 people still missing.', 'Indonesia fire'));
});

test('correctionFor re-files a misfiled wire story and blanks a junk summary; leaves the rest alone', () => {
  const row = { id: 1, headline: 'New Zealand’s Mitchell, Phillips frustrate India as first Test ends in draw', dek: 'x', vertical: 'markets',
    payload: { source: 'rss', vertical: 'markets', sourceLabel: 'Al Jazeera', kicker: 'Business & Markets · Al Jazeera',
      tags: ['Al Jazeera', 'Live wire', 'Business & Markets'], standfirst: 'New Zealand rescued a draw on the final day.', body: ['New Zealand rescued a draw.'] } };
  const patch = correctionFor(row);
  assert.equal(patch.vertical, 'sports');
  assert.equal(patch.payload.vertical, 'sports');
  assert.equal(patch.payload.kicker, 'Sports · Al Jazeera');
  assert.deepEqual(patch.payload.tags, ['Al Jazeera', 'Live wire', 'Sports']);
  assert.equal(patch.dek, undefined, 'a good summary is untouched');
  assert.equal(row.payload.vertical, 'markets', 'the input row is not mutated');

  const junk = correctionFor({ headline: 'The Next Wave: instant payment systems', dek: '/* css */ .a{box-sizing:border-box}', vertical: 'tech',
    payload: { source: 'rss', vertical: 'tech', standfirst: '/* css */ .a{box-sizing:border-box}', body: [] } });
  assert.equal(junk.dek, '');
  assert.equal(junk.payload.standfirst, '');

  assert.equal(correctionFor({ headline: 'Super Eagles win the match', vertical: 'sports', payload: { source: 'rss', vertical: 'sports', standfirst: 'A fine win in Uyo for the hosts.' } }), null, 'already right');
  assert.equal(correctionFor({ headline: 'Tennis final report', vertical: 'front', payload: { vertical: 'front' } }), null, 'original reporting is never re-filed');
});
