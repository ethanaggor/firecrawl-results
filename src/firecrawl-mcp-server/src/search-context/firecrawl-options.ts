import { toTbs } from './freshness.js';
import {
  applySingleIncludeDomainToQuery,
  applySourcePolicyToQuery,
  normalizeDomain,
} from './source-policy.js';
import type {
  FirecrawlSearchCall,
  FirecrawlSearchRequest,
  SearchContentMode,
  SourcePolicyStrategy,
} from './types.js';

function removeEmptyTopLevel<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      continue;
    }
    out[key as keyof T] = value as T[keyof T];
  }
  return out;
}

function formatForContent(content: SearchContentMode): string | undefined {
  if (content === 'results') return undefined;
  if (content === 'summary') return 'summary';
  return 'markdown';
}

export function toFirecrawlSearchOptions(
  input: FirecrawlSearchRequest
): Record<string, unknown> {
  const tbs = input.advancedSearchOptions?.tbs ?? toTbs(input.freshness);
  const options: Record<string, unknown> = {
    limit: input.maxResults,
    sources: input.sources,
    categories: input.categories,
    tbs,
    filter: input.advancedSearchOptions?.filter,
    location: input.location,
    country: input.country,
    timeout: input.timeout,
    ignoreInvalidURLs: input.ignoreInvalidURLs,
    enterprise: input.enterprise,
  };

  const format = formatForContent(input.content);
  if (format) {
    options.scrapeOptions = removeEmptyTopLevel({
      onlyMainContent: true,
      ...input.advancedScrapeOptions,
      formats: [format],
    });
  }

  return removeEmptyTopLevel(options);
}

export function createSearchCalls(
  input: FirecrawlSearchRequest,
  strategy: SourcePolicyStrategy
): FirecrawlSearchCall[] {
  const baseOptions = toFirecrawlSearchOptions(input);
  const includes =
    input.sourcePolicy?.includeDomains?.map(normalizeDomain).filter(Boolean) ??
    [];

  if (strategy === 'fanout' && includes.length > 1) {
    return includes.map((domain) => ({
      query: applySingleIncludeDomainToQuery(input.query, domain, input.sourcePolicy),
      options: baseOptions,
      label: `include:${domain}`,
    }));
  }

  return [
    {
      query: applySourcePolicyToQuery(input.query, input.sourcePolicy),
      options: baseOptions,
      label: strategy,
    },
  ];
}
