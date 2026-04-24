export type SearchContentMode = 'results' | 'summary' | 'chunks' | 'markdown';
export type SearchSource = 'web' | 'news' | 'images';
export type SearchCategory = 'github' | 'research' | 'pdf';
export type SearchEnterpriseOption = 'default' | 'anon' | 'zdr';
export type SourcePolicyStrategy = 'compile' | 'fanout' | 'hybrid';

export interface SearchFreshnessRange {
  startDate?: string;
  endDate?: string;
  sortByDate?: boolean;
}

export type SearchFreshness =
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year'
  | SearchFreshnessRange;

export interface SearchSourcePolicy {
  includeDomains?: string[];
  excludeDomains?: string[];
}

export interface AdvancedScrapeOptions {
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  maxAge?: number;
  timeout?: number;
  parsers?: Array<
    | 'pdf'
    | {
        type: 'pdf';
        mode?: 'fast' | 'auto' | 'ocr';
        maxPages?: number;
      }
  >;
  removeBase64Images?: boolean;
  blockAds?: boolean;
  proxy?: 'basic' | 'enhanced' | 'auto';
  storeInCache?: boolean;
}

export interface AdvancedSearchOptions {
  tbs?: string;
  filter?: string;
}

export interface FirecrawlSearchRequest {
  query: string;
  content: SearchContentMode;
  maxResults: number;
  maxCharsPerResult: number;
  maxCharsTotal: number;
  focus?: string;
  freshness?: SearchFreshness;
  sourcePolicy?: SearchSourcePolicy;
  sources: SearchSource[];
  categories?: SearchCategory[];
  country?: string;
  location?: string;
  timeout?: number;
  ignoreInvalidURLs: boolean;
  enterprise?: SearchEnterpriseOption[];
  advancedSearchOptions?: AdvancedSearchOptions;
  advancedScrapeOptions?: AdvancedScrapeOptions;
  includeRawResults: boolean;
}

export interface SearchContextConstraints {
  maxResults: number;
  maxCharsPerResult?: number;
  maxCharsTotal?: number;
  focus?: string;
  freshness?: SearchFreshness;
  sourcePolicy?: SearchSourcePolicy;
  enterprise?: SearchEnterpriseOption[];
  advancedSearchOptions?: AdvancedSearchOptions;
}

export interface SearchContextResult {
  title?: string;
  url: string;
  description?: string;
  position?: number;
  source: SearchSource;
  category?: SearchCategory | string;
  content?: string;
  chunks?: Array<{
    text: string;
    charCount: number;
  }>;
  metadata?: {
    sourceURL?: string;
    finalURL?: string;
    statusCode?: number;
    error?: string;
    imageUrl?: string;
    imageWidth?: number;
    imageHeight?: number;
    date?: string;
  };
}

export interface FirecrawlSearchResponse {
  query: string;
  executedQuery: string;
  content: SearchContentMode;
  constraints: SearchContextConstraints;
  results: SearchContextResult[];
  searchIds?: string[];
  usage: {
    resultCount: number;
    charsReturned: number;
    creditsUsed?: number;
    rawResultCount?: Partial<Record<SearchSource, number>>;
  };
  warnings?: string[];
  rawResults?: unknown;
}

export interface SearchExecutionOptions {
  apiKey?: string;
  apiUrl?: string;
  origin: string;
  sourcePolicyStrategy?: SourcePolicyStrategy;
  log?: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

export interface FirecrawlSearchCall {
  query: string;
  options: Record<string, unknown>;
  label: string;
}

export interface FirecrawlSearchPayload {
  success?: boolean;
  data?: {
    web?: unknown[];
    news?: unknown[];
    images?: unknown[];
  };
  warning?: string | null;
  id?: string;
  creditsUsed?: number;
  error?: string;
  [key: string]: unknown;
}

export interface NormalizedSearchResult {
  title?: string;
  url: string;
  description?: string;
  position?: number;
  source: SearchSource;
  category?: SearchCategory | string;
  summary?: string;
  markdown?: string;
  metadata?: SearchContextResult['metadata'];
  raw: unknown;
}
