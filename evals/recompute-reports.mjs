#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { callMetrics, contractMetrics, runMetrics } from './lib/metrics.mjs';
import { normalizeToolResult } from './lib/normalize.mjs';
import { fromRepo } from './lib/paths.mjs';
import { runDir, writeJson } from './lib/trace-recorder.mjs';

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

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readTrace(path) {
  const text = await readFile(path, 'utf8');
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeTrace(path, events) {
  await writeFile(
    path,
    `${events.map((event) => JSON.stringify(event)).join('\n')}\n`,
    'utf8'
  );
}

async function runIdsForSuite(suiteId) {
  const root = fromRepo('evals', 'runs');
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith(`${suiteId}-`) && existsSync(join(root, name, 'report.json')))
    .sort();
}

async function allRunIds() {
  const root = fromRepo('evals', 'runs');
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(root, name, 'report.json')))
    .sort();
}

async function recomputeRun(runId) {
  const dir = runDir(runId);
  const manifest = await readJson(join(dir, 'manifest.json'));
  const tools = await readJson(join(dir, 'schemas', 'tools.json'));
  tools.metrics = contractMetrics(tools.response);
  await writeJson(join(dir, 'schemas', 'tools.json'), tools);
  const tracePath = join(dir, 'trace.jsonl');
  const events = await readTrace(tracePath);
  const startedByKey = new Map();
  for (const event of events) {
    if (event.event !== 'tool_call_started') continue;
    const key = `${event.step}:${event.tool}`;
    const items = startedByKey.get(key) ?? [];
    items.push(event);
    startedByKey.set(key, items);
  }

  for (const event of events) {
    if (event.event !== 'tool_call_completed') continue;
    const started = startedByKey.get(`${event.step}:${event.tool}`)?.shift();
    const argsPath = started?.argsArtifact ? join(dir, started.argsArtifact) : undefined;
    const rawPath = join(dir, event.rawArtifact);
    const normalizedPath = join(dir, event.normalizedArtifact);

    if (!existsSync(rawPath)) continue;
    const toolArgs = argsPath && existsSync(argsPath) ? await readJson(argsPath) : {};
    const response = await readJson(rawPath);
    const normalized = normalizeToolResult(manifest.provider.id, event.tool, response);
    const metrics = callMetrics({
      args: toolArgs,
      response,
      normalized,
      task: manifest.task,
    });

    await writeJson(normalizedPath, normalized);
    event.metrics = metrics;
  }

  const completedOrFailed = events.filter(
    (event) => event.event === 'tool_call_completed' || event.event === 'tool_call_failed'
  );
  const metrics = runMetrics({ manifest, calls: completedOrFailed, tools });
  const scorePath = join(dir, 'scoring', 'agent-score.json');
  const semanticScore = existsSync(scorePath) ? await readJson(scorePath) : undefined;
  const answerPath = join(dir, 'scoring', 'final-answer.md');
  const report = {
    status: 'complete',
    runId,
    generatedAt: new Date().toISOString(),
    manifest,
    metrics,
    semanticScore,
    artifacts: {
      answer: 'scoring/final-answer.md',
      score: 'scoring/agent-score.json',
      trace: 'trace.jsonl',
      tools: 'schemas/tools.json',
    },
  };

  await writeJson(join(dir, 'scoring', 'metrics.json'), metrics);
  if (!existsSync(answerPath)) {
    await writeFile(answerPath, '', 'utf8');
  }
  await writeJson(join(dir, 'report.json'), report);

  const filtered = events.filter((event) => event.event !== 'run_finished');
  filtered.push({
    event: 'run_finished',
    provider: manifest.provider.id,
    taskId: manifest.task.id,
    metrics,
    semanticScore,
    artifact: 'report.json',
  });
  await writeTrace(tracePath, filtered);

  return { runId, metrics };
}

const args = parseArgs(process.argv.slice(2));
const ids = args.run
  ? [args.run]
  : args.suite
    ? await runIdsForSuite(args.suite)
    : await allRunIds();

if (!ids.length) {
  throw new Error('No finished runs found to recompute');
}

const recomputed = [];
for (const id of ids) {
  recomputed.push(await recomputeRun(id));
}

console.log(
  JSON.stringify(
    {
      recomputed: recomputed.length,
      runIds: recomputed.map((item) => item.runId),
    },
    null,
    2
  )
);
