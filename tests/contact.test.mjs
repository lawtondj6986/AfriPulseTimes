// Tests for /api/contact — investor-enquiry email notification (Resend).
// Env is set BEFORE importing so the module reads it (node --test runs each
// test file in its own process, so this env is isolated to this file).
process.env.RESEND_API_KEY = 're_test_key';
process.env.LEADS_NOTIFY_TO = 'founder@afripulsetimes.com, partner@afripulsetimes.com';
process.env.LEADS_NOTIFY_FROM = 'AfriPulse Times <alerts@afripulsetimes.com>';

import { test } from 'node:test';
import assert from 'node:assert/strict';
// Dynamic import AFTER setting env above — static imports are hoisted and would
// run before the env assignments, so the module would capture empty values.
const { notifyNewLead } = await import('../api/contact.js');

const lead = {
  name: 'Jane <b>Okafor</b>', email: 'jane@fund.com', organisation: 'Sahel & Co',
  interest: 'investor', message: 'Line1\nLine2 <script>', language: 'fr'
};

test('notifyNewLead posts a well-formed Resend request', async () => {
  let req = null;
  globalThis.fetch = async (url, opts) => { req = { url, body: JSON.parse(opts.body), headers: opts.headers }; return { status: 200, text: async () => '{"id":"e1"}' }; };

  const result = await notifyNewLead(lead);
  assert.equal(result, 'sent');
  assert.equal(req.url, 'https://api.resend.com/emails');
  assert.equal(req.headers.Authorization, 'Bearer re_test_key');
  assert.deepEqual(req.body.to, ['founder@afripulsetimes.com', 'partner@afripulsetimes.com']);
  assert.equal(req.body.reply_to, 'jane@fund.com');
  assert.match(req.body.subject, /investor enquiry/i);
});

test('notifyNewLead HTML-escapes untrusted lead fields (no injection)', async () => {
  let body = null;
  globalThis.fetch = async (url, opts) => { body = JSON.parse(opts.body); return { status: 200, text: async () => '' }; };
  await notifyNewLead(lead);
  assert.ok(body.html.includes('Jane &lt;b&gt;Okafor&lt;/b&gt;'));
  assert.ok(!body.html.includes('<script>'));
});

test('notifyNewLead throws on a non-2xx Resend response (handler swallows it)', async () => {
  globalThis.fetch = async () => ({ status: 422, text: async () => '{"message":"domain not verified"}' });
  await assert.rejects(() => notifyNewLead(lead), /resend 422/);
});
