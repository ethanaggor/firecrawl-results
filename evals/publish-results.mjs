#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
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

const args = parseArgs(process.argv.slice(2));
if (!args.run) {
  console.error('Usage: node evals/publish-results.mjs --run <run-id>');
  process.exit(1);
}

const source = runDir(args.run);
const reportPath = join(source, 'report.json');
if (!existsSync(reportPath)) {
  throw new Error(`Missing report.json. Finish the run first: ${source}`);
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const target = fromRepo('docs', 'data', 'runs', args.run);
await mkdir(target, { recursive: true });
await cp(source, target, {
  recursive: true,
  filter: (path) => !path.includes('/node_modules/'),
});
await writeFile(
  fromRepo('docs', 'data', 'latest.json'),
  `${JSON.stringify(
    {
      status: 'published',
      runId: args.run,
      publishedAt: new Date().toISOString(),
      reportPath: `data/runs/${args.run}/report.json`,
      report,
    },
    null,
    2
  )}\n`,
  'utf8'
);

console.log(
  JSON.stringify(
    {
      runId: args.run,
      target,
      latest: fromRepo('docs', 'data', 'latest.json'),
    },
    null,
    2
  )
);
