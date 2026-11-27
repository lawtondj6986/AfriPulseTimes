import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  storyUrl, clip, composeMessage, selectChannels, telegramRequest, whatsappRequests, articleFromRow
} from '../api/broadcast.js';
import {
  normalizePhone, isValidE164, clipSms, composeDigest, smsConfigured, africasTalkingRequest
} from '../api/sms-digest.js';

// ── broadcast: message composition ────────────────────────────
test('storyUrl builds a hash-routed, encoded article link', () => {
  assert.equal(storyUrl('kano-floods', 'https://afri.example/'),
    'https://afri.example/afripulse-preview.html#/article/kano-floods');
  assert.ok(storyUrl('a b', 'https://x').endsWith('/article/a%20b'));
});

test('composeMessage carries brand, vertical, dateline, dek and link', () => {
  const m = composeMessage({ slug: 'lagos-rally', headline: 'Lagos markets rally', vertical: 'markets', dateline: 'Lagos', standfirst: 'Equities climb on a new pact.' }, 'https://x');
  assert.match(m.text, /🌍 AfriPulse Times · Business/);
  assert.match(m.text, /LAGOS · Lagos markets rally/);
  assert.match(m.text, /Equities climb on a new pact\./);
  assert.match(m.text, /Read: https:\/\/x\/afripulse-preview\.html#\/article\/lagos-rally/);
  assert.equal(m.url, 'https://x/afripulse-preview.html#/article/lagos-rally');
});

test('composeMessage clips an overlong standfirst', () => {
  const long = 'x'.repeat(400);
  const m = composeMessage({ slug: 's', headline: 'H', vertical: 'front', standfirst: long }, 'https://x');
  assert.ok(m.text.includes('…'));
  assert.ok(m.text.length < 300);
});

test('composeMessage omits the dateline for wire/unknown origins', () => {
  const m = composeMessage({ slug: 's', headline: 'H', vertical: 'tech', dateline: 'Wire' }, 'https://x');
  assert.ok(!/WIRE ·/.test(m.text));
});

test('articleFromRow prefers typed columns then falls back to payload', () => {
  assert.equal(articleFromRow({ slug: 's', headline: 'Col', payload: { headline: 'Pay' } }).headline, 'Col');
  assert.equal(articleFromRow({ slug: 's', headline: '', payload: { headline: 'Pay', dateline: 'Abuja' } }).headline, 'Pay');
  assert.equal(articleFromRow({ slug: 's', payload: { dateline: 'Abuja' } }).dateline, 'Abuja');
});

test('clip trims whitespace and truncates with an ellipsis', () => {
  assert.equal(clip('  a   b  ', 40), 'a b');
  assert.equal(clip('abcdefgh', 5), 'abcd…');
});

// ── broadcast: channel selection + provider payloads ──────────
test('selectChannels gates each channel on its env vars', () => {
  assert.deepEqual(selectChannels({}), { telegram: false, whatsapp: false });
  assert.deepEqual(selectChannels({ TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: '1' }), { telegram: true, whatsapp: false });
  assert.equal(selectChannels({ WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_ID: 'p', WHATSAPP_TO: '+2348011111111' }).whatsapp, true);
  assert.equal(selectChannels({ WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_ID: 'p' }).whatsapp, false); // missing TO
});

test('telegramRequest targets the bot API with chat_id + text', () => {
  const r = telegramRequest({ TELEGRAM_BOT_TOKEN: 'BOT', TELEGRAM_CHAT_ID: '@ch' }, { text: 'hello' });
  assert.equal(r.url, 'https://api.telegram.org/botBOT/sendMessage');
  const b = JSON.parse(r.init.body);
  assert.equal(b.chat_id, '@ch');
  assert.equal(b.text, 'hello');
});

test('whatsappRequests fan out to every recipient via the Cloud API', () => {
  const rs = whatsappRequests({ WHATSAPP_TOKEN: 'TK', WHATSAPP_PHONE_ID: 'PID', WHATSAPP_TO: '+2348011111111, +2348022222222' }, { text: 'hi' });
  assert.equal(rs.length, 2);
  assert.equal(rs[0].url, 'https://graph.facebook.com/v20.0/PID/messages');
  assert.equal(rs[0].init.headers.Authorization, 'Bearer TK');
  const b = JSON.parse(rs[0].init.body);
  assert.equal(b.messaging_product, 'whatsapp');
  assert.equal(b.to, '+2348011111111');
  assert.equal(b.text.body, 'hi');
});

// ── SMS: Nigeria phone normalization ──────────────────────────
test('normalizePhone converts Nigerian formats to E.164 (+234)', () => {
  const want = '+2348031234567';
  assert.equal(normalizePhone('08031234567'), want);       // national trunk 0
  assert.equal(normalizePhone('8031234567'), want);        // bare national
  assert.equal(normalizePhone('+2348031234567'), want);    // already E.164
  assert.equal(normalizePhone('2348031234567'), want);     // cc, no plus
  assert.equal(normalizePhone('0803 123 4567'), want);     // spaces
  assert.equal(normalizePhone('0803-123-4567'), want);     // dashes
  assert.equal(normalizePhone('00234 803 123 4567'), want); // intl 00 prefix
});

test('normalizePhone honours a different default country code', () => {
  assert.equal(normalizePhone('0712345678', '254'), '+254712345678'); // Kenya
  assert.equal(normalizePhone('', '234'), '');
});

test('isValidE164 accepts real E.164 and rejects local/garbage', () => {
  assert.ok(isValidE164('+2348031234567'));
  assert.ok(!isValidE164('08031234567'));
  assert.ok(!isValidE164('+0123'));
  assert.ok(!isValidE164('notaphone'));
});

// ── SMS: digest composition + provider ────────────────────────
test('composeDigest numbers up to four clipped headlines with a footer', () => {
  const items = [1, 2, 3, 4, 5].map(i => ({ headline: 'Headline number ' + i + ' ' + 'x'.repeat(80) }));
  const d = composeDigest(items, 'https://afri-pulse-times.vercel.app');
  assert.match(d, /AfriPulse Times — today/);
  assert.match(d, /^1\. Headline number 1/m);
  assert.match(d, /^4\. /m);
  assert.ok(!/^5\. /m.test(d), 'caps at four headlines');
  assert.match(d, /Read more: afri-pulse-times\.vercel\.app/);
  assert.match(d, /STOP/);
  assert.ok(d.includes('…'), 'long headlines are clipped');
});

test('smsConfigured requires an Africa\'s Talking key + username', () => {
  assert.equal(smsConfigured({}), false);
  assert.equal(smsConfigured({ AT_API_KEY: 'k' }), false);
  assert.equal(smsConfigured({ AT_API_KEY: 'k', AT_USERNAME: 'u' }), true);
});

test('africasTalkingRequest form-encodes recipients, message and apiKey header', () => {
  const r = africasTalkingRequest({ AT_API_KEY: 'KEY', AT_USERNAME: 'afri', AT_SENDER: 'AfriPulse' },
    ['+2348011111111', '+2348022222222'], 'digest text');
  assert.equal(r.url, 'https://api.africastalking.com/version1/messaging');
  assert.equal(r.init.headers.apiKey, 'KEY');
  const p = new URLSearchParams(r.init.body);
  assert.equal(p.get('username'), 'afri');
  assert.equal(p.get('to'), '+2348011111111,+2348022222222');
  assert.equal(p.get('message'), 'digest text');
  assert.equal(p.get('from'), 'AfriPulse');
});

test('clipSms truncates long text', () => {
  assert.equal(clipSms('a'.repeat(80), 10), 'aaaaaaaaa…');
  assert.equal(clipSms('short', 10), 'short');
});
