#!/usr/bin/env node
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fromRepo } from './lib/paths.mjs';
import { runDir } from './lib/trace-recorder.mjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    out[key] = argv[i + 1];
    i += 1;
  }
  return out;
}

function scrubSecrets(value) {
  if (Array.isArray(value)) return value.map(scrubSecrets);
  if (!value || typeof value !== 'object') return value;

  const clean = {};
  for (const [key, child] of Object.entries(value)) {
    if (['runtimeEnv', 'runtimeHeaders', 'runtimeUrl', 'sample'].includes(key)) continue;
    clean[key] = scrubSecrets(child);
  }
  return clean;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function copySanitized(source, target) {
  const info = await stat(source);
  if (info.isDirectory()) {
    await mkdir(target, { recursive: true });
    const entries = await readdir(source, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules') continue;
      await copySanitized(join(source, entry.name), join(target, entry.name));
    }
    return;
  }

  await mkdir(join(target, '..'), { recursive: true });
  if (source.endsWith('.json')) {
    try {
      const value = scrubSecrets(await readJson(source));
      await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
      return;
    } catch {
      // Fall through to byte-for-byte copy for non-JSON files with a .json suffix.
    }
  }
  await copyFile(source, target);
}

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function average(values) {
  const nums = values.map(number).filter((value) => value !== undefined);
  if (!nums.length) return null;
  return Number((nums.reduce((sum, value) => sum + value, 0) / nums.length).toFixed(2));
}

function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(value);
  }
  return groups;
}

async function answerPreview(dir, report) {
  const answerPath = report.artifacts?.answer ? join(dir, report.artifacts.answer) : undefined;
  if (!answerPath || !existsSync(answerPath)) return '';
  const answer = await readFile(answerPath, 'utf8');
  return answer
    .trim()
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 520);
}

async function publishRun(runId) {
  const source = runDir(runId);
  const reportPath = join(source, 'report.json');
  if (!existsSync(reportPath)) {
    throw new Error(`Missing report.json. Finish the run first: ${source}`);
  }

  const report = scrubSecrets(await readJson(reportPath));
  const target = fromRepo('docs', 'data', 'runs', runId);
  await copySanitized(source, target);

  return {
    runId,
    source,
    target,
    report,
    answerPreview: await answerPreview(source, report),
  };
}

function runSummary(item) {
  const report = item.report;
  const metrics = report.metrics ?? {};
  const score = report.semanticScore ?? {};
  const provider = report.manifest?.provider ?? {};
  const task = report.manifest?.task ?? {};

  return {
    runId: item.runId,
    provider: provider.id,
    providerName: provider.name,
    taskId: task.id,
    taskFamily: task.family,
    question: task.question,
    answerPreview: item.answerPreview,
    metrics,
    semanticScore: score,
    artifacts: {
      report: `data/runs/${item.runId}/report.json`,
      trace: `data/runs/${item.runId}/trace.jsonl`,
      tools: `data/runs/${item.runId}/schemas/tools.json`,
      answer: `data/runs/${item.runId}/${report.artifacts?.answer ?? 'scoring/final-answer.md'}`,
      score: `data/runs/${item.runId}/${report.artifacts?.score ?? 'scoring/agent-score.json'}`,
    },
  };
}

function summarizeProviders(runs) {
  const byProvider = groupBy(runs, (run) => run.provider);
  return Array.from(byProvider, ([provider, items]) => ({
    provider,
    runs: items.length,
    successRate: average(items.map((run) => (run.semanticScore?.success ? 1 : 0))),
    avgRetrievalQuality: average(items.map((run) => run.semanticScore?.retrievalQualityScore)),
    avgAgentExperience: average(items.map((run) => run.semanticScore?.agentExperienceScore)),
    avgToolCalls: average(items.map((run) => run.metrics?.toolCalls)),
    avgSearchCalls: average(items.map((run) => run.metrics?.searchCalls)),
    avgFetchCalls: average(items.map((run) => run.metrics?.fetchCalls)),
    avgMapCalls: average(items.map((run) => run.metrics?.mapCalls)),
    avgDiscoveryCalls: average(items.map((run) => run.metrics?.discoveryCalls)),
    avgExtractionCalls: average(items.map((run) => run.metrics?.extractionCalls)),
    avgZeroResultSearchCalls: average(items.map((run) => run.metrics?.zeroResultSearchCalls)),
    avgRecoverySignalCalls: average(items.map((run) => run.metrics?.recoverySignalCalls)),
    avgRecoverySignalRate: average(items.map((run) => run.metrics?.recoverySignalRate)),
    avgFirstSearchResults: average(items.map((run) => run.metrics?.firstSearch?.resultCount)),
    avgTrajectoryTokens: average(items.map((run) => run.metrics?.totalTrajectoryTokens)),
    avgRawOutputTokens: average(items.map((run) => run.metrics?.rawOutputTokens)),
    avgNormalizedEvidenceTokens: average(items.map((run) => run.metrics?.normalizedEvidenceTokens)),
    avgEvidenceToRawTokenRatio: average(items.map((run) => run.metrics?.evidenceToRawTokenRatio)),
    avgRawOutputOutlierCalls: average(items.map((run) => run.metrics?.rawOutputOutlierCalls)),
    avgLatencyMs: average(items.map((run) => run.metrics?.totalCallLatencyMs)),
    totalFailedCalls: items.reduce((sum, run) => sum + (run.metrics?.failedCalls ?? 0), 0),
    footprintTokens: items[0]?.metrics?.contract?.totalMcpFootprintTokens ?? null,
    searchOnlyFootprintTokens: items[0]?.metrics?.contract?.searchOnlyFootprintTokens ?? null,
    searchFetchFootprintTokens: items[0]?.metrics?.contract?.searchFetchFootprintTokens ?? null,
    toolCount: items[0]?.metrics?.contract?.toolCount ?? null,
    hasFreshnessControl: Boolean(items[0]?.metrics?.contract?.hasFreshnessControl),
    hasSourcePolicyControl: Boolean(items[0]?.metrics?.contract?.hasSourcePolicyControl),
    hasContentBudgetControl: Boolean(items[0]?.metrics?.contract?.hasContentBudgetControl),
    hasUsageMetadata: Boolean(items[0]?.metrics?.contract?.hasUsageMetadata),
  })).sort((a, b) => a.provider.localeCompare(b.provider));
}

function summarizeTasks(runs) {
  const byTask = groupBy(runs, (run) => run.taskId);
  return Array.from(byTask, ([taskId, items]) => ({
    taskId,
    family: items[0]?.taskFamily,
    question: items[0]?.question,
    runs: items.length,
    avgRetrievalQuality: average(items.map((run) => run.semanticScore?.retrievalQualityScore)),
    avgAgentExperience: average(items.map((run) => run.semanticScore?.agentExperienceScore)),
    avgTrajectoryTokens: average(items.map((run) => run.metrics?.totalTrajectoryTokens)),
    avgToolCalls: average(items.map((run) => run.metrics?.toolCalls)),
    avgRecoverySignalCalls: average(items.map((run) => run.metrics?.recoverySignalCalls)),
    avgZeroResultSearchCalls: average(items.map((run) => run.metrics?.zeroResultSearchCalls)),
  })).sort((a, b) => a.taskId.localeCompare(b.taskId));
}

async function suiteRunIds(suiteId) {
  const runsRoot = fromRepo('evals', 'runs');
  const entries = await readdir(runsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(`${suiteId}-`) && existsSync(join(runsRoot, name, 'report.json')))
    .sort();
}

async function writeLatest(payload) {
  const latest = fromRepo('docs', 'data', 'latest.json');
  await mkdir(join(latest, '..'), { recursive: true });
  await writeFile(latest, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return latest;
}

async function publishSingle(runId) {
  const item = await publishRun(runId);
  const latest = await writeLatest({
    status: 'published',
    runId,
    publishedAt: new Date().toISOString(),
    reportPath: `data/runs/${runId}/report.json`,
    report: item.report,
  });

  return {
    mode: 'single',
    runId,
    target: item.target,
    latest,
  };
}

async function publishSuite(suiteId) {
  const ids = await suiteRunIds(suiteId);
  if (!ids.length) throw new Error(`No finished runs found for suite prefix: ${suiteId}-`);

  const published = [];
  for (const id of ids) {
    published.push(await publishRun(id));
  }

  const runs = published.map(runSummary);
  const suite = {
    status: 'suite-published',
    suiteId,
    publishedAt: new Date().toISOString(),
    runCount: runs.length,
    providerCount: new Set(runs.map((run) => run.provider)).size,
    taskCount: new Set(runs.map((run) => run.taskId)).size,
    providers: summarizeProviders(runs),
    tasks: summarizeTasks(runs),
    runs,
  };

  const suitePath = fromRepo('docs', 'data', `${suiteId}.json`);
  await writeFile(suitePath, `${JSON.stringify(suite, null, 2)}\n`, 'utf8');
  const latest = await writeLatest(suite);

  return {
    mode: 'suite',
    suiteId,
    runCount: runs.length,
    suitePath,
    latest,
  };
}

const args = parseArgs(process.argv.slice(2));
let result;
if (args.run) {
  result = await publishSingle(args.run);
} else if (args.suite) {
  result = await publishSuite(args.suite);
} else {
  console.error(`Usage:
  node evals/publish-results.mjs --run <run-id>
  node evals/publish-results.mjs --suite <suite-prefix>`);
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
