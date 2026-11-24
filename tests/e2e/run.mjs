// Runs every end-to-end script in this folder, one after another.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const only = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && f !== 'run.mjs' && !f.startsWith('_'))
  .filter((f) => !only.length || only.includes(f.replace(/\.mjs$/, ''))).sort();

let failed = [];
for (const f of files) {
  const r = spawnSync(process.execPath, [dir + f], { encoding: 'utf8' });
  const lines = (r.stdout || '').trim().split('\n');
  const tally = lines[lines.length - 1] || '(no output)';
  const ok = r.status === 0;
  console.log((ok ? 'ok   ' : 'FAIL ') + f.replace(/\.mjs$/, '').padEnd(12) + tally);
  if (!ok) { failed.push(f); console.log(lines.filter((l) => l.startsWith('FAIL')).join('\n') || (r.stderr || '').slice(-600)); }
}
console.log('\n' + (files.length - failed.length) + '/' + files.length + ' scripts passed');
process.exit(failed.length ? 1 : 0);
