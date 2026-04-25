# Official Firecrawl Docs Answer

Source used: `https://docs.firecrawl.dev/api-reference/endpoint/search`.

Using only the official Firecrawl Search API docs:

- `categories`: The Search API lists `categories` as a request-body field of type `(GitHub object | Research object | PDF object)[]`. It says the field filters results by category and defaults to `[]`, meaning results are not filtered by any category. The supported categories are `github`, `research`, and `pdf`. The docs describe `github` as searching GitHub repositories, code, issues, and documentation; `research` as searching academic and research websites such as arXiv, Nature, IEEE, and PubMed; and `pdf` as searching for PDFs. The docs also say each categorized result can include a `category` field indicating its source. One example shows `categories: ["github", "research"]`, while the request example/schema shows category objects such as `{ "type": "github" }`.

- `country`: The Search API lists `country` as a string request-body field with default `US`. It is an ISO country code for geo-targeting search results, and the docs recommend setting both `country` and `location` for best results. The docs give examples such as `US`, `DE`, `FR`, `JP`, `UK`, and `CA`, including an example query with `"country": "DE"`.

- `timeout`: The Search API lists `timeout` as an integer request-body field with default `60000`. It is the timeout in milliseconds.

- `ignoreInvalidURLs`: The Search API lists `ignoreInvalidURLs` as a boolean request-body field with default `false`. It excludes URLs from search results that are invalid for other Firecrawl endpoints, which the docs say helps reduce errors when piping search results into other Firecrawl API endpoints.
