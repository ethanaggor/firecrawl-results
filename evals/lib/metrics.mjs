import { countTokens, textStats } from './tokenizer.mjs';
import { evidenceText } from './normalize.mjs';

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

export function contractMetrics(toolsResponse) {
  const tools = toolsResponse?.tools ?? [];
  const descriptionText = tools.map((tool) => tool.description ?? '').join('\n\n');
  const schemaPayload = tools.map((tool) => tool.inputSchema ?? {});
  const allText = JSON.stringify(tools, null, 2);

  return {
    toolCount: tools.length,
    searchToolCount: tools.filter((tool) => /search/i.test(tool.name)).length,
    fetchToolCount: tools.filter((tool) => /fetch|scrape|extract/i.test(tool.name))
      .length,
    descriptionTokens: countTokens(descriptionText),
    schemaTokens: countTokens(schemaPayload),
    totalMcpFootprintTokens: countTokens(allText),
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

  return {
    argument: textStats(args),
    rawResponse: textStats(rawText),
    normalizedEvidence: textStats(normalizedEvidence),
    resultCount: normalized.results.length,
    uniqueUrlCount: uniqueUrls.length,
    uniqueDomainCount: uniqueDomains.length,
    duplicateUrlRate:
      urls.length > 0 ? Number(((urls.length - uniqueUrls.length) / urls.length).toFixed(4)) : 0,
    expectedTermHit: includesAny(normalizedEvidence, task?.expectedTerms),
    expectedDomainHit: task?.expectedDomains?.length
      ? uniqueDomains.some((domain) => domainMatches(domain, task.expectedDomains))
      : undefined,
    domains: uniqueDomains,
    urls: uniqueUrls.slice(0, 20),
  };
}

export function runMetrics({ manifest, calls, tools }) {
  const searchTools = new Set(manifest.provider.searchTools ?? []);
  const fetchTools = new Set(manifest.provider.fetchTools ?? []);
  const completed = calls.filter((call) => call.event === 'tool_call_completed');
  const failed = calls.filter((call) => call.event === 'tool_call_failed');
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

  return {
    provider: manifest.provider.id,
    taskId: manifest.task.id,
    toolCalls: completed.length + failed.length,
    searchCalls: completed.filter((call) => searchTools.has(call.tool)).length,
    fetchCalls: completed.filter((call) => fetchTools.has(call.tool)).length,
    failedCalls: failed.length,
    totalConnectMs: completed.reduce((sum, call) => sum + (call.connectMs ?? 0), 0),
    totalCallLatencyMs: completed.reduce((sum, call) => sum + (call.latencyMs ?? 0), 0),
    argumentTokens,
    rawOutputTokens: rawTokens,
    normalizedEvidenceTokens: evidenceTokens,
    totalTrajectoryTokens:
      (tools?.metrics?.totalMcpFootprintTokens ?? 0) + argumentTokens + rawTokens,
    contract: tools?.metrics,
  };
}
