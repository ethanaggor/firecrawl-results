import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const evalsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const repoRoot = resolve(evalsDir, '..');

export function fromRepo(...parts) {
  return resolve(repoRoot, ...parts);
}

export function fromEvals(...parts) {
  return resolve(evalsDir, ...parts);
}
