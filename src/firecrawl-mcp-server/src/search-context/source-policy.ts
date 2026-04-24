import type { SearchSourcePolicy } from './types.js';

export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

export function getUrlDomain(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return undefined;
  }
}

export function domainMatches(domain: string, policyDomain: string): boolean {
  const normalized = normalizeDomain(domain);
  const policy = normalizeDomain(policyDomain);
  return normalized === policy || normalized.endsWith(`.${policy}`);
}

export function domainAllowedByPolicy(
  domain: string | undefined,
  sourcePolicy?: SearchSourcePolicy
): boolean {
  if (!sourcePolicy) return true;
  if (!domain) return false;

  const include = sourcePolicy.includeDomains?.map(normalizeDomain) ?? [];
  const exclude = sourcePolicy.excludeDomains?.map(normalizeDomain) ?? [];

  if (exclude.some((entry) => domainMatches(domain, entry))) return false;
  if (include.length === 0) return true;
  return include.some((entry) => domainMatches(domain, entry));
}

export function applySourcePolicyToQuery(
  query: string,
  sourcePolicy?: SearchSourcePolicy
): string {
  if (!sourcePolicy) return query;

  const include = (sourcePolicy.includeDomains ?? []).map(normalizeDomain);
  const exclude = (sourcePolicy.excludeDomains ?? []).map(normalizeDomain);
  const includeQuery =
    include.length === 0
      ? ''
      : include.length === 1
        ? `site:${include[0]}`
        : `(${include.map((domain) => `site:${domain}`).join(' OR ')})`;
  const excludeQuery = exclude.map((domain) => `-site:${domain}`).join(' ');

  return [query, includeQuery, excludeQuery].filter(Boolean).join(' ');
}

export function applySingleIncludeDomainToQuery(
  query: string,
  domain: string,
  sourcePolicy?: SearchSourcePolicy
): string {
  const singlePolicy: SearchSourcePolicy = {
    includeDomains: [domain],
    excludeDomains: sourcePolicy?.excludeDomains,
  };
  return applySourcePolicyToQuery(query, singlePolicy);
}
