import { z } from 'zod';
import type {
  FirecrawlSearchRequest,
  SearchCategory,
  SearchSource,
} from './types.js';

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Expected date in YYYY-MM-DD format',
});

const sourcePolicySchema = z
  .object({
    includeDomains: z.array(z.string().min(1)).max(50).optional(),
    excludeDomains: z.array(z.string().min(1)).max(50).optional(),
  })
  .strict()
  .optional();

const sourceSchema = z.union([
  z.enum(['web', 'news', 'images']),
  z
    .object({
      type: z.enum(['web', 'news', 'images']),
    })
    .strict(),
]);

const categorySchema = z.union([
  z.enum(['github', 'research', 'pdf']),
  z
    .object({
      type: z.enum(['github', 'research', 'pdf']),
    })
    .strict(),
]);

const advancedSearchOptionsSchema = z
  .object({
    tbs: z.string().min(1).optional(),
    filter: z.string().min(1).optional(),
  })
  .strict();

const parserSchema = z.union([
  z.literal('pdf'),
  z
    .object({
      type: z.literal('pdf'),
      mode: z.enum(['fast', 'auto', 'ocr']).optional(),
      maxPages: z.number().int().min(1).max(10000).optional(),
    })
    .strict(),
]);

export const advancedScrapeOptionsSchema = z
  .object({
    onlyMainContent: z.boolean().optional(),
    includeTags: z.array(z.string().min(1)).optional(),
    excludeTags: z.array(z.string().min(1)).optional(),
    maxAge: z.number().int().min(0).optional(),
    timeout: z.number().int().min(1000).max(300000).optional(),
    parsers: z.array(parserSchema).optional(),
    removeBase64Images: z.boolean().optional(),
    blockAds: z.boolean().optional(),
    proxy: z.enum(['basic', 'enhanced', 'auto']).optional(),
    storeInCache: z.boolean().optional(),
  })
  .strict();

export const searchContextSchema = z
  .object({
    query: z.string().min(1).max(500),
    content: z
      .enum(['results', 'summary', 'chunks', 'markdown'])
      .default('summary'),
    maxResults: z.number().int().min(1).max(100).default(5),
    maxCharsPerResult: z.number().int().min(200).max(50000).default(2000),
    maxCharsTotal: z.number().int().min(500).max(200000).default(10000),
    focus: z.string().min(1).max(1000).optional(),
    freshness: z
      .union([
        z.enum(['hour', 'day', 'week', 'month', 'year']),
        z
          .object({
            startDate: dateOnlySchema.optional(),
            endDate: dateOnlySchema.optional(),
            sortByDate: z.boolean().optional(),
          })
          .strict(),
      ])
      .optional(),
    sourcePolicy: sourcePolicySchema,
    sources: z.array(sourceSchema).min(1).default(['web']),
    categories: z.array(categorySchema).optional(),
    country: z.string().min(2).max(2).optional(),
    location: z.string().min(1).optional(),
    timeout: z.number().int().min(1000).max(300000).optional(),
    ignoreInvalidURLs: z.boolean().default(true),
    enterprise: z.array(z.enum(['default', 'anon', 'zdr'])).optional(),
    advancedSearchOptions: advancedSearchOptionsSchema.optional(),
    advancedScrapeOptions: advancedScrapeOptionsSchema.optional(),
    includeRawResults: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.content === 'results') {
      if (value.advancedScrapeOptions) {
        ctx.addIssue({
          code: 'custom',
          path: ['advancedScrapeOptions'],
          message:
            'advancedScrapeOptions only applies when content is summary, chunks, or markdown',
        });
      }
    }

    if (value.freshness && value.advancedSearchOptions?.tbs) {
      ctx.addIssue({
        code: 'custom',
        path: ['advancedSearchOptions', 'tbs'],
        message:
          'advancedSearchOptions.tbs cannot be combined with freshness because both set the Search API tbs parameter',
      });
    }
  });

type TypedValue<T extends string> = T | { type: T };

function normalizeTypedValues<T extends string>(
  value: Array<TypedValue<T>> | undefined
): T[] | undefined {
  return value?.map((item) => (typeof item === 'string' ? item : item.type));
}

export function parseSearchContextInput(input: unknown): FirecrawlSearchRequest {
  const parsed = searchContextSchema.parse(input);
  return {
    ...parsed,
    sources: normalizeTypedValues<SearchSource>(parsed.sources) ?? ['web'],
    categories: normalizeTypedValues<SearchCategory>(parsed.categories),
  } as FirecrawlSearchRequest;
}
