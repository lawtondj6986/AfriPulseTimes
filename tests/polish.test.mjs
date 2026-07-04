// Tests for /api/polish — polishArticle prompt/parse. Uses a mock Anthropic client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { polishArticle } from '../api/polish.js';

const article = {
  headline: 'Nigeria hikes benchmark rate',
  standfirst: 'raw lead',
  body: ['Choppy truncated snippet… The post appeared first on BusinessDay.']
};

function mockClient(reply){
  return { messages: { create: async () => ({ content: [{ type:'text', text: typeof reply==='string'?reply:JSON.stringify(reply) }] }) } };
}

test('polishArticle returns a standfirst and a clean body array', async () => {
  const out = await polishArticle(mockClient({ standfirst:'Nigeria raised its rate.', body:['Para one.', 'Para two.'] }), article);
  assert.equal(out.standfirst, 'Nigeria raised its rate.');
  assert.deepEqual(out.body, ['Para one.', 'Para two.']);
});

test('polishArticle drops empty/whitespace paragraphs', async () => {
  const out = await polishArticle(mockClient({ standfirst:'x', body:['Real.', '', '   ', 'Also real.'] }), article);
  assert.deepEqual(out.body, ['Real.', 'Also real.']);
});

test('polishArticle falls back to the original standfirst when the model omits one', async () => {
  const out = await polishArticle(mockClient({ body:['Only a body.'] }), article);
  assert.equal(out.standfirst, 'raw lead');
});

test('polishArticle tolerates prose around the JSON', async () => {
  const out = await polishArticle(mockClient('Here you go:\n{"standfirst":"s","body":["b"]}\nThanks!'), article);
  assert.deepEqual(out.body, ['b']);
});

test('polishArticle throws when the body is missing or empty', async () => {
  await assert.rejects(() => polishArticle(mockClient({ standfirst:'s' }), article), /usable body/);
  await assert.rejects(() => polishArticle(mockClient({ standfirst:'s', body:[] }), article), /usable body/);
});

test('polishArticle throws when there is no JSON at all', async () => {
  await assert.rejects(() => polishArticle(mockClient('no json here'), article), /no JSON/);
});
