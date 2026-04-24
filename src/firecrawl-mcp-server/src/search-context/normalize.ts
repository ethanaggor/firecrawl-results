import { getUrlDomain, domainAllowedByPolicy } from './source-policy.js';
import type {
  FirecrawlSearchPayload,
  FirecrawlSearchRequest,
  NormalizedSearchResult,
  SearchSource,
} from './types.js';

const sources: SearchSource[] = ['web', 'news', 'images'];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function getSearchData(payload: FirecrawlSearchPayload): Record<SearchSource, unknown[]> {
  const maybeData = asRecord(payload.data);
  const direct = asRecord(payload);
  const data = sources.some((source) => Array.isArray(maybeData[source]))
    ? maybeData
    : direct;

  return {
    web: Array.isArray(data.web) ? (data.web as unknown[]) : [],
    news: Array.isArray(data.news) ? (data.news as unknown[]) : [],
    images: Array.isArray(data.images) ? (data.images as unknown[]) : [],
  };
}

function getResultUrl(result: Record<string, unknown>): string | undefined {
  const metadata = asRecord(result.metadata);
  return (
    asString(result.url) ??
    asString(metadata.url) ??
    asString(metadata.sourceURL) ??
    asString(result.sourceURL)
  );
}

function normalizeResult(
  raw: unknown,
  source: SearchSource
): NormalizedSearchResult | undefined {
  const result = asRecord(raw);
  const metadata = asRecord(result.metadata);
  const url = getResultUrl(result);
  if (!url) return undefined;

  return {
    title: asString(result.title) ?? asString(metadata.title),
    url,
    description:
      asString(result.description) ??
      asString(result.snippet) ??
      asString(metadata.description),
    position: asNumber(result.position),
    source,
    category: asString(result.category),
    summary: asString(result.summary),
    markdown: asString(result.markdown),
    metadata: {
      sourceURL: asString(metadata.sourceURL),
      finalURL: asString(metadata.url),
      statusCode: asNumber(metadata.statusCode),
      error: asString(metadata.error),
      imageUrl: asString(result.imageUrl),
      imageWidth: asNumber(result.imageWidth),
      imageHeight: asNumber(result.imageHeight),
      date: asString(result.date),
    },
    raw,
  };
}

function resultKey(result: NormalizedSearchResult): string {
  try {
    const url = new URL(result.url);
    url.hash = '';
    url.searchParams.sort();
    return url.toString().replace(/\/$/, '');
  } catch {
    return result.url;
  }
}

export function rawResultCounts(
  payloads: FirecrawlSearchPayload[]
): Partial<Record<SearchSource, number>> {
  const counts: Partial<Record<SearchSource, number>> = {};
  for (const payload of payloads) {
    const data = getSearchData(payload);
    for (const source of sources) {
      counts[source] = (counts[source] ?? 0) + data[source].length;
    }
  }
  return counts;
}

export function normalizePayloads(
  payloads: FirecrawlSearchPayload[],
  input: FirecrawlSearchRequest
): {
  results: NormalizedSearchResult[];
  filteredByPolicy: number;
  warnings: string[];
} {
  const seen = new Set<string>();
  const results: NormalizedSearchResult[] = [];
  let filteredByPolicy = 0;
  const warnings: string[] = [];

  for (const payload of payloads) {
    const data = getSearchData(payload);
    for (const source of sources) {
      for (const raw of data[source]) {
        const normalized = normalizeResult(raw, source);
        if (!normalized) continue;

        const domain = getUrlDomain(normalized.url);
        if (!domainAllowedByPolicy(domain, input.sourcePolicy)) {
          filteredByPolicy += 1;
          continue;
        }

        const key = resultKey(normalized);
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(normalized);
      }
    }
  }

  if (filteredByPolicy > 0) {
    warnings.push(`sourcePolicy removed ${filteredByPolicy} out-of-policy results`);
  }

  return {
    results: results.slice(0, input.maxResults),
    filteredByPolicy,
    warnings,
  };
}
