// Tests for /api/translate — translateArticle prompt/parse across 5 languages
// plus the optional "Key points" summaries. Uses an injected mock Anthropic client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateArticle } from '../api/translate.js';

const article = { headline:'Test headline', standfirst:'Test lead', body:['Para one.', 'Para two.'] };

function mockClient(reply){
  return { messages: { create: async () => ({ content: [{ type:'text', text: JSON.stringify(reply) }] }) } };
}

test('translateArticle returns all four target languages', async () => {
  const reply = {
    fr:{headline:'FR',standfirst:'FR',body:['a','b']},
    ar:{headline:'AR',standfirst:'AR',body:['a','b']},
    sw:{headline:'SW',standfirst:'SW',body:['a','b']},
    pt:{headline:'PT',standfirst:'PT',body:['a','b']}
  };
  const out = await translateArticle(mockClient(reply), article);
  assert.ok(out.fr && out.ar && out.sw && out.pt);
  assert.equal(out.sw.body.length, 2);
});

test('translateArticle includes summaries when present', async () => {
  const reply = {
    fr:{headline:'FR',standfirst:'FR',body:['a','b']}, ar:{headline:'AR',standfirst:'AR',body:['a','b']},
    sw:{headline:'SW',standfirst:'SW',body:['a','b']}, pt:{headline:'PT',standfirst:'PT',body:['a','b']},
    summaries:{ en:['e1','e2','e3'], fr:['f1','f2','f3'], ar:['a1','a2','a3'], sw:['s1','s2','s3'], pt:['p1','p2','p3'] }
  };
  const out = await translateArticle(mockClient(reply), article);
  assert.ok(out.summaries);
  assert.deepEqual(out.summaries.en, ['e1','e2','e3']);
  assert.equal(out.summaries.sw.length, 3);
});

test('translateArticle tolerates a reply without summaries (older behaviour)', async () => {
  const reply = {
    fr:{headline:'FR',standfirst:'FR',body:['a','b']}, ar:{headline:'AR',standfirst:'AR',body:['a','b']},
    sw:{headline:'SW',standfirst:'SW',body:['a','b']}, pt:{headline:'PT',standfirst:'PT',body:['a','b']}
  };
  const out = await translateArticle(mockClient(reply), article);
  assert.equal(out.summaries, undefined);
});

test('translateArticle throws when a language is missing', async () => {
  const reply = { fr:{}, ar:{}, sw:{} }; // no pt
  await assert.rejects(() => translateArticle(mockClient(reply), article), /missing a language/);
});
