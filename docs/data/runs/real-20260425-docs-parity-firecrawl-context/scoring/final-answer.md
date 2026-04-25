# Firecrawl Search API docs parity answer

The public Firecrawl v2 Search API surface relevant to MCP search parity includes the following request controls:

- `query`: required search query, maximum length 500.
- `limit`: maximum results to return per source, default 10, range 1 to 100.
- `sources`: source arrays to search, with `web`, `images`, and `news`; the selected sources determine which arrays appear in the response.
- `categories`: category filters for `github`, `research`, and `pdf`. The docs describe these as GitHub, Research, and PDF category objects, and the prose/example also shows string values such as `["github", "research"]`. Each categorized web result can include a `category` field.
- `tbs`: time-based search filter, including predefined ranges such as `qdr:h`, `qdr:d`, `qdr:w`, `qdr:m`, `qdr:y`, custom date ranges, and sort-by-date.
- `location`: free-form geo-targeting string; Firecrawl recommends setting both `location` and `country` for best results.
- `country`: ISO country code for geo-targeting, default `US`.
- `timeout`: integer timeout in milliseconds, default `60000`.
- `ignoreInvalidURLs`: boolean, default `false`; excludes URLs from search results that are invalid for other Firecrawl endpoints, reducing errors when piping search results into other Firecrawl endpoints.
- `enterprise`: enum string array for enterprise/ZDR search behavior. The public docs list `anon` and `zdr`: `["zdr"]` is end-to-end ZDR at 10 credits per 10 results, and `["anon"]` is anonymized ZDR at 2 credits per 10 results; it must be enabled for the team. The GitHub MCP docs page also describes `enterprise` as an array with `default`, `anon`, and `zdr`.
- `scrapeOptions`: options for scraping search results. The request example includes formats, `onlyMainContent`, `maxAge`, `waitFor`, `mobile`, `skipTlsVerification`, scrape `timeout`, PDF parsers, scrape location country, `removeBase64Images`, `blockAds`, `proxy`, `storeInCache`, and profile save settings.

The response metadata relevant to MCP parity is:

- Top-level response: `success`, `data`, optional `warning`, search job `id`, and `creditsUsed`.
- `data`: contains source-specific arrays. The docs state the available arrays depend on the requested `sources`, with `web` returned by default.
- `web` result shape: `title`, `description`, `url`, optional scraped content fields such as `markdown`, `html`, `rawHtml`, `links`, `screenshot`, and `audio`, plus a `metadata` object with `title`, `description`, `sourceURL`, `url`, `statusCode`, and `error`. Category-filtered web results can also include `category`.
- `images` result shape: `title`, `imageUrl`, `imageWidth`, `imageHeight`, `url`, and `position`.
- `news` result shape: `title`, `snippet`, `url`, `date`, `imageUrl`, `position`, optional scraped content fields, and the same scraped-page `metadata` object.

Evidence:

- Firecrawl Search API docs, `https://docs.firecrawl.dev/api-reference/endpoint/search`, returned by the first search and then scraped directly. This page contains the request example with `categories`, `country`, `timeout`, `ignoreInvalidURLs`, `enterprise`, and `scrapeOptions`; the dedicated body sections for `categories`, `country`, `timeout`, `ignoreInvalidURLs`, and `enterprise`; and the response section for `success`, `data`, `warning`, `id`, and `creditsUsed`.
- Firecrawl Search API docs category section says `categories` filters by `github`, `research`, and `pdf`, and that each category result includes a `category` field.
- Firecrawl Search API docs response example shows `web`, `images`, and `news` arrays, including web/news `metadata` with `title`, `description`, `sourceURL`, `url`, `statusCode`, and `error`.
- GitHub source `https://github.com/firecrawl/firecrawl-docs/blob/main/mcp-server.mdx` states that the MCP server integrates Firecrawl and lists the search tool parameters including `query`, `limit`, `location`, `tbs`, `filter`, `sources`, `scrapeOptions`, and `enterprise` with `default`, `anon`, and `zdr`.
- GitHub source `https://github.com/firecrawl/cli` confirms official CLI search options for `categories` as `github`, `research`, `pdf`, `country` as ISO country code default `US`, `timeout` default `60000`, and `--ignore-invalid-urls`.

Parity notes:

- The public API docs default `ignoreInvalidURLs` to `false`. If an MCP schema defaults it to `true`, that is a deliberate MCP behavior difference and should be recorded as non-identical to public API defaults.
- For parity and agent ergonomics, the MCP should preserve `sources`, `categories`, `country`, `timeout`, `ignoreInvalidURLs`, `enterprise`, `scrapeOptions`, and response metadata rather than flattening away category, source, job id, warnings, credits, status code, or source URL information.
