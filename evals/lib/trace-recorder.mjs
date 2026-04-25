import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fromEvals } from './paths.mjs';

export function runDir(runId) {
  return fromEvals('runs', runId);
}

export async function ensureRunDirs(dir) {
  for (const child of ['schemas', 'calls', 'raw', 'normalized', 'scoring']) {
    await mkdir(join(dir, child), { recursive: true });
  }
}

export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function appendTrace(dir, event) {
  const path = join(dir, 'trace.jsonl');
  const line = `${JSON.stringify({ time: new Date().toISOString(), ...event })}\n`;
  const previous = existsSync(path) ? await readFile(path, 'utf8') : '';
  await writeFile(path, previous + line, 'utf8');
}

export async function readTrace(dir) {
  const path = join(dir, 'trace.jsonl');
  if (!existsSync(path)) return [];
  const text = await readFile(path, 'utf8');
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
