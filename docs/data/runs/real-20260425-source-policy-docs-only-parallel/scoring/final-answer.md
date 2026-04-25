Using only official Firecrawl docs from `docs.firecrawl.dev`:

- `categories` filters Search API results by category. The documented categories are `github` for GitHub repositories/code/issues/documentation, `research` for academic and research websites, and `pdf` for PDFs. The OpenAPI text says it defaults to `[]`, meaning no category filtering. Search results can include a `category` field indicating the source category.
- `country` is an ISO country code used for geo-targeting search results. The Search API docs list default `US` and examples such as `US`, `DE`, `FR`, `JP`, `UK`, and `CA`. The OpenAPI text also says that for best results it should be set together with `location`.
- `timeout` is an integer timeout in milliseconds. The OpenAPI text lists the default as `60000`; the feature docs show setting `timeout: 30000` for a 30-second search timeout.
- `ignoreInvalidURLs` is a boolean that excludes URLs from search results when those URLs are invalid for other Firecrawl endpoints. The docs say this helps reduce errors when search results are piped into other Firecrawl API endpoints.

Evidence:

- https://docs.firecrawl.dev/api-reference/endpoint/search
- https://docs.firecrawl.dev/features/search
