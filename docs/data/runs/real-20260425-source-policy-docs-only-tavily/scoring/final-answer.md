Using only the official Firecrawl docs at https://docs.firecrawl.dev/api-reference/endpoint/search:

- `categories`: The Search API accepts `categories` to filter results by category. The docs say it defaults to `[]`, meaning results are not category-filtered. The documented category values are `github`, `research`, and `pdf`, and the example uses `["github", "research"]`.
- `country`: The Search API accepts an ISO country code for geo-targeting search results, for example `US`. The docs recommend setting both `country` and `location` for best results. Examples shown include `US`, `DE`, `FR`, `JP`, `UK`, and `CA`.
- `timeout`: The Search API accepts a timeout value in milliseconds. The request example shows `"timeout": 60000`.
- `ignoreInvalidURLs`: The Search API uses this option to exclude URLs from search results that are invalid for other Firecrawl endpoints. The docs say this helps reduce errors when piping search results into other Firecrawl API endpoints. The request example shows `"ignoreInvalidURLs": false`.

Evidence domain used: `docs.firecrawl.dev` only.
