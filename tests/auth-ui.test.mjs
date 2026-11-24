// Guards for password authentication (added alongside magic links):
// the auth core, the recovery route, and the UI entry points — static
// checks over the SPA source, complementing the headless flow tests run
// at development time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const spa = readFileSync(
  fileURLToPath(new URL('../public/afripulse-preview.html', import.meta.url)), 'utf8');

test('auth core defines all four password functions', () => {
  for (const fn of ['signInWithPassword', 'signUpWithPassword', 'sendPasswordReset', 'saveNewPassword']) {
    assert.match(spa, new RegExp(`async function ${fn}\\(`), `${fn} missing`);
  }
  assert.match(spa, /const PW_MIN=8/);
});

test('the four Supabase auth APIs are actually called', () => {
  for (const api of ['signInWithPassword', 'signUp', 'resetPasswordForEmail', 'updateUser']) {
    assert.match(spa, new RegExp(`sb\\.auth\\.${api}\\(`), `sb.auth.${api} never called`);
  }
});

test('recovery links route to the set-password screen', () => {
  assert.match(spa, /event==='PASSWORD_RECOVERY'/);
  assert.match(spa, /parts\[0\]==='account' && parts\[1\]==='password'/);
  assert.match(spa, /function viewSetPassword\(/);
});

test('sign-in UIs expose password, magic-link and forgot paths', () => {
  assert.match(spa, /id="login-password"/, 'admin password input');
  assert.match(spa, /id="login-magic"/, 'admin magic-link button');
  assert.match(spa, /id="login-forgot"/, 'admin forgot link');
  assert.match(spa, /id="signin-form"/, 'reader sign-in card');
  assert.match(spa, /id="signin-forgot"/, 'reader forgot link');
  assert.match(spa, /name="password"[^>]*autocomplete="new-password"/, 'join password field');
});

test('join keeps the no-password path (magic link) intact', () => {
  assert.match(spa, /sendMagicLink\(email,'#\/me',meta\)/);
});
