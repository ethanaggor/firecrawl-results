# Answer

Using only the official Firecrawl Search API docs at https://docs.firecrawl.dev/api-reference/endpoint/search:

- `categories`: Filters search results by specific categories. The documented categories are `github` for GitHub repositories, code, issues, and documentation; `research` for academic/research websites such as arXiv, Nature, IEEE, and PubMed; and `pdf` for PDFs. In the body schema, `categories` defaults to `[]`, meaning results are not filtered by any categories. The docs also say each result includes a `category` field indicating its source.
- `country`: Specifies the country for search results using ISO country codes. The docs list the default as `"US"` and show examples including `"US"`, `"DE"`, `"FR"`, `"JP"`, `"UK"`, and `"CA"`. The body schema describes it as an ISO country code for geo-targeting and says that for best results, set both `country` and `location`.
- `timeout`: An integer timeout in milliseconds. The body schema lists the default as `60000`, and the request example shows `"timeout": 60000`.
- `ignoreInvalidURLs`: A boolean that defaults to `false`. The docs say it excludes URLs from search results that are invalid for other Firecrawl endpoints, which helps reduce errors when piping search results into other Firecrawl API endpoints. The request example shows `"ignoreInvalidURLs": false`.

Evidence came from the Search endpoint page only: https://docs.firecrawl.dev/api-reference/endpoint/search.
