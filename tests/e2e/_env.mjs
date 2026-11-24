// Shared setup for the browser end-to-end scripts.
//
// Each script in this folder is standalone: it serves public/ from a throwaway
// local server with a mocked Supabase client, drives the reader in headless
// Chromium, prints PASS/FAIL per check and exits non-zero on any failure.
//
//   npm run e2e                 run them all
//   node tests/e2e/flow.mjs     run one
//
// CHROMIUM_PATH points at an existing Chromium binary when Playwright's own
// download is not available (otherwise: npx playwright-core install chromium).
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

export { chromium };
export const ROOT = fileURLToPath(new URL('../../public', import.meta.url));
export const LAUNCH = Object.assign({ args: ['--no-sandbox'] },
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

// Screenshots and generated cards land in tests/e2e/.shots (git-ignored).
const SHOTS = fileURLToPath(new URL('./.shots', import.meta.url));
export function shot(name){ fs.mkdirSync(SHOTS, { recursive: true }); return path.join(SHOTS, name); }
