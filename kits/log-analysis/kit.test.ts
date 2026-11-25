// Tests for the log-analysis kit (bun test kits/log-analysis).
//
// The seeded values come from tools/seeded-pii.json, written by the generator
// as it invents them, so "nothing survives" is checked against ground truth,
// not against the scrub's own regexes.

import { describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildKitZip, KIT_FILES, ZIP_ROOT } from '../../scripts/build-log-kit.mjs';

const KIT = new URL('./', import.meta.url).pathname;
const read = (f: string) => readFileSync(join(KIT, f), 'utf8');
const seeded: string[] = JSON.parse(read('tools/seeded-pii.json'));
const tmp = mkdtempSync(join(tmpdir(), 'log-kit-'));

function run(cmd: string[]) {
  const r = Bun.spawnSync(cmd, { stdout: 'pipe', stderr: 'pipe' });
  if (r.exitCode !== 0) throw new Error(`${cmd.join(' ')} exited ${r.exitCode}: ${r.stderr.toString()}`);
  return r.stdout.toString();
}

function scrubWithPython(out: string) {
  run(['python3', '-I', join(KIT, 'scrub/scrub.py'), join(KIT, 'sample-logs/app.log'), out]);
  return readFileSync(out, 'utf8');
}

describe('sample log', () => {
  test('has about 200 lines and every seeded value really is in it', () => {
    const log = read('sample-logs/app.log');
    const lines = log.trimEnd().split('\n').length;
    expect(lines).toBeGreaterThanOrEqual(180);
    expect(lines).toBeLessThanOrEqual(220);
    expect(seeded.length).toBeGreaterThan(20);
    for (const v of seeded) expect(log, v).toContain(v);
    // Every kind the page promises is seeded.
    for (const re of [/@example\./, /^\d+\.\d+\.\d+\.\d+$/, /^usr_/, /^eyJ/, /^demo_key_/, /^[0-9 -]{15,19}$/]) {
      expect(seeded.some((v) => re.test(v)), String(re)).toBe(true);
    }
  });
});

describe('scrub', () => {
  test('no seeded private value survives in app.scrubbed.log', () => {
    const scrubbed = read('sample-logs/app.scrubbed.log');
    const survivors = seeded.filter((v) => scrubbed.includes(v));
    expect(survivors).toEqual([]);
  });

  test('the committed app.scrubbed.log is what scrub.py writes today', () => {
    expect(scrubWithPython(join(tmp, 'py.log'))).toBe(read('sample-logs/app.scrubbed.log'));
  });

  test('scrub.ps1 and scrub.py list the same rules in the same order', () => {
    const py = [...read('scrub/scrub.py').matchAll(/^\s*\("([^"]+)", r"([^"]+)", "([^"]+)"\),$/gm)].map((m) => m.slice(1));
    const ps = [...read('scrub/scrub.ps1').matchAll(/^\s*@\('([^']+)', '([^']+)', '([^']+)'\),?$/gm)].map((m) => m.slice(1));
    expect(py.length).toBeGreaterThanOrEqual(6);
    expect(ps).toEqual(py);
  });

  // CI (ubuntu-latest) has pwsh, so there a missing pwsh fails the run. Locally
  // the test is skipped with a warning when pwsh is not installed.
  const pwsh = Bun.which('pwsh');
  if (!pwsh && !process.env.CI) console.warn('WARNING: pwsh not on PATH; scrub.ps1 output parity NOT tested here');
  test.skipIf(!pwsh && !process.env.CI)('scrub.ps1 writes byte-identical output to scrub.py', () => {
    expect(pwsh, 'pwsh must be installed in CI').toBeTruthy();
    const out = join(tmp, 'ps.log');
    run([pwsh!, '-NoProfile', '-NonInteractive', '-File', join(KIT, 'scrub/scrub.ps1'), '-InputPath', join(KIT, 'sample-logs/app.log'), '-OutputPath', out]);
    const py = join(tmp, 'py-for-ps.log');
    scrubWithPython(py);
    expect(readFileSync(out).equals(readFileSync(py))).toBe(true);
  });
});

describe('zip', () => {
  test('holds exactly the kit files, byte for byte, and passes a CRC check', () => {
    const { out } = buildKitZip(join(tmp, 'kit.zip'));
    const listing = run([
      'python3', '-I', '-c',
      'import sys,zipfile,json;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(json.dumps({n:z.read(n).decode() for n in z.namelist()}))',
      out,
    ]);
    const entries = JSON.parse(listing);
    expect(Object.keys(entries)).toEqual(KIT_FILES.map((f) => ZIP_ROOT + f));
    for (const f of KIT_FILES) expect(entries[ZIP_ROOT + f], f).toBe(read(f));
  });
});
