import { makeChunks } from './chunks.js';
import type {
  FirecrawlSearchRequest,
  NormalizedSearchResult,
  SearchContextResult,
} from './types.js';

function cleanMetadata(
  metadata: SearchContextResult['metadata']
): SearchContextResult['metadata'] | undefined {
  if (!metadata) return undefined;
  const out: NonNullable<SearchContextResult['metadata']> = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined)
  ) as NonNullable<SearchContextResult['metadata']>;
  return Object.keys(out).length ? out : undefined;
}

function baseResult(result: NormalizedSearchResult): SearchContextResult {
  return {
    title: result.title,
    url: result.url,
    description: result.description,
    position: result.position,
    source: result.source,
    category: result.category,
    metadata: cleanMetadata(result.metadata),
  };
}

function clipText(
  text: string,
  perResultRemaining: number,
  totalRemaining: number
): string {
  return text.slice(0, Math.max(0, Math.min(perResultRemaining, totalRemaining)));
}

export function applyContentLimits(
  results: NormalizedSearchResult[],
  input: FirecrawlSearchRequest
): {
  results: SearchContextResult[];
  charsReturned: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (input.content === 'results') {
    return { results: results.map(baseResult), charsReturned: 0, warnings };
  }

  let totalRemaining = input.maxCharsTotal;
  let charsReturned = 0;
  const out: SearchContextResult[] = [];

  for (const result of results) {
    const next = baseResult(result);
    let perResultRemaining = input.maxCharsPerResult;

    if (input.content === 'summary') {
      const summary = result.summary ?? result.description;
      if (summary && totalRemaining > 0) {
        const content = clipText(summary, perResultRemaining, totalRemaining);
        next.content = content;
        charsReturned += content.length;
        totalRemaining -= content.length;
      }
      out.push(next);
      continue;
    }

    if (input.content === 'markdown') {
      if (result.markdown && totalRemaining > 0) {
        const content = clipText(
          result.markdown,
          perResultRemaining,
          totalRemaining
        );
        next.content = content;
        charsReturned += content.length;
        totalRemaining -= content.length;
      }
      out.push(next);
      continue;
    }

    if (input.content === 'chunks') {
      const chunks = result.markdown
        ? makeChunks(result.markdown, {
            query: input.query,
            focus: input.focus,
            maxCharsPerResult: input.maxCharsPerResult,
          })
        : [];
      const clippedChunks: Array<{ text: string; charCount: number }> = [];

      for (const chunk of chunks) {
        if (totalRemaining <= 0 || perResultRemaining <= 0) break;
        const text = clipText(chunk.text, perResultRemaining, totalRemaining);
        if (!text) continue;
        clippedChunks.push({ text, charCount: text.length });
        charsReturned += text.length;
        totalRemaining -= text.length;
        perResultRemaining -= text.length;
      }

      if (clippedChunks.length) next.chunks = clippedChunks;
      out.push(next);
    }
  }

  if (totalRemaining <= 0) {
    warnings.push(`maxCharsTotal hard cap reached at ${input.maxCharsTotal} characters`);
  }

  return { results: out, charsReturned, warnings };
}
