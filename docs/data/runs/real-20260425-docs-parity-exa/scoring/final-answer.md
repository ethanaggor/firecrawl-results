# Docs Parity Answer

For MCP search parity, the public Firecrawl Search API surface to mirror is the v2 `/search` request and response shape from the Search API reference, with v1 docs/source useful for confirming legacy behavior.

Key request fields:

- `query`: required search query. In v2 OpenAPI it is a string with `maxLength: 500`.
- `limit`: maximum results. v2 defaults to `10`, maximum `100`, minimum `1`; v1 defaults to `5`, maximum `100`, minimum `1`.
- `sources`: v2-only result source selector. It determines which arrays appear under `data`; default is `["web"]`. Supported source types in the docs are `web`, `images`, and `news`.
- `categories`: v2 category filter. The prose docs say categories can filter to `github`, `research`, and `pdf`, and show an example `["github", "research"]`. The embedded v2 OpenAPI schema describes `categories` as an array of typed objects whose `type` enum is `github`, `research`, or `pdf`. This is important for parity because the docs expose the concept clearly, but the prose example and schema shapes differ.
- `tbs`: time-based search parameter for predefined ranges such as `qdr:h`, `qdr:d`, `qdr:w`, `qdr:m`, `qdr:y`, custom ranges such as `cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY`, and date sort `sbd:1`.
- `location`: location string for search results. v2 docs recommend setting both `location` and `country` for best geo-targeted results.
- `country`: ISO country code for geo-targeting. v2 docs default it to `US`; examples include `US`, `DE`, `FR`, `JP`, `UK`, and `CA`. The fetched v1 source schema accepts optional `country` and transforms to `us` when neither `country` nor `location` is present.
- `timeout`: top-level search timeout in milliseconds, default `60000` in v2 docs and v1 docs/source. There is also a separate `scrapeOptions.timeout`; MCP parity should not collapse the two because search-level timeout and scrape timeout are distinct controls.
- `ignoreInvalidURLs`: boolean, default `false`. The docs describe it as excluding URLs from search results that are invalid for other Firecrawl endpoints, reducing errors when piping search output into other Firecrawl API endpoints. The v1 source schema also defines `ignoreInvalidURLs: z.boolean().optional().prefault(false)`.
- `enterprise`: v2 docs expose this as an array of `anon` or `zdr` options for Zero Data Retention search. `["zdr"]` is end-to-end ZDR at 10 credits per 10 results; `["anon"]` is anonymized ZDR at 2 credits per 10 results; it must be enabled for the team. The fetched v1 `searchRequestSchema` did not include this field, so it is a v2 public API parity field rather than a v1 source-confirmed field.
- `scrapeOptions`: options for scraping search results. The docs say that without `scrapeOptions`, search defaults to lightweight result fields such as URL/title/description; with scrape formats it can return page content such as markdown, HTML, links, screenshots, audio, and metadata.

Relevant response shape and metadata:

- v2 success response shape is `success`, `data`, optional `warning`, `id`, and `creditsUsed`.
- `data` is an object whose available arrays depend on `sources`; by default it returns `web`. It may also include `images` and `news`.
- `web` result fields include `title`, `description`, `url`, and optional scraped content fields such as `markdown`, `html`, `rawHtml`, `links`, `screenshot`, `audio`, and `metadata`.
- `news` results similarly include article fields such as `title`, `snippet`, `url`, `date`, `imageUrl`, `position`, plus optional scraped content fields and `metadata`.
- `images` results include `title`, `imageUrl`, `imageWidth`, `imageHeight`, `url`, and `position`.
- Scraped-result `metadata` in v2 docs includes `title`, `description`, `sourceURL`, final `url`, `statusCode`, and nullable `error`.
- Category responses can add a `category` field to web results indicating the source category, such as `github` or `research`.
- The fetched v1 source `Document` type has a broader metadata object, including fields such as `sourceURL`, `statusCode`, `scrapeId`, `error`, `numPages`, `contentType`, `timezone`, `proxyUsed`, `cacheState`, `cachedAt`, `creditsUsed`, `postprocessorsUsed`, and `indexId`. For public MCP parity, the documented v2 subset should be the primary response contract, with the source type useful as implementation context.

Evidence:

- https://docs.firecrawl.dev/api-reference/endpoint/search - v2 Search API reference. This provided `country`, `categories`, `timeout`, `ignoreInvalidURLs`, `enterprise`, `sources`, `scrapeOptions`, response `data`, `warning`, `id`, `creditsUsed`, and result `metadata`.
- https://docs.firecrawl.dev/api-reference/v1-endpoint/search - v1 Search API reference. This confirmed legacy `timeout`, `ignoreInvalidURLs`, `scrapeOptions`, and v1 response shape.
- https://docs.firecrawl.dev/features/search - Search feature docs. This confirmed the high-level behavior: search returns titles/descriptions/URLs by default and adds full-page content when `scrapeOptions` is used.
- https://github.com/firecrawl/firecrawl/blob/main/apps/api/src/controllers/v1/types.ts - Firecrawl source. This confirmed the v1 `searchRequestSchema` fields `query`, `limit`, `tbs`, `filter`, `lang`, `country`, `location`, `timeout`, `ignoreInvalidURLs`, `scrapeOptions`, and the v1 `SearchResponse`/`Document.metadata` implementation shape.
