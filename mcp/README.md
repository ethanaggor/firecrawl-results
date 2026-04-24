# MCP Patch

`firecrawl-mcp-server-agent-search.patch` captures the MCP implementation changes from the local `firecrawl-mcp-server` workspace.

The patch upgrades `firecrawl_search` in place rather than adding a second overlapping search tool. It adds:

- `content: "results" | "summary" | "chunks" | "markdown"`
- hard context budgets with `maxCharsPerResult` and `maxCharsTotal`
- `focus`, `freshness`, and `sourcePolicy`
- API parity for `categories`, `country`, `timeout`, `ignoreInvalidURLs`, `enterprise`
- `advancedSearchOptions.tbs` and `advancedSearchOptions.filter`
- string and `{ type }` source/category input forms
- flattened results with source metadata
- `searchIds`, `usage.creditsUsed`, and `warnings`

The implementation uses direct `/v2/search` requests because the current published Node SDK does not yet forward every documented Search request field and does not expose the full Search response envelope.
