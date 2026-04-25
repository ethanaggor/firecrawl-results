# Firecrawl Search API Fields Relevant to MCP Search Parity

The public Firecrawl Search API documentation shows the search request body includes:

```json
{
  "query": "<string>",
  "limit": 10,
  "sources": ["web"],
  "categories": [{ "type": "github" }],
  "tbs": "<string>",
  "location": "<string>",
  "country": "US",
  "timeout": 60000,
  "ignoreInvalidURLs": false,
  "enterprise": ["anon"],
  "scrapeOptions": {}
}
```

Primary evidence: `https://docs.firecrawl.dev/api-reference/endpoint/search`.

For MCP parity, the relevant public Search API fields are:

- `categories`: Search supports category filters, with docs showing an object shape like `{ "type": "github" }`. CLI evidence also exposes `--categories` with `github`, `research`, and `pdf`. The extracted MCP docs source did not list `categories` under search options, so this is a likely parity gap if the MCP search contract omits it.
- `country`: Search supports an ISO country code for geo-targeting, with docs saying best results use both `country` and `location`. CLI evidence exposes `--country <code>` with default `US`. The extracted MCP docs source listed `location`, but did not list `country`, so `country` is another parity-relevant field.
- `timeout`: Search supports a timeout in milliseconds, with docs showing `60000`; CLI evidence exposes `--timeout <ms>`. The extracted MCP docs source did not show `timeout` for the search tool, so this should be checked for parity.
- `ignoreInvalidURLs`: Search supports excluding URLs that are invalid for other Firecrawl endpoints, useful when piping search results into scrape/crawl flows. CLI evidence exposes `--ignore-invalid-urls`. The visible MCP docs source did not list this under search options, so it is parity-relevant.
- `enterprise`: Search supports enterprise/ZDR options. The docs describe `["zdr"]` for end-to-end ZDR and `["anon"]` for anonymized ZDR, and say these must be enabled for the team. The GitHub MCP docs source lists `enterprise` as an array of enterprise options (`default`, `anon`, `zdr`), so this appears represented in the MCP docs source.
- `scrapeOptions`: The public API request includes `scrapeOptions`; the GitHub MCP docs source also lists `scrapeOptions` as options for scraping search result pages. This is directly relevant because it changes the returned content shape and context budget.
- `sources`, `tbs`, `location`, and `limit`: These are also part of the public search surface and are already visible in the GitHub MCP docs source as search options.

Response metadata is also parity-relevant. The Search API response shows `success: true` and `data.web[]` results with fields such as `title`, `description`, `url`, optional scraped content fields like `markdown`, `html`, `rawHtml`, `links`, `screenshot`, `audio`, and a nested `metadata` object containing fields including `title`, `description`, `sourceURL`, `url`, and `statusCode`. An MCP search implementation aiming for parity should preserve enough of this response metadata to let agents cite sources, inspect scrape status, and choose follow-up calls.

Key evidence URLs:

- `https://docs.firecrawl.dev/api-reference/endpoint/search`
- `https://docs.firecrawl.dev/sdks/cli`
- `https://github.com/firecrawl/cli`
- `https://github.com/firecrawl/firecrawl-docs/blob/main/mcp-server.mdx`
- `https://github.com/firecrawl/firecrawl/blob/main/apps/api/src/controllers/v2/types.ts`

The strongest answer is supported by the Firecrawl API docs plus CLI/MCP GitHub docs. The one weaker source was the `types.ts` extraction, which returned `ignoreInvalidURLs` from other API schemas rather than a clean search schema excerpt; I treated that as non-primary support and relied on the docs plus MCP docs source instead.
