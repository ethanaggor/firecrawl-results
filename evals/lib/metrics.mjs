import { countTokens, textStats } from './tokenizer.mjs';
import { evidenceText } from './normalize.mjs';

const RAW_OUTPUT_OUTLIER_THRESHOLD_TOKENS = 50000;

function lower(value) {
  return String(value ?? '').toLowerCase();
}

function includesAny(text, terms = []) {
  if (!terms.length) return undefined;
  const haystack = lower(text);
  return terms.some((term) => haystack.includes(lower(term)));
}

function domainMatches(domain, expected) {
  if (!domain) return false;
  return expected.some((item) => domain === item || domain.endsWith(`.${item}`));
}

function sourcePolicyAllows(domain, sourcePolicy) {
  if (!sourcePolicy) return undefined;
  if (!domain) return false;

  const include = sourcePolicy.includeDomains ?? [];
  const exclude = sourcePolicy.excludeDomains ?? [];

  if (exclude.some((entry) => domainMatches(domain, [entry]))) return false;
  if (!include.length) return true;
  return domainMatches(domain, include);
}

function sourcePolicyAdherent(domains, sourcePolicy) {
  if (!sourcePolicy) return undefined;
  return domains.every((domain) => sourcePolicyAllows(domain, sourcePolicy));
}

function termsMatched(text, terms = []) {
  if (!terms.length) return undefined;
  const haystack = lower(text);
  return terms.filter((term) => haystack.includes(lower(term)));
}

function expectedDomainsMatched(domains, expected = []) {
  if (!expected.length) return undefined;
  return expected.filter((domain) =>
    domains.some((seen) => domainMatches(seen, [domain]))
  );
}

export function contractMetrics(toolsResponse) {
  const tools = toolsResponse?.tools ?? [];
  const descriptionText = tools.map((tool) => tool.description ?? '').join('\n\n');
  const schemaPayload = tools.map((tool) => tool.inputSchema ?? {});
  const allText = JSON.stringify(tools, null, 2);
  const searchTools = tools.filter((tool) => /search/i.test(tool.name));
  const searchFetchTools = tools.filter((tool) =>
    /search|fetch|scrape|extract/i.test(tool.name)
  );

  return {
    toolCount: tools.length,
    searchToolCount: searchTools.length,
    fetchToolCount: tools.filter((tool) => /fetch|scrape|extract/i.test(tool.name)).length,
    descriptionTokens: countTokens(descriptionText),
    schemaTokens: countTokens(schemaPayload),
    totalMcpFootprintTokens: countTokens(allText),
    searchOnlyFootprintTokens: countTokens(JSON.stringify(searchTools, null, 2)),
    searchFetchFootprintTokens: countTokens(JSON.stringify(searchFetchTools, null, 2)),
    hasFreshnessControl: /freshness|date|time|tbs|maxAge/i.test(allText),
    hasSourcePolicyControl: /sourcePolicy|includeDomains|excludeDomains|include_domains|exclude_domains|domain/i.test(
      allText
    ),
    hasContentBudgetControl: /maxChars|max_char|maxResults|numResults|limit|chunks_per_source/i.test(
      allText
    ),
    hasUsageMetadata: /usage|credits|cost/i.test(allText),
  };
}

export function callMetrics({ args, response, normalized, task }) {
  const rawText = normalized.rawText || JSON.stringify(response, null, 2);
  const normalizedEvidence = evidenceText(normalized);
  const domains = normalized.results.map((item) => item.domain).filter(Boolean);
  const uniqueDomains = Array.from(new Set(domains));
  const urls = normalized.results.map((item) => item.url).filter(Boolean);
  const uniqueUrls = Array.from(new Set(urls));
  const matchedTerms = termsMatched(normalizedEvidence, task?.expectedTerms);
  const matchedDomains = expectedDomainsMatched(uniqueDomains, task?.expectedDomains);

  return {
    argument: textStats(args),
    rawResponse: textStats(rawText),
    normalizedEvidence: textStats(normalizedEvidence),
    resultCount: normalized.results.length,
    uniqueUrlCount: uniqueUrls.length,
    uniqueDomainCount: uniqueDomains.length,
    duplicateUrlRate:
      urls.length > 0 ? Number(((urls.length - uniqueUrls.length) / urls.length).toFixed(4)) : 0,
    expectedTermHit: matchedTerms ? matchedTerms.length > 0 : undefined,
    expectedTermsMatched: matchedTerms,
    expectedDomainHit: matchedDomains ? matchedDomains.length > 0 : undefined,
    expectedDomainsMatched: matchedDomains,
    sourcePolicyAdherent: sourcePolicyAdherent(uniqueDomains, task?.sourcePolicy),
    domains: uniqueDomains,
    urls: uniqueUrls.slice(0, 20),
  };
}

function inferredMapTool(tool) {
  return /(^|[_-])map($|[_-])/i.test(tool);
}

function inferredExtractionTool(tool) {
  return /fetch|scrape|extract/i.test(tool);
}

function completedToolCalls(calls) {
  return calls.filter((call) => call.event === 'tool_call_completed');
}

function firstSearchCall(calls, searchTools) {
  return completedToolCalls(calls).find((call) => searchTools.has(call.tool));
}

function uniqueValuesFromCallMetrics(calls, key) {
  const values = [];
  for (const call of completedToolCalls(calls)) {
    const items = call.metrics?.[key];
    if (Array.isArray(items)) values.push(...items);
  }
  return Array.from(new Set(values));
}

function duplicateRate(values) {
  if (!values.length) return 0;
  return Number(((values.length - new Set(values).size) / values.length).toFixed(4));
}

function sumMetric(calls, selector) {
  return completedToolCalls(calls).reduce((sum, call) => sum + (selector(call) ?? 0), 0);
}

export function runMetrics({ manifest, calls, tools }) {
  const searchTools = new Set(manifest.provider.searchTools ?? []);
  const fetchTools = new Set(manifest.provider.fetchTools ?? []);
  const mapTools = new Set(manifest.provider.mapTools ?? []);
  const completed = completedToolCalls(calls);
  const failed = calls.filter((call) => call.event === 'tool_call_failed');
  const mapCalls = completed.filter(
    (call) => mapTools.has(call.tool) || inferredMapTool(call.tool)
  );
  const extractionCalls = completed.filter(
    (call) => fetchTools.has(call.tool) || inferredExtractionTool(call.tool)
  );
  const searchCalls = completed.filter((call) => searchTools.has(call.tool));
  const discoveryCalls = completed.filter(
    (call) =>
      searchTools.has(call.tool) ||
      mapTools.has(call.tool) ||
      inferredMapTool(call.tool)
  );
  const rawTokens = completed.reduce(
    (sum, call) => sum + (call.metrics?.rawResponse?.tokens ?? 0),
    0
  );
  const argumentTokens = completed.reduce(
    (sum, call) => sum + (call.metrics?.argument?.tokens ?? 0),
    0
  );
  const evidenceTokens = completed.reduce(
    (sum, call) => sum + (call.metrics?.normalizedEvidence?.tokens ?? 0),
    0
  );
  const allUrls = [];
  const allDomains = [];
  for (const call of completed) {
    if (Array.isArray(call.metrics?.urls)) allUrls.push(...call.metrics.urls);
    if (Array.isArray(call.metrics?.domains)) allDomains.push(...call.metrics.domains);
  }
  const firstSearch = firstSearchCall(calls, searchTools);
  const zeroResultSearchCalls = searchCalls.filter(
    (call) => (call.metrics?.resultCount ?? 0) === 0
  ).length;
  const expectedDomainMissSearchCalls = searchCalls.filter(
    (call) => call.metrics?.expectedDomainHit === false
  ).length;
  const expectedTermMissSearchCalls = searchCalls.filter(
    (call) => call.metrics?.expectedTermHit === false
  ).length;
  const recoverySignalCalls =
    zeroResultSearchCalls + expectedDomainMissSearchCalls + mapCalls.length;
  const maxRawOutputCall = completed
    .map((call) => ({
      tool: call.tool,
      rawOutputTokens: call.metrics?.rawResponse?.tokens ?? 0,
      normalizedEvidenceTokens: call.metrics?.normalizedEvidence?.tokens ?? 0,
      resultCount: call.metrics?.resultCount ?? 0,
    }))
    .sort((a, b) => b.rawOutputTokens - a.rawOutputTokens)[0];

  return {
    provider: manifest.provider.id,
    taskId: manifest.task.id,
    toolCalls: completed.length + failed.length,
    searchCalls: searchCalls.length,
    fetchCalls: completed.filter((call) => fetchTools.has(call.tool)).length,
    mapCalls: mapCalls.length,
    discoveryCalls: discoveryCalls.length,
    extractionCalls: extractionCalls.length,
    failedCalls: failed.length,
    zeroResultCalls: completed.filter((call) => (call.metrics?.resultCount ?? 0) === 0)
      .length,
    zeroResultSearchCalls,
    expectedTermMissCalls: completed.filter((call) => call.metrics?.expectedTermHit === false)
      .length,
    expectedDomainMissCalls: completed.filter(
      (call) => call.metrics?.expectedDomainHit === false
    ).length,
    expectedTermMissSearchCalls,
    expectedDomainMissSearchCalls,
    sourcePolicyViolationCalls: completed.filter(
      (call) => call.metrics?.sourcePolicyAdherent === false
    ).length,
    recoverySignalCalls,
    recoverySignalRate: searchCalls.length
      ? Number((recoverySignalCalls / searchCalls.length).toFixed(2))
      : 0,
    totalResultCount: sumMetric(calls, (call) => call.metrics?.resultCount),
    uniqueUrlCount: new Set(allUrls).size,
    uniqueDomainCount: new Set(allDomains).size,
    duplicateUrlRate: duplicateRate(allUrls),
    expectedDomainsCovered: uniqueValuesFromCallMetrics(calls, 'expectedDomainsMatched'),
    firstSearch: firstSearch
      ? {
          tool: firstSearch.tool,
          resultCount: firstSearch.metrics?.resultCount ?? 0,
          expectedTermHit: firstSearch.metrics?.expectedTermHit,
          expectedDomainHit: firstSearch.metrics?.expectedDomainHit,
          rawOutputTokens: firstSearch.metrics?.rawResponse?.tokens ?? 0,
          normalizedEvidenceTokens: firstSearch.metrics?.normalizedEvidence?.tokens ?? 0,
          domains: firstSearch.metrics?.domains ?? [],
          urls: firstSearch.metrics?.urls ?? [],
        }
      : undefined,
    totalConnectMs: completed.reduce((sum, call) => sum + (call.connectMs ?? 0), 0),
    totalCallLatencyMs: completed.reduce((sum, call) => sum + (call.latencyMs ?? 0), 0),
    argumentTokens,
    rawOutputTokens: rawTokens,
    normalizedEvidenceTokens: evidenceTokens,
    evidenceToRawTokenRatio: rawTokens
      ? Number((evidenceTokens / rawTokens).toFixed(4))
      : 0,
    avgRawOutputTokensPerCall: completed.length
      ? Number((rawTokens / completed.length).toFixed(2))
      : 0,
    rawOutputOutlierThresholdTokens: RAW_OUTPUT_OUTLIER_THRESHOLD_TOKENS,
    rawOutputOutlierCalls: completed.filter(
      (call) =>
        (call.metrics?.rawResponse?.tokens ?? 0) >
        RAW_OUTPUT_OUTLIER_THRESHOLD_TOKENS
    ).length,
    maxRawOutputCall,
    avgResultsPerSearchCall: searchCalls.length
      ? Number(
          (
            searchCalls.reduce(
              (sum, call) => sum + (call.metrics?.resultCount ?? 0),
              0
            ) / searchCalls.length
          ).toFixed(2)
        )
      : 0,
    totalTrajectoryTokens:
      (tools?.metrics?.totalMcpFootprintTokens ?? 0) + argumentTokens + rawTokens,
    contract: tools?.metrics,
  };
}
