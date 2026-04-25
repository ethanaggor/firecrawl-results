# Firecrawl Search API Fields Relevant to MCP Search Parity

Primary evidence:

- Firecrawl Search API docs: https://docs.firecrawl.dev/api-reference/endpoint/search
- Firecrawl MCP docs source on GitHub: https://github.com/firecrawl/firecrawl-docs/blob/main/mcp-server.mdx
- Live `firecrawl-original` MCP schema captured for this run: `evals/runs/real-20260425-docs-parity-firecrawl-original/schemas/tools.json`

## Public Search API fields

The public Firecrawl v2 Search API request body includes these parity-relevant fields:

- `query`: required search query.
- `limit`: result count, default `10`, valid range `1 <= x <= 100`.
- `sources`: source arrays such as `web`, `images`, and `news`; the selected sources determine which arrays appear in the response.
- `categories`: filters results by category. The docs list GitHub, Research, and PDF categories; the category section says `github` searches GitHub repositories, code, issues, and documentation, `research` searches academic/research sites, and `pdf` searches PDFs. The body schema says it defaults to `[]`, meaning no category filtering.
- `tbs`: time-based search, including `qdr:h`, `qdr:d`, `qdr:w`, `qdr:m`, `qdr:y`, custom `cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY`, and sort-by-date `sbd:1`.
- `location`: location string for geo-targeted results. The docs recommend setting both `location` and `country` for best results.
- `country`: ISO country code for geo-targeting, default `US`; examples include `US`, `DE`, `FR`, `JP`, `UK`, and `CA`.
- `timeout`: integer timeout in milliseconds, default `60000`.
- `ignoreInvalidURLs`: boolean, default `false`; excludes URLs that are invalid for other Firecrawl endpoints to reduce errors when piping search results into other Firecrawl APIs.
- `enterprise`: enterprise search options for Zero Data Retention. The API docs list `anon` and `zdr`, with `[ "zdr" ]` for end-to-end ZDR and `[ "anon" ]` for anonymized ZDR. The cURL sample also shows `enterprise: ["anon"]`.
- `scrapeOptions`: options for scraping search results. The docs sample includes formats, main-content extraction, cache age, wait time, mobile, TLS behavior, scrape timeout, parsers, scrape location country, base64 image removal, ad blocking, proxy, cache storage, and profile options.

One docs-shape detail matters for parity: the cURL sample shows `categories` as objects like `{ "type": "github" }`, while the narrative example shows `categories: ["github", "research"]`. The API reference body schema describes it as an array of category objects. An MCP parity implementation should choose the actual API contract shape deliberately rather than copying the inconsistent narrative example.

## Response metadata to preserve

The Search API response includes:

- Top-level `success`.
- Top-level `data`, with arrays such as `web`, `images`, and `news` depending on requested sources.
- Top-level `warning`, nullable string, for issues during the search.
- Top-level `id`, the search job id.
- Top-level `creditsUsed`, the number of credits used.

For `web` and `news` results, the documented result shape can include:

- `title`, `description` or `snippet`, `url`, and for news `date`, `imageUrl`, and `position`.
- Scraped content fields when requested, including `markdown`, `html`, `rawHtml`, `links`, `screenshot`, and `audio`.
- Nested `metadata` with `title`, `description`, `sourceURL`, `url`, `statusCode`, and `error`.

For image results, the documented shape includes `title`, `imageUrl`, `imageWidth`, `imageHeight`, `url`, and `position`.

For category-filtered results, the docs show a per-result `category` field, for example `github` or `research`. That field is relevant for MCP parity because an agent needs to know why a result was returned and whether the category filter worked.

## Original MCP parity gaps

The live `firecrawl-original` MCP `firecrawl_search` schema exposes:

- `query`
- `limit`
- `tbs`
- `filter`
- `location`
- `sources`
- `scrapeOptions`
- `enterprise`

It does not expose these public Search API fields at top level:

- `categories`
- `country`
- `timeout`
- `ignoreInvalidURLs`

Because the MCP schema has `additionalProperties: false`, an agent cannot safely pass those missing API fields through the original MCP search tool. The original MCP schema also does not expose `timeout` inside `scrapeOptions`, even though the public Search API sample includes `scrapeOptions.timeout`.

The official Firecrawl MCP docs source on GitHub confirms the narrower MCP search surface: its Search Tool options list `query`, `limit`, `location`, `tbs`, `filter`, `sources`, `scrapeOptions`, and `enterprise`. It does not list `categories`, top-level `country`, top-level `timeout`, or `ignoreInvalidURLs`.

## Parity conclusion

For MCP search parity with the public Firecrawl Search API, the important missing fields are `categories`, top-level `country`, top-level `timeout`, and `ignoreInvalidURLs`. `enterprise` is already exposed by the original MCP schema, and the MCP docs describe options `default`, `anon`, and `zdr`; the public API docs emphasize `anon` and `zdr`.

A parity-oriented MCP search contract should also preserve response metadata rather than returning only title/description/url snippets. In particular, it should preserve top-level `warning`, `id`, and `creditsUsed`, per-result `metadata`, and per-result `category` when category search is used.
