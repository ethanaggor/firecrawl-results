import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fromEvals, fromRepo, repoRoot } from './paths.mjs';
import { optionalEnv, requireEnv, redact } from './env.mjs';

export const providerIds = [
  'firecrawl-original',
  'firecrawl-context',
  'exa',
  'parallel',
  'tavily',
];

export async function readProvider(id) {
  const path = fromEvals('providers', `${id}.json`);
  if (!existsSync(path)) {
    throw new Error(`Unknown provider "${id}". Expected ${path}`);
  }
  const provider = JSON.parse(await readFile(path, 'utf8'));
  return hydrateProvider(provider);
}

export async function readAllProviders() {
  return Promise.all(providerIds.map((id) => readProvider(id)));
}

function hydrateProvider(provider) {
  if (provider.transport === 'stdio') {
    const env = {};
    for (const item of provider.env ?? []) {
      const value = item.required ? requireEnv(item.name) : optionalEnv(item.name);
      if (value) env[item.name] = value;
    }
    return {
      ...provider,
      cwd: resolve(repoRoot, provider.cwd),
      runtimeEnv: env,
    };
  }

  if (provider.transport === 'streamable-http') {
    const url = new URL(provider.url);
    for (const item of provider.query ?? []) {
      const value = item.required ? requireEnv(item.env) : optionalEnv(item.env);
      if (value) url.searchParams.set(item.name, value);
    }

    const headers = {};
    for (const item of provider.headers ?? []) {
      const value = item.required ? requireEnv(item.env) : optionalEnv(item.env);
      if (value) headers[item.name] = `${item.prefix ?? ''}${value}`;
    }

    return {
      ...provider,
      runtimeUrl: url.toString(),
      runtimeHeaders: headers,
    };
  }

  throw new Error(`Unsupported provider transport: ${provider.transport}`);
}

export function sanitizeProvider(provider) {
  const clean = { ...provider };
  delete clean.runtimeEnv;
  delete clean.runtimeHeaders;
  delete clean.runtimeUrl;

  if (provider.transport === 'stdio') {
    clean.cwdExists = existsSync(provider.cwd);
    clean.cwd = provider.cwd?.replace(fromRepo('..'), '..');
    clean.env = (provider.env ?? []).map((item) => ({
      name: item.name,
      required: item.required,
      present: Boolean(process.env[item.name]),
      sample: redact(process.env[item.name]),
    }));
  }

  if (provider.transport === 'streamable-http') {
    const safeUrl = new URL(provider.runtimeUrl ?? provider.url);
    for (const item of provider.query ?? []) {
      if (safeUrl.searchParams.has(item.name)) {
        safeUrl.searchParams.set(item.name, '***');
      }
    }
    clean.url = safeUrl.toString();
    clean.headers = (provider.headers ?? []).map((item) => ({
      name: item.name,
      required: item.required,
      present: Boolean(process.env[item.env]),
      sample: redact(process.env[item.env]),
    }));
  }

  return clean;
}
