# Firecrawl Search API fields from official docs only

Source used: https://docs.firecrawl.dev/api-reference/endpoint/search

The Firecrawl Search endpoint combines web search with Firecrawl scraping. By default it returns result metadata such as URL, title, and description; adding `scrapeOptions` can request full page content such as markdown.

## `categories`

The docs say `categories` filters search results by specific categories. The documented categories are:

- `github`: search within GitHub repositories, code, issues, and documentation.
- `research`: search academic and research websites such as arXiv, Nature, IEEE, and PubMed.
- `pdf`: search for PDFs.

The v2 OpenAPI schema describes `categories` as an array whose items are category objects with a `type` of `github`, `research`, or `pdf`. It says the default is `[]`, meaning results are not filtered by category. The prose example shows:

```json
{
  "query": "machine learning",
  "categories": ["github", "research"],
  "limit": 10
}
```

The docs also show category-aware responses where each result can include a `category` field indicating the source category, such as `github` or `research`.

## `country`

The docs say `country` specifies the country for search results using ISO country codes. The default is `US`.

Examples listed by the docs include `US`, `DE`, `FR`, `JP`, `UK`, and `CA`. The OpenAPI description says it is an ISO country code for geo-targeting search results and recommends setting both `country` and `location` for best results.

Example:

```json
{
  "query": "restaurants",
  "country": "DE"
}
```

## `timeout`

The v2 OpenAPI schema lists top-level `timeout` as an integer field described as "Timeout in milliseconds" with a default of `60000`.

There is also a scrape-specific `timeout` under `scrapeOptions`, but the Search request's top-level `timeout` is the field relevant to the Search API request itself.

## `ignoreInvalidURLs`

The v2 OpenAPI schema lists `ignoreInvalidURLs` as a boolean with default `false`.

Its description says it excludes URLs from the search results that are invalid for other Firecrawl endpoints. The docs explain this helps reduce errors when piping data from Search into other Firecrawl API endpoints.
