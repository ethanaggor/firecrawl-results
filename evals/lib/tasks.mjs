import { readFile } from 'node:fs/promises';
import { fromEvals } from './paths.mjs';

export async function readTasks(file = 'benchmark.json') {
  const tasks = JSON.parse(await readFile(fromEvals('tasks', file), 'utf8'));
  if (!Array.isArray(tasks)) {
    throw new Error(`Task file must contain an array: ${file}`);
  }
  return tasks;
}

export async function readTask(id) {
  const tasks = await readTasks();
  const task = tasks.find((item) => item.id === id);
  if (!task) throw new Error(`Unknown task "${id}"`);
  return task;
}
