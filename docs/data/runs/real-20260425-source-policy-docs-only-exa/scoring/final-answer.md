# Source-Policy Docs-Only Answer

Using only official Firecrawl docs from `docs.firecrawl.dev`:

- `categories`: Firecrawl Search supports a `categories` parameter to filter search results. The documented categories are `github` for GitHub repositories, code, issues, and documentation; `research` for academic and research websites such as arXiv, Nature, IEEE, and PubMed; and `pdf` for PDFs. The docs also show a `categories: ["github", "research"]` example and say category responses can include a `category` field indicating the result source. Evidence: https://docs.firecrawl.dev/api-reference/endpoint/search and https://docs.firecrawl.dev/features/search

- `country`: Firecrawl Search supports a `country` parameter for geo-targeting search results using ISO country codes. The documented default is `US`, with examples including `US`, `DE`, `FR`, `JP`, `UK`, and `CA`. The OpenAPI text also says best results come from setting both `country` and `location`. Evidence: https://docs.firecrawl.dev/api-reference/endpoint/search

- `timeout`: The Search API request schema includes `timeout` as an integer described as "Timeout in milliseconds", with default `60000`. Evidence: https://docs.firecrawl.dev/api-reference/endpoint/search

- `ignoreInvalidURLs`: The Search API request schema includes `ignoreInvalidURLs` as a boolean, default `false`. It excludes URLs from search results that are invalid for other Firecrawl endpoints, which helps reduce errors when piping Search output into other Firecrawl API endpoints. Evidence: https://docs.firecrawl.dev/api-reference/endpoint/search

Source policy: all evidence used above is from `docs.firecrawl.dev`.
