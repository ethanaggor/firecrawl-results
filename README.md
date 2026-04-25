# Firecrawl Results

This repo contains the writeup and eval harness for upgrading Firecrawl's MCP search surface into an agent-native context tool.

The core idea is narrow:

- Firecrawl already has strong search and scrape primitives.
- The MCP search tool should expose those primitives through a bounded context contract that is easier for agents to query.
- API parity fixes should stay separate from product-level contract decisions.

## Contents

- `docs/` - static GitHub Pages blog.
- `evals/` - tracked Node-based eval runner and representative tasks.
- `issues/` - links to upstream parity/enhancement issues filed during the audit.

## Implementation

The runnable MCP server implementation lives in a fork of the Firecrawl MCP server:

https://github.com/ethanaggor/firecrawl-mcp-server/tree/agent-search-context

The server diff is reviewable against upstream here:

https://github.com/firecrawl/firecrawl-mcp-server/compare/main...ethanaggor:firecrawl-mcp-server:agent-search-context

## Run Evals

Build the MCP repo first:

```bash
cd ../firecrawl-mcp-server
pnpm install --frozen-lockfile
pnpm run build
```

Run the smoke suite from this repo:

```bash
node evals/run.mjs --suite=smoke --mcp-root=../firecrawl-mcp-server
```

Run the source policy suite:

```bash
node evals/run.mjs --suite=source-policy --mcp-root=../firecrawl-mcp-server
```

The runner writes JSON reports to `evals/reports/`.

## Published Issues

- SDK request parity: https://github.com/firecrawl/firecrawl/issues/3437
- SDK response metadata: https://github.com/firecrawl/firecrawl/issues/3438
- MCP search parity: https://github.com/firecrawl/firecrawl-mcp-server/issues/219
- Search ZDR docs/API mismatch: https://github.com/firecrawl/firecrawl/issues/3441
