#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadRepoEnv } from './lib/env.mjs';
import { fromEvals, repoRoot } from './lib/paths.mjs';
import { countTokens } from './lib/tokenizer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function arg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function mcpRoot() {
  const candidate =
    arg('mcp-root') ?? process.env.FIRECRAWL_MCP_SERVER_DIR ?? '../firecrawl-mcp-server';
  return isAbsolute(candidate) ? candidate : resolve(repoRoot, candidate);
}

async function importFromMcp(mcpDir, relativePath) {
  const file = join(mcpDir, relativePath);
  if (!existsSync(file)) {
    throw new Error(`Missing ${relativePath}. Build the MCP repo first: ${mcpDir}`);
  }
  return import(pathToFileURL(file).href);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function mergeInput(base, override) {
  return {
    ...base,
    ...(override ?? {}),
    sourcePolicy: override?.sourcePolicy ?? base.sourcePolicy,
  };
}

function domain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function textForResult(result) {
  return [
    result.title,
    result.url,
    result.description,
    result.content,
    ...(result.chunks?.map((chunk) => chunk.text) ?? []),
  ]
    .filter(Boolean)
    .join('\n');
}

function evidenceText(results) {
  return results.map(textForResult).join('\n\n');
}

function matchedTerms(text, terms = []) {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term.toLowerCase()));
}

function domainMatches(seen, expected) {
  return seen === expected || seen.endsWith(`.${expected}`);
}

function matchedDomains(results, expected = []) {
  const seen = Array.from(new Set(results.map((result) => domain(result.url)).filter(Boolean)));
  return expected.filter((expectedDomain) =>
    seen.some((seenDomain) => domainMatches(seenDomain, expectedDomain))
  );
}

function sourcePolicyAdherent(results, sourcePolicy) {
  if (!sourcePolicy) return undefined;
  const include = sourcePolicy.includeDomains ?? [];
  const exclude = sourcePolicy.excludeDomains ?? [];
  const seen = results.map((result) => domain(result.url)).filter(Boolean);
  return seen.every((seenDomain) => {
    if (exclude.some((excluded) => domainMatches(seenDomain, excluded))) return false;
    if (!include.length) return true;
    return include.some((included) => domainMatches(seenDomain, included));
  });
}

async function runVariant(task, variant, context) {
  const input = mergeInput(task.input, variant.input);
  const strategy = variant.sourcePolicyStrategy ?? arg('strategy') ?? 'compile';
  const started = performance.now();
  try {
    const result = await context.searchContext(input, {
      origin: 'firecrawl-results-ablation',
      apiKey: process.env.FIRECRAWL_API_KEY,
      apiUrl: process.env.FIRECRAWL_API_URL,
      sourcePolicyStrategy: strategy,
    });
    const evidence = evidenceText(result.results);
    const terms = matchedTerms(evidence, task.expectedTerms);
    const domains = matchedDomains(result.results, task.expectedDomains);
    const resultDomains = Array.from(
      new Set(result.results.map((item) => domain(item.url)).filter(Boolean))
    );

    return {
      taskId: task.id,
      variantId: variant.id,
      strategy,
      input,
      ok: true,
      latencyMs: Math.round(performance.now() - started),
      metrics: {
        resultCount: result.results.length,
        rawResultCount: result.usage?.rawResultCount,
        charsReturned: result.usage?.charsReturned,
        responseTokens: countTokens(result),
        evidenceTokens: countTokens(evidence),
        creditsUsed: result.usage?.creditsUsed,
        searchIdCount: result.searchIds?.length ?? 0,
        sourcePolicyAdherent: sourcePolicyAdherent(result.results, input.sourcePolicy),
        expectedTermHit: terms.length > 0,
        expectedTermsMatched: terms,
        expectedDomainHit: task.expectedDomains ? domains.length > 0 : undefined,
        expectedDomainsMatched: domains,
        expectedDomainCoverage: task.expectedDomains?.length
          ? Number((domains.length / task.expectedDomains.length).toFixed(2))
          : undefined,
        uniqueDomainCount: resultDomains.length,
        domains: resultDomains,
      },
      firstResult: result.results[0]
        ? {
            title: result.results[0].title,
            url: result.results[0].url,
            domain: domain(result.results[0].url),
          }
        : undefined,
      warnings: result.warnings,
      sampleResults: result.results.slice(0, 5).map((item) => ({
        title: item.title,
        url: item.url,
        domain: domain(item.url),
        description: item.description,
        evidencePreview: textForResult(item).slice(0, 700),
      })),
    };
  } catch (error) {
    return {
      taskId: task.id,
      variantId: variant.id,
      strategy,
      input,
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function scoreRecord(record) {
  if (!record.ok) return -1000;
  const m = record.metrics;
  const domainCoverage = m.expectedDomainCoverage;
  const domainScore =
    domainCoverage === undefined ? 0 : domainCoverage === 0 ? -40 : domainCoverage * 60;
  return (
    (m.expectedTermHit ? 20 : 0) +
    (m.sourcePolicyAdherent !== false ? 15 : -20) +
    domainScore +
    Math.min(20, m.resultCount * 2) -
    Math.min(15, (m.responseTokens ?? 0) / 2000)
  );
}

function summarize(records) {
  const byTask = new Map();
  for (const record of records) {
    const items = byTask.get(record.taskId) ?? [];
    items.push(record);
    byTask.set(record.taskId, items);
  }
  return Array.from(byTask, ([taskId, items]) => {
    const ranked = [...items].sort((a, b) => scoreRecord(b) - scoreRecord(a));
    return {
      taskId,
      bestVariant: ranked[0]?.variantId,
      bestStrategy: ranked[0]?.strategy,
      bestScore: Number(scoreRecord(ranked[0]).toFixed(2)),
      variants: ranked.map((item) => ({
        variantId: item.variantId,
        strategy: item.strategy,
        score: Number(scoreRecord(item).toFixed(2)),
        ok: item.ok,
        resultCount: item.metrics?.resultCount,
        responseTokens: item.metrics?.responseTokens,
        evidenceTokens: item.metrics?.evidenceTokens,
        expectedDomainCoverage: item.metrics?.expectedDomainCoverage,
        expectedTermsMatched: item.metrics?.expectedTermsMatched,
        domains: item.metrics?.domains,
        warnings: item.warnings,
      })),
    };
  });
}

await loadRepoEnv();

const mcpDir = mcpRoot();
const [{ searchContext }] = await Promise.all([
  importFromMcp(mcpDir, 'dist/search-context/index.js'),
]);
const tasks = await readJson(fromEvals('tasks', 'firecrawl-ablations.json'));
const records = [];

for (const task of tasks) {
  for (const variant of task.variants) {
    records.push(await runVariant(task, variant, { searchContext }));
  }
}

const report = {
  suite: 'firecrawl-ablations',
  generatedAt: new Date().toISOString(),
  mcpRoot: mcpDir,
  records,
  summary: summarize(records),
};

await mkdir(fromEvals('reports'), { recursive: true });
const reportPath = fromEvals('reports', `${timestamp()}-firecrawl-ablations.json`);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(
  JSON.stringify(
    {
      report: reportPath,
      summary: report.summary,
    },
    null,
    2
  )
);
