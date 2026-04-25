Using only official Firecrawl docs from `docs.firecrawl.dev`, the Search API says:

## `categories`

`categories` filters search results by specific categories. The official Search docs list three supported category values:

- `github`: search within GitHub repositories, code, issues, and documentation.
- `research`: search academic and research websites such as arXiv, Nature, IEEE, and PubMed.
- `pdf`: search for PDFs.

The API reference example shows:

```json
{
  "query": "machine learning",
  "categories": ["github", "research"],
  "limit": 10
}
```

The docs also say each result can include a `category` field indicating its source. The OpenAPI excerpt says categories default to `[]`, meaning results are not filtered by any categories.

Sources: `https://docs.firecrawl.dev/api-reference/endpoint/search`, `https://docs.firecrawl.dev/features/search`

## `country`

`country` is an ISO country code used for geo-targeting search results. The API reference says the default is `US` and recommends setting both `country` and `location` for best results.

Source: `https://docs.firecrawl.dev/api-reference/endpoint/search`

## `timeout`

`timeout` is an integer timeout in milliseconds for the Search operation. The API reference excerpt gives a default of `60000`. The Search feature docs show a custom timeout example with `timeout: 30000`, described as a 30-second timeout.

Sources: `https://docs.firecrawl.dev/api-reference/endpoint/search`, `https://docs.firecrawl.dev/features/search`

## `ignoreInvalidURLs`

`ignoreInvalidURLs` is a boolean. The API reference says it excludes URLs from search results that are invalid for other Firecrawl endpoints. The stated purpose is to reduce errors when piping Search results into other Firecrawl API endpoints.

Source: `https://docs.firecrawl.dev/api-reference/endpoint/search`
