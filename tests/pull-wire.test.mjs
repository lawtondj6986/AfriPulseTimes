// Tests for /api/pull-wire vertical classification.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessVertical } from '../api/pull-wire.js';

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
