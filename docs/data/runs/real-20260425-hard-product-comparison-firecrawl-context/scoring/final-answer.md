# Hard Product Comparison: Agent-Facing Search

Run id: `real-20260425-hard-product-comparison-firecrawl-context`

Provider under test: `firecrawl-context`

Agent model recorded: `gpt-5.5 xhigh`

## Answer

For hard web questions, Firecrawl, Exa, Parallel, and Tavily differ less by the abstract idea of "search" and more by the shape of context they hand back to an agent and how much follow-up work the agent must perform before it can reason safely.

| Provider | Agent-facing context shape | Natural tool-call flow | Retrieval quality evidence |
| --- | --- | --- | --- |
| Firecrawl | Search can return result metadata and, through the Search API, scraped page content such as markdown, links, metadata, and other scrape formats. The `firecrawl-context` MCP fork also exposes explicit `results`, `summary`, `chunks`, and capped `markdown` modes with source-policy and character-budget controls. | Search when the URL is unknown, map when an official/docs site needs URL discovery, scrape exact pages for full evidence. Search can combine discovery and content retrieval, but exact scrape remains the most reliable follow-up. | Strong exact-page evidence collection once URLs are known. In this trajectory, open-ended/product-comparison search quality was mixed: the broad search returned GitHub directory noise, and several official-domain searches returned zero results before map+scrape recovered the answer. |
| Exa | MCP defaults to `web_search_exa` and `web_fetch_exa`; optional `web_search_advanced_exa` adds domain/date controls, highlights, summaries, and subpage crawling. API responses can include `text`, `highlights`, `highlightScores`, `summary`, `subpages`, `context`, synthesized output, and cost metadata. | Search first, then fetch/read selected URLs. Use advanced search when the agent needs strict domains, dates, summaries, or highlights. | Exa publishes broad retrieval evals on SimpleQA and MSMARCO, and a WebCode benchmark that separates contents quality, highlight groundedness, retrieval quality, and end-to-end coding-agent task performance. This is the strongest public methodology evidence for code-agent retrieval quality. |
| Parallel | Search MCP is deliberately narrow: `web_search` returns ranked URLs plus dense query-relevant excerpts, and `web_fetch` returns token-efficient markdown for selected URLs. Docs state Search MCP runs Search API in `basic` mode and caps total excerpts per call at roughly 25,000 characters. | Search first, pick the best candidates, fetch only where more detail is needed. Parallel positions the search result itself as dense enough to reduce extra fetch/extract/rerank steps. | Parallel's WISER-Search benchmark explicitly evaluates agents on accuracy, cost, fewer tool calls, and dense excerpts. It reports higher accuracy and lower total cost than native search and Exa MCP/tool-calling across several models, but the benchmark is provider-authored. |
| Tavily | Search API returns an answer, scored results, `content`, optional raw content, favicons/images, response time, auto parameters, and usage. `search_depth` controls both latency/relevance and context shape: `basic` and `ultra-fast` return general content summaries, while `fast` and `advanced` return reranked chunks; `advanced` supports `chunks_per_source`. | Choose `search_depth` based on the task, keep queries short, split complex questions into subqueries, then use Extract for full page content when the search result is not enough. | Tavily's official search-evals repo covers SimpleQA and document relevance and reports Tavily ahead of Exa, Brave, Google/Serper, and Perplexity Search in those evals. Docs are unusually explicit that quality depends on selecting the right search depth. |

## Bottom Line

For an agent answering hard web questions:

Parallel has the cleanest agent loop on paper: a small two-tool MCP, dense excerpts, token caps, and a benchmark framed around agent accuracy, cost, and fewer calls.

Exa has the richest evidence model and the strongest public methodology for coding-agent retrieval: highlights, summaries, subpages, content quality metrics, groundedness, and code-agent evals. Its surface is more configurable and can require more decisions.

Tavily gives a clear search-depth dial. It is agent-friendly when the caller deliberately chooses between low-latency summaries and higher-relevance chunks, but complex questions naturally become multi-call workflows.

Firecrawl is broadest as a web-data tool: search, map, scrape, crawl, extract, browser/interaction, and agent tools. For this run, `firecrawl-context` was excellent once exact URLs were known, but search discovery was weaker than the exact scrape/map path. Its upgraded search contract helps by exposing bounded context modes, source policy, and budgets, but the observed retrieval behavior still needed recovery calls.

## Key Evidence URLs

- https://docs.firecrawl.dev/features/search
- https://docs.firecrawl.dev/mcp-server
- https://exa.ai/docs/reference/exa-mcp
- https://exa.ai/docs/reference/search
- https://exa.ai/docs/reference/get-contents
- https://exa.ai/blog/api-evals
- https://exa.ai/blog/webcode
- https://docs.parallel.ai/integrations/mcp/search-mcp
- https://parallel.ai/blog/search-api-benchmark
- https://parallel.ai/blog/free-web-search-mcp
- https://docs.tavily.com/documentation/mcp
- https://docs.tavily.com/documentation/api-reference/endpoint/search
- https://docs.tavily.com/documentation/best-practices/best-practices-search
- https://github.com/tavily-ai/tavily-search-evals

## Call Summary

Recorded MCP calls in the trace: 24.

- `firecrawl_search`: 5 recorded calls
- `firecrawl_map`: 5 recorded calls
- `firecrawl_scrape`: 14 recorded calls

An additional scrape invocation was made concurrently during the Firecrawl docs phase and collided on the same recorded step number. I treated that as an unreliable trace artifact and re-ran the affected scrape sequentially; the final evidence relies on the sequentially recorded artifact.

## Failure Modes

- Direct fix and needs no further changes: The broad first search returned GitHub directory pages rather than the expected official product docs and benchmarks. I narrowed to per-vendor official domains and then used map/scrape recovery.
- Direct fix and needs no further changes: Firecrawl docs search with a source-policy constraint returned zero results. `firecrawl_map` found `/features/search` and `/mcp-server`, and exact scrapes supplied the evidence.
- Direct fix and needs no further changes: Parallel official-domain search returned zero results. Mapping `docs.parallel.ai` and `parallel.ai`, then scraping the known Search MCP and benchmark pages, recovered the evidence.
- Direct fix and needs no further changes: Tavily official-domain search returned zero results. Mapping `docs.tavily.com` found the MCP, Search API, and best-practices pages.
- Direct fix and needs no further changes: Two scrape calls were launched in parallel against the same run, and the harness reported the same step number for both. I stopped using parallel harness calls and re-ran the affected page sequentially.
- Fixed but could benefit from cleaner/simpler implementation with an architectural change: Exact scrapes of docs and blog pages produced large raw responses. A cleaner benchmark harness could use provider-native page-section extraction or stable post-scrape summarization while still preserving evidence links.
