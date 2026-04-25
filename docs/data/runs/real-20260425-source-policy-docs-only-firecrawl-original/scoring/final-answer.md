Using only the official Firecrawl Search API docs at https://docs.firecrawl.dev/api-reference/endpoint/search:

- `categories`: The Search API supports a `categories` parameter to filter search results by category. The documented categories are `github` for GitHub repositories/code/issues/documentation, `research` for academic and research sites such as arXiv, Nature, IEEE, and PubMed, and `pdf` for PDFs. The docs also show that returned results can include a `category` field.
- `country`: The Search API supports a `country` parameter for country-specific search results using ISO country codes. The docs list the default as `US` and examples such as `US`, `DE`, `FR`, `JP`, `UK`, and `CA`.
- `timeout`: The Search API request body includes `timeout`, shown as `60000` in the endpoint example. The docs describe it as a timeout in milliseconds.
- `ignoreInvalidURLs`: The Search API request body includes `ignoreInvalidURLs`, shown as `false` in the endpoint example. The docs describe it as a boolean, defaulting to `false`, that excludes URLs from search results when they are invalid for other Firecrawl endpoints.

Evidence domain used: `docs.firecrawl.dev` only.
