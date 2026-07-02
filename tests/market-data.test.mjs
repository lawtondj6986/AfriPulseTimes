// Tests for /api/market-data — live African FX for the ticker.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFx } from '../api/market-data.js';

const today = { ngn:1543.2, kes:129.1, zar:18.32, egp:48.7, ghs:15.4, mad:9.98, xof:601.5, etb:139.2 };
const prev  = { ngn:1536.9, kes:129.4, zar:18.20, egp:48.7, ghs:15.1, mad:10.05, xof:598.0, etb:140.0 };

test('buildFx returns one item per known currency', () => {
  assert.equal(buildFx(today, prev).length, 8);
});

test('buildFx formats large rates with thousands separators, small with 2dp', () => {
  const fx = buildFx(today, prev);
  assert.equal(fx.find(i => i.n === 'USD/NGN').v, '1,543');
  assert.equal(fx.find(i => i.n === 'USD/ZAR').v, '18.32');
});

test('buildFx computes day-over-day change with direction', () => {
  const fx = buildFx(today, prev);
  const ngn = fx.find(i => i.n === 'USD/NGN');
  assert.equal(ngn.d, 'up');
  assert.match(ngn.c, /▲ 0\.\d\d%/);
  const kes = fx.find(i => i.n === 'USD/KES');
  assert.equal(kes.d, 'dn');
  assert.match(kes.c, /▼ 0\.\d\d%/);
});

test('buildFx marks unchanged rates flat', () => {
  const fx = buildFx(today, prev);
  const egp = fx.find(i => i.n === 'USD/EGP'); // same in today & prev
  assert.equal(egp.d, 'flat');
});

test('buildFx has no change data when previous is missing', () => {
  const fx = buildFx(today, null);
  assert.ok(fx.every(i => i.d === 'flat' && i.c === '—'));
});

test('buildFx skips missing/invalid rates', () => {
  const fx = buildFx({ ngn:1543.2, kes:0, zar:null, egp:48.7 }, null);
  assert.deepEqual(fx.map(i => i.n), ['USD/NGN', 'USD/EGP']);
});

test('handler returns fx on success and fails safe on upstream error', async () => {
  const { default: handler } = await import('../api/market-data.js');
  const mkRes = () => ({ _h:{}, _s:0, _j:null, setHeader(k,v){this._h[k]=v;}, status(c){this._s=c;return this;}, json(o){this._j=o;return this;} });

  globalThis.fetch = async (u) => ({
    ok: true,
    json: async () => (/@latest|latest\.currency/.test(u)
      ? { date:'2026-07-02', usd: today }
      : { date:'2026-07-01', usd: prev })
  });
  let res = mkRes();
  await handler({ method:'GET' }, res);
  assert.equal(res._s, 200);
  assert.equal(res._j.ok, true);
  assert.equal(res._j.fx.length, 8);

  globalThis.fetch = async () => ({ ok:false, json: async () => ({}) });
  res = mkRes();
  await handler({ method:'GET' }, res);
  assert.equal(res._s, 200);
  assert.equal(res._j.ok, false); // never throws — frontend keeps its fallback
});
