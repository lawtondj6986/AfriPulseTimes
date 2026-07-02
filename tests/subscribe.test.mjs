// Tests for /api/subscribe — Buttondown newsletter registration.
process.env.BUTTONDOWN_API_KEY = 'bd_test_key';

import { test } from 'node:test';
import assert from 'node:assert/strict';
// Dynamic import AFTER setting env above (static imports are hoisted).
const { saveToButtondown } = await import('../api/subscribe.js');

test('saveToButtondown reports a created subscriber', async () => {
  let req = null;
  globalThis.fetch = async (url, opts) => { req = { url, body: JSON.parse(opts.body), headers: opts.headers }; return { status: 201, text: async () => '{}' }; };
  const r = await saveToButtondown('reader@example.com', 'fr');
  assert.equal(r, 'created');
  assert.equal(req.body.email_address, 'reader@example.com');
  assert.equal(req.body.metadata.language, 'fr');
  assert.match(req.headers.Authorization, /^Token /);
});

test('saveToButtondown treats an existing address as a duplicate', async () => {
  globalThis.fetch = async () => ({ status: 400, text: async () => 'email already subscribed' });
  const r = await saveToButtondown('dupe@example.com', 'en');
  assert.equal(r, 'duplicate');
});

test('saveToButtondown throws on an unexpected error status', async () => {
  globalThis.fetch = async () => ({ status: 500, text: async () => 'server error' });
  await assert.rejects(() => saveToButtondown('x@example.com', 'en'), /buttondown 500/);
});
