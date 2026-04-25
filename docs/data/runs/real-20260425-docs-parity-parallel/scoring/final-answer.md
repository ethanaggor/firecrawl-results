# Docs Parity Answer

The current public Firecrawl Search API fields relevant to MCP search parity are the v2 Search request fields and the response metadata fields that an MCP wrapper should preserve rather than flatten away.

Primary evidence:

- `https://docs.firecrawl.dev/api-reference/endpoint/search`
- `https://docs.firecrawl.dev/api-reference/v1-endpoint/search`
- `https://github.com/firecrawl/firecrawl`
- `https://github.com/firecrawl/firecrawl-mcp-server`

## Relevant Search API Fields

`categories` is a current v2 Search request field. The docs describe category filtering with `github`, `research`, and `pdf`; the OpenAPI excerpt says categories default to `[]`, meaning no category filtering. The docs also show that each categorized result can include a `category` field indicating the source category, so parity should preserve the result-level `category` value.

`country` is a current v2 top-level Search request field. The docs say it is an ISO country code for geo-targeting, defaulting to `US`, and recommend setting both `country` and `location` for best results. This is distinct from the v1 docs, which primarily expose `location` for geo-targeted search.

`timeout` is a Search request field. The v2 OpenAPI excerpt describes it as an integer timeout in milliseconds with default `60000`; the v1 Search OpenAPI excerpt also exposes a Search-level `timeout` defaulting to `60000`.

`ignoreInvalidURLs` is a Search request field. The docs describe it as a boolean that excludes URLs invalid for other Firecrawl endpoints, helping reduce errors when piping Search results into other Firecrawl API endpoints. The v2 docs show default `false`, and the v1 docs also expose the field.

`enterprise` is a v2 Search request field. The docs describe it as an array of enterprise search options for Zero Data Retention, with enum values `anon` and `zdr`; `["zdr"]` is end-to-end ZDR and `["anon"]` is anonymized ZDR, and the option must be enabled for the team.

`scrapeOptions` remains important for parity because the Search endpoint combines web search with scraping. The v2 docs say `scrapeOptions.formats: [{"type": "markdown"}]` returns complete markdown content, while omitting it defaults to basic result fields such as URL, title, and description; the docs also mention summary format for condensed content.

## Response Metadata

The current v2 response shape matters for MCP parity. The docs show a top-level response with:

- `success`
- `data.web`
- `data.images`
- `data.news`
- `warning`
- `id`
- `creditsUsed`

For scraped web and news results, the docs show content fields such as `markdown`, `html`, `rawHtml`, `links`, `screenshot`, and `audio`, plus `metadata` with:

- `title`
- `description`
- `sourceURL`
- `url`
- `statusCode`
- `error`

The v1 docs also show result `metadata` with `title`, `description`, `sourceURL`, `statusCode`, and `error`, but v2 adds the richer grouped response shape and top-level `id` / `creditsUsed` fields.

## MCP Parity Implication

The official Firecrawl MCP server documentation says `firecrawl_search` searches the web and optionally extracts content from results. Its example currently shows `query`, `limit`, `lang`, `country`, and `scrapeOptions`, and it says the tool returns an array of search results with optional scraped content.

For parity with the public v2 Search API, the MCP search contract should expose and pass through the public Search controls that affect result selection and downstream reliability:

- `categories`
- `country`
- `location`
- `tbs`
- `timeout`
- `ignoreInvalidURLs`
- `enterprise`
- `scrapeOptions`

It should also preserve response metadata and accounting fields that are visible in the public API, especially result `category`, result `metadata`, top-level `warning`, `id`, and `creditsUsed`.

## Evidence Notes

The strongest field-level evidence came from the v2 Firecrawl Search docs fetch. The v1 docs fetch was useful for distinguishing older `location`-centered behavior and confirming `timeout`, `ignoreInvalidURLs`, and `metadata`. The GitHub MCP server README was useful for current MCP-facing exposure, but it only documented an example subset of fields, not the full v2 parity contract.
