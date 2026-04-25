#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadRepoEnv } from './lib/env.mjs';
import {
  providerIds,
  readAllProviders,
  readProvider,
  sanitizeProvider,
} from './lib/providers.mjs';
import { readTask, readTasks } from './lib/tasks.mjs';
import { callTool, listTools } from './lib/mcp-client.mjs';
import { contractMetrics, callMetrics, runMetrics } from './lib/metrics.mjs';
import { normalizeToolResult } from './lib/normalize.mjs';
import { countTokens } from './lib/tokenizer.mjs';
import {
  appendTrace,
  ensureRunDirs,
  readTrace,
  runDir,
  writeJson,
} from './lib/trace-recorder.mjs';
import { fromEvals } from './lib/paths.mjs';

function parseArgs(argv) {
  const out = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      out._.push(item);
      continue;
    }
    const raw = item.slice(2);
    const eq = raw.indexOf('=');
    if (eq !== -1) {
      out[raw.slice(0, eq)] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      out[raw] = true;
    } else {
      out[raw] = next;
      index += 1;
    }
  }
  return out;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function safeRunId(providerId, taskId) {
  return `${timestamp()}_${providerId}_${taskId}`.replace(/[^a-zA-Z0-9_.-]/g, '-');
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readMaybeJson(path) {
  if (!path) return undefined;
  return readJson(path);
}

async function readManifest(dir) {
  return readJson(join(dir, 'manifest.json'));
}

function rel(dir, path) {
  return relative(dir, path);
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function clip(text, max = 16000) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[truncated ${text.length - max} chars; full response saved on disk]`;
}

async function commandProviders() {
  await loadRepoEnv();
  const providers = await readAllProviders();
  print(providers.map(sanitizeProvider));
}

async function commandTasks() {
  print(await readTasks());
}

async function commandSmoke(args) {
  await loadRepoEnv();
  const ids = args.all ? providerIds : [args.provider];
  if (!ids[0]) throw new Error('Pass --provider <id> or --all');
  const report = [];

  for (const id of ids) {
    const provider = await readProvider(id);
    const started = performance.now();
    try {
      const tools = await listTools(provider);
      report.push({
        provider: id,
        ok: true,
        elapsedMs: Math.round(performance.now() - started),
        connectMs: tools.connectMs,
        listToolsMs: tools.latencyMs,
        metrics: contractMetrics(tools.response),
        tools: tools.response.tools?.map((tool) => ({
          name: tool.name,
          descriptionTokens: countTokens(tool.description ?? ''),
        })),
      });
    } catch (error) {
      report.push({
        provider: id,
        ok: false,
        elapsedMs: Math.round(performance.now() - started),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await mkdir(fromEvals('reports'), { recursive: true });
  const reportPath = fromEvals('reports', `${timestamp()}-provider-smoke.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  print({ report: reportPath, providers: report });
  if (report.some((item) => !item.ok)) process.exitCode = 1;
}

async function commandStart(args) {
  await loadRepoEnv();
  if (!args.provider) throw new Error('Missing --provider');
  if (!args.task) throw new Error('Missing --task');

  const provider = await readProvider(args.provider);
  const task = await readTask(args.task);
  const id = args.run ?? safeRunId(provider.id, task.id);
  const dir = runDir(id);

  if (existsSync(dir)) throw new Error(`Run already exists: ${id}`);
  await ensureRunDirs(dir);

  const manifest = {
    runId: id,
    createdAt: new Date().toISOString(),
    provider: sanitizeProvider(provider),
    task,
  };
  await writeJson(join(dir, 'manifest.json'), manifest);
  await writeJson(join(dir, 'task.json'), task);
  await writeJson(join(dir, 'provider.json'), manifest.provider);

  const tools = await listTools(provider);
  const metrics = contractMetrics(tools.response);
  await writeJson(join(dir, 'schemas', 'tools.json'), {
    provider: provider.id,
    connectMs: tools.connectMs,
    latencyMs: tools.latencyMs,
    metrics,
    response: tools.response,
  });
  await appendTrace(dir, {
    event: 'list_tools_completed',
    provider: provider.id,
    taskId: task.id,
    connectMs: tools.connectMs,
    latencyMs: tools.latencyMs,
    metrics,
    artifact: 'schemas/tools.json',
  });

  print({
    runId: id,
    dir,
    provider: provider.id,
    task: task.id,
    metrics,
    tools: tools.response.tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  });
}

async function commandTools(args) {
  if (!args.run) throw new Error('Missing --run');
  const dir = runDir(args.run);
  const tools = await readJson(join(dir, 'schemas', 'tools.json'));
  print({
    runId: args.run,
    metrics: tools.metrics,
    tools: tools.response.tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  });
}

async function commandCall(args) {
  await loadRepoEnv();
  if (!args.run) throw new Error('Missing --run');
  if (!args.tool) throw new Error('Missing --tool');
  if (!args.args) throw new Error('Missing --args <json-file>');

  const dir = runDir(args.run);
  const manifest = await readManifest(dir);
  const provider = await readProvider(manifest.provider.id);
  const toolArgs = await readJson(args.args);
  const trace = await readTrace(dir);
  const step = String(trace.filter((item) => item.event?.startsWith('tool_call')).length + 1).padStart(
    3,
    '0'
  );
  const slug = `${step}-${args.tool.replace(/[^a-zA-Z0-9_.-]/g, '-')}`;

  const argsPath = join(dir, 'calls', `${slug}.args.json`);
  await writeJson(argsPath, toolArgs);
  await appendTrace(dir, {
    event: 'tool_call_started',
    step,
    provider: provider.id,
    taskId: manifest.task.id,
    tool: args.tool,
    argsArtifact: rel(dir, argsPath),
    argumentTokens: countTokens(toolArgs),
  });

  try {
    const result = await callTool(provider, args.tool, toolArgs);
    const normalized = normalizeToolResult(provider.id, args.tool, result.response);
    const metrics = callMetrics({
      args: toolArgs,
      response: result.response,
      normalized,
      task: manifest.task,
    });
    const rawPath = join(dir, 'raw', `${slug}.response.json`);
    const normalizedPath = join(dir, 'normalized', `${slug}.json`);
    await writeJson(rawPath, result.response);
    await writeJson(normalizedPath, normalized);
    await appendTrace(dir, {
      event: 'tool_call_completed',
      step,
      provider: provider.id,
      taskId: manifest.task.id,
      tool: args.tool,
      connectMs: result.connectMs,
      latencyMs: result.latencyMs,
      rawArtifact: rel(dir, rawPath),
      normalizedArtifact: rel(dir, normalizedPath),
      metrics,
    });

    const printLimit = Number(args['print-limit'] ?? 16000);
    console.log(
      clip(
        normalized.rawText || JSON.stringify(result.response, null, 2),
        Number.isFinite(printLimit) ? printLimit : 16000
      )
    );
    console.error(
      JSON.stringify(
        {
          runId: args.run,
          step,
          raw: rel(dir, rawPath),
          normalized: rel(dir, normalizedPath),
          metrics,
        },
        null,
        2
      )
    );
  } catch (error) {
    await appendTrace(dir, {
      event: 'tool_call_failed',
      step,
      provider: provider.id,
      taskId: manifest.task.id,
      tool: args.tool,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function collectCompletedCalls(dir) {
  const trace = await readTrace(dir);
  return trace.filter(
    (event) => event.event === 'tool_call_completed' || event.event === 'tool_call_failed'
  );
}

async function commandFinish(args) {
  if (!args.run) throw new Error('Missing --run');
  if (!args.answer) throw new Error('Missing --answer <markdown-file>');
  if (!args.score) throw new Error('Missing --score <json-file>');

  const dir = runDir(args.run);
  const manifest = await readManifest(dir);
  const tools = await readJson(join(dir, 'schemas', 'tools.json'));
  const answer = await readFile(args.answer, 'utf8');
  const semanticScore = await readMaybeJson(args.score);
  const answerPath = join(dir, 'scoring', 'final-answer.md');
  const scorePath = join(dir, 'scoring', 'agent-score.json');
  await writeFile(answerPath, answer, 'utf8');
  await writeJson(scorePath, semanticScore);

  const calls = await collectCompletedCalls(dir);
  const metrics = runMetrics({ manifest, calls, tools });
  const report = {
    status: 'complete',
    runId: args.run,
    generatedAt: new Date().toISOString(),
    manifest,
    metrics,
    semanticScore,
    artifacts: {
      answer: rel(dir, answerPath),
      score: rel(dir, scorePath),
      trace: 'trace.jsonl',
      tools: 'schemas/tools.json',
    },
  };
  await writeJson(join(dir, 'report.json'), report);
  await appendTrace(dir, {
    event: 'run_finished',
    provider: manifest.provider.id,
    taskId: manifest.task.id,
    metrics,
    semanticScore,
    artifact: 'report.json',
  });
  print(report);
}

async function commandScore(args) {
  if (!args.run) throw new Error('Missing --run');
  const dir = runDir(args.run);
  const manifest = await readManifest(dir);
  const tools = await readJson(join(dir, 'schemas', 'tools.json'));
  const calls = await collectCompletedCalls(dir);
  const metrics = runMetrics({ manifest, calls, tools });
  await writeJson(join(dir, 'scoring', 'metrics.json'), metrics);
  print(metrics);
}

async function main() {
  const [command = 'help', ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (command === 'providers') return commandProviders(args);
  if (command === 'tasks') return commandTasks(args);
  if (command === 'smoke') return commandSmoke(args);
  if (command === 'start') return commandStart(args);
  if (command === 'tools') return commandTools(args);
  if (command === 'call') return commandCall(args);
  if (command === 'finish') return commandFinish(args);
  if (command === 'score') return commandScore(args);

  console.log(`Usage:
  node evals/agent-run.mjs providers
  node evals/agent-run.mjs tasks
  node evals/agent-run.mjs smoke --all
  node evals/agent-run.mjs smoke --provider exa
  node evals/agent-run.mjs start --provider firecrawl-context --task docs-parity
  node evals/agent-run.mjs tools --run <run-id>
  node evals/agent-run.mjs call --run <run-id> --tool <name> --args evals/work/args.json
  node evals/agent-run.mjs finish --run <run-id> --answer evals/work/final-answer.md --score evals/work/score.json
  node evals/agent-run.mjs score --run <run-id>
`);
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
