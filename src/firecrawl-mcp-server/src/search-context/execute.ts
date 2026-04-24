import { createSearchCalls } from './firecrawl-options.js';
import { normalizePayloads, rawResultCounts } from './normalize.js';
import { applyContentLimits } from './limits.js';
import { domainMatches, getUrlDomain, normalizeDomain } from './source-policy.js';
import { parseSearchContextInput } from './schema.js';
import type {
  FirecrawlSearchCall,
  FirecrawlSearchPayload,
  FirecrawlSearchRequest,
  FirecrawlSearchResponse,
  SearchExecutionOptions,
  SourcePolicyStrategy,
} from './types.js';

const DEFAULT_API_URL = 'https://api.firecrawl.dev';

function searchEndpoint(apiUrl?: string): string {
  const base = (apiUrl ?? process.env.FIRECRAWL_API_URL ?? DEFAULT_API_URL)
    .replace(/\/$/, '');
  return base.endsWith('/v2') ? `${base}/search` : `${base}/v2/search`;
}

function responseMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return String(payload);
  const record = payload as Record<string, unknown>;
  return String(record.error ?? record.message ?? JSON.stringify(record));
}

async function callFirecrawlSearch(
  call: FirecrawlSearchCall,
  input: FirecrawlSearchRequest,
  options: SearchExecutionOptions
): Promise<FirecrawlSearchPayload> {
  const apiKey = options.apiKey ?? process.env.FIRECRAWL_API_KEY;
  const endpoint = searchEndpoint(options.apiUrl);
  const controller = new AbortController();
  const timeout = input.timeout ?? 60000;
  const timer = setTimeout(() => controller.abort(), timeout + 5000);

  try {
    options.log?.info('Searching with Firecrawl', {
      label: call.label,
      query: call.query,
    });
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        query: call.query,
        ...call.options,
        origin: options.origin,
      }),
      signal: controller.signal,
    });
    const payload = (await res.json().catch(() => ({}))) as FirecrawlSearchPayload;
    if (!res.ok || payload.success === false) {
      throw new Error(
        `Firecrawl search failed (${res.status}): ${responseMessage(payload)}`
      );
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

function creditsUsed(payloads: FirecrawlSearchPayload[]): number | undefined {
  let total = 0;
  let found = false;
  for (const payload of payloads) {
    if (typeof payload.creditsUsed === 'number') {
      total += payload.creditsUsed;
      found = true;
    }
  }
  return found ? total : undefined;
}

function warningMessages(payloads: FirecrawlSearchPayload[]): string[] {
  return payloads
    .map((payload) => payload.warning)
    .filter((warning): warning is string => typeof warning === 'string' && warning.length > 0);
}

function searchIds(payloads: FirecrawlSearchPayload[]): string[] | undefined {
  const ids = payloads
    .map((payload) => payload.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  return ids.length ? Array.from(new Set(ids)) : undefined;
}

function includeDomains(input: FirecrawlSearchRequest): string[] {
  return (
    input.sourcePolicy?.includeDomains?.map(normalizeDomain).filter(Boolean) ?? []
  );
}

function shouldHybridBackfill(
  input: FirecrawlSearchRequest,
  payloads: FirecrawlSearchPayload[]
): boolean {
  const includes = includeDomains(input);
  if (includes.length <= 1) return false;

  const normalized = normalizePayloads(payloads, input).results;
  const covered = new Set<string>();
  for (const result of normalized) {
    const domainForResult = getUrlDomain(result.url);
    for (const domain of includes) {
      if (domainForResult && domainMatches(domainForResult, domain)) {
        covered.add(domain);
      }
    }
  }
  return normalized.length < Math.min(input.maxResults, includes.length) ||
    covered.size < Math.min(includes.length, input.maxResults);
}

async function runSearchPlan(
  input: FirecrawlSearchRequest,
  options: SearchExecutionOptions,
  strategy: SourcePolicyStrategy
): Promise<{ payloads: FirecrawlSearchPayload[]; executedQuery: string }> {
  const compileCalls = createSearchCalls(input, 'compile');

  if (strategy === 'hybrid' && includeDomains(input).length > 1) {
    const firstPayloads = await Promise.all(
      compileCalls.map((call) => callFirecrawlSearch(call, input, options))
    );
    if (!shouldHybridBackfill(input, firstPayloads)) {
      return {
        payloads: firstPayloads,
        executedQuery: compileCalls.map((call) => call.query).join(' | '),
      };
    }

    const fanoutCalls = createSearchCalls(input, 'fanout');
    const fanoutPayloads = await Promise.all(
      fanoutCalls.map((call) => callFirecrawlSearch(call, input, options))
    );
    return {
      payloads: [...firstPayloads, ...fanoutPayloads],
      executedQuery: [...compileCalls, ...fanoutCalls]
        .map((call) => call.query)
        .join(' | '),
    };
  }

  const calls = createSearchCalls(input, strategy);
  const payloads = await Promise.all(
    calls.map((call) => callFirecrawlSearch(call, input, options))
  );
  return {
    payloads,
    executedQuery: calls.map((call) => call.query).join(' | '),
  };
}

export async function searchContext(
  rawInput: unknown,
  options: SearchExecutionOptions
): Promise<FirecrawlSearchResponse> {
  const input = parseSearchContextInput(rawInput);
  const strategy = options.sourcePolicyStrategy ?? 'compile';
  const warnings: string[] = [];

  if (input.content !== 'results' && input.sources.includes('images')) {
    warnings.push('images source does not generally return scraped page context');
  }
  if (input.content === 'results' && input.focus) {
    warnings.push('focus is ignored when content is results');
  }
  if (input.freshness && input.sources.some((source) => source !== 'web')) {
    warnings.push('freshness/tbs behavior is strongest for web results');
  }

  const { payloads, executedQuery } = await runSearchPlan(input, options, strategy);
  const normalized = normalizePayloads(payloads, input);
  const limited = applyContentLimits(normalized.results, input);
  warnings.push(
    ...warningMessages(payloads),
    ...normalized.warnings,
    ...limited.warnings
  );

  return {
    query: input.query,
    executedQuery,
    content: input.content,
    constraints: {
      maxResults: input.maxResults,
      maxCharsPerResult:
        input.content === 'results' ? undefined : input.maxCharsPerResult,
      maxCharsTotal: input.content === 'results' ? undefined : input.maxCharsTotal,
      focus: input.focus,
      freshness: input.freshness,
      sourcePolicy: input.sourcePolicy,
      enterprise: input.enterprise,
      advancedSearchOptions: input.advancedSearchOptions,
    },
    results: limited.results,
    searchIds: searchIds(payloads),
    usage: {
      resultCount: limited.results.length,
      charsReturned: limited.charsReturned,
      creditsUsed: creditsUsed(payloads),
      rawResultCount: rawResultCounts(payloads),
    },
    warnings: warnings.length ? Array.from(new Set(warnings)) : undefined,
    rawResults: input.includeRawResults ? payloads : undefined,
  };
}
