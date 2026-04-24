import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function arg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = await readFile(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function mcpRoot() {
  const fromArg = arg('mcp-root');
  const fromEnv = process.env.FIRECRAWL_MCP_SERVER_DIR;
  const candidate = fromArg ?? fromEnv ?? '../firecrawl-mcp-server';
  return isAbsolute(candidate) ? candidate : resolve(repoRoot, candidate);
}

async function importFromMcp(mcpDir, relativePath) {
  const file = join(mcpDir, relativePath);
  if (!existsSync(file)) {
    throw new Error(
      `Missing ${relativePath}. Run pnpm run build in the MCP repo first: ${mcpDir}`
    );
  }
  return import(pathToFileURL(file).href);
}

function textForEvidence(result) {
  return result.results
    .map((item) =>
      [
        item.title,
        item.url,
        item.description,
        item.content,
        ...(item.chunks?.map((chunk) => chunk.text) ?? []),
      ]
        .filter(Boolean)
        .join(' ')
    )
    .join(' ')
    .toLowerCase();
}

function evidenceHit(result, expectedTerms) {
  if (!expectedTerms?.length) return undefined;
  const text = textForEvidence(result);
  return expectedTerms.some((term) => text.includes(term.toLowerCase()));
}

function sourcePolicyAdherent(result, sourcePolicy, helpers) {
  if (!sourcePolicy) return undefined;
  return result.results.every((item) =>
    helpers.domainAllowedByPolicy(helpers.getUrlDomain(item.url), sourcePolicy)
  );
}

async function readTasks(suite) {
  const taskPath = join(repoRoot, 'evals', 'tasks', `${suite}.json`);
  const tasks = JSON.parse(await readFile(taskPath, 'utf8'));
  if (!Array.isArray(tasks)) throw new Error(`Task file must contain an array: ${taskPath}`);
  return tasks;
}

async function runTask(task, strategy, context) {
  const started = performance.now();
  try {
    const result = await context.searchContext(task.input, {
      origin: 'firecrawl-agent-search-context-eval',
      apiKey: process.env.FIRECRAWL_API_KEY,
      apiUrl: process.env.FIRECRAWL_API_URL,
      sourcePolicyStrategy: strategy,
    });
    return {
      taskId: task.id,
      strategy,
      ok: true,
      latencyMs: Math.round(performance.now() - started),
      metrics: {
        resultCount: result.results.length,
        charsReturned: result.usage.charsReturned,
        creditsUsed: result.usage.creditsUsed,
        searchIdCount: result.searchIds?.length ?? 0,
        sourcePolicyAdherent: sourcePolicyAdherent(
          result,
          task.input.sourcePolicy,
          context.helpers
        ),
        coverage: result.results.length > 0,
        evidenceHit: evidenceHit(result, task.expectedTerms),
      },
      firstResult: result.results[0]
        ? {
            title: result.results[0].title,
            url: result.results[0].url,
            source: result.results[0].source,
            category: result.results[0].category,
          }
        : undefined,
      warnings: result.warnings,
    };
  } catch (error) {
    return {
      taskId: task.id,
      strategy,
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarize(records) {
  const ok = records.filter((record) => record.ok);
  const credits = ok.reduce(
    (sum, record) => sum + (record.metrics?.creditsUsed ?? 0),
    0
  );
  const latency = ok.reduce((sum, record) => sum + record.latencyMs, 0);
  const adherenceChecked = ok.filter(
    (record) => record.metrics?.sourcePolicyAdherent !== undefined
  );
  const evidenceChecked = ok.filter(
    (record) => record.metrics?.evidenceHit !== undefined
  );

  return {
    total: records.length,
    passed: ok.length,
    failed: records.length - ok.length,
    totalCreditsUsed: credits,
    avgLatencyMs: ok.length ? Math.round(latency / ok.length) : undefined,
    sourcePolicyAdherence:
      adherenceChecked.length > 0
        ? adherenceChecked.filter(
            (record) => record.metrics?.sourcePolicyAdherent === true
          ).length / adherenceChecked.length
        : undefined,
    evidenceHitRate:
      evidenceChecked.length > 0
        ? evidenceChecked.filter((record) => record.metrics?.evidenceHit === true)
            .length / evidenceChecked.length
        : undefined,
  };
}

function recommendStrategy(records) {
  const strategies = ['compile', 'fanout', 'hybrid'];
  const taskIds = Array.from(new Set(records.map((record) => record.taskId)));
  const viable = strategies.filter((strategy) => {
    const subset = records.filter((record) => record.strategy === strategy);
    return (
      subset.length === taskIds.length &&
      subset.every(
        (record) =>
          record.ok &&
          record.metrics?.coverage !== false &&
          record.metrics?.sourcePolicyAdherent !== false
      )
    );
  });

  if (viable.includes('compile')) return 'compile';

  const scored = strategies.map((strategy) => {
    const subset = records.filter((record) => record.strategy === strategy);
    const ok = subset.filter((record) => record.ok);
    const adherence = ok.filter(
      (record) => record.metrics?.sourcePolicyAdherent !== false
    ).length;
    const coverage = ok.filter((record) => record.metrics?.coverage).length;
    const latency = ok.reduce((sum, record) => sum + record.latencyMs, 0);
    const credits = ok.reduce(
      (sum, record) => sum + (record.metrics?.creditsUsed ?? 0),
      0
    );
    return {
      strategy,
      score: adherence * 100 + coverage * 10 - latency / 10000 - credits,
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.strategy ?? 'compile';
}

async function main() {
  const suite = arg('suite') ?? 'smoke';
  const mcpDir = mcpRoot();

  await loadEnvFile(join(mcpDir, '.env'));
  await loadEnvFile(join(repoRoot, '.env'));

  if (!process.env.FIRECRAWL_API_KEY && !process.env.FIRECRAWL_API_URL) {
    throw new Error('FIRECRAWL_API_KEY or FIRECRAWL_API_URL is required');
  }

  const [{ searchContext }, helpers] = await Promise.all([
    importFromMcp(mcpDir, 'dist/search-context/index.js'),
    importFromMcp(mcpDir, 'dist/search-context/source-policy.js'),
  ]);

  const tasks = await readTasks(suite);
  const strategies =
    suite === 'source-policy'
      ? ['compile', 'fanout', 'hybrid']
      : [arg('strategy') ?? 'compile'];

  const records = [];
  for (const task of tasks) {
    for (const strategy of strategies) {
      records.push(
        await runTask(task, strategy, {
          searchContext,
          helpers,
        })
      );
    }
  }

  const report = {
    suite,
    generatedAt: new Date().toISOString(),
    mcpRoot: mcpDir,
    strategies,
    recommendation:
      suite === 'source-policy' ? recommendStrategy(records) : undefined,
    summary: summarize(records),
    records,
  };

  const reportDir = join(repoRoot, 'evals', 'reports');
  await mkdir(reportDir, { recursive: true });
  const reportPath = join(reportDir, `${timestamp()}-${suite}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        report: reportPath,
        summary: report.summary,
        recommendation: report.recommendation,
      },
      null,
      2
    )
  );

  if (report.summary.failed > 0) process.exitCode = 1;
}

await main();
