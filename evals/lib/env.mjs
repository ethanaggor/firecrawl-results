import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fromRepo } from './paths.mjs';

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return undefined;
  const index = trimmed.indexOf('=');
  if (index === -1) return undefined;
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

export async function loadRepoEnv() {
  const path = fromRepo('.env');
  if (!existsSync(path)) return { loaded: false, path };
  const text = await readFile(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed) process.env[parsed.key] = parsed.value;
  }
  return { loaded: true, path };
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function optionalEnv(name) {
  return process.env[name] || undefined;
}

export function redact(value) {
  if (!value) return value;
  if (value.length <= 8) return '***';
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}
