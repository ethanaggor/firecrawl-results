# Hard Product Comparison: Firecrawl, Exa, Parallel, and Tavily for Agent Web Questions

For an agent answering hard web questions, the main difference is not just index quality. It is the shape of the context returned to the agent and how many tool calls the agent needs before it has evidence it can reason over.

## Short Answer

Firecrawl is strongest as a broad web data toolkit: search, scrape, map, crawl, extract, agent, browser, and interaction tools are all exposed through MCP. In this `firecrawl-original` trajectory, the search result shape was compact but shallow: mostly `url`, `title`, `description`, `position`, and occasional `category`. That made it good for finding candidate URLs, but the agent usually needed follow-up `firecrawl_scrape` calls to get enough evidence. Scrape quality was useful, but full-page markdown was often very large and included navigation/chrome, so context budgeting became the main cost.

Exa presents a more search-specialized MCP shape. Its default MCP tools are `web_search_exa` and `web_fetch_exa`, with `web_search_advanced_exa` optionally enabled for category filters, domain restrictions, date ranges, highlights, summaries, and subpage crawling. Its benchmark pages frame quality around LLM-facing retrieval: SimpleQA factuality, MSMARCO-style result relevance, coding-agent WebCode tasks, extraction completeness, structure, code/table recall, highlights, groundedness, and citation precision.

Parallel is the most aggressively agent-loop optimized in the gathered evidence. Its Search MCP has two tools, `web_search` and `web_fetch`; search runs in `basic` mode for low latency, caps total excerpts around 25,000 characters, and returns dense query-relevant excerpts instead of raw HTML, SEO snippets, or full-page text. Parallel's benchmark page explicitly argues that dense excerpts reduce tool calls, token cost, and latency, and its WISER-Search benchmark compares Parallel MCP, Exa MCP/tool calling, and native search across hard current/business questions.

Tavily is the most explicit about search-mode tradeoffs. Its MCP exposes `tavily-search` and `tavily-extract`; remote MCP can use an API-key URL or OAuth, and defaults can be controlled through `DEFAULT_PARAMETERS`. Search behavior is centered on `search_depth`: `ultra-fast`, `fast`, `basic`, and `advanced` trade latency, relevance, and whether result content is summaries or reranked chunks. Tavily's API response shape includes answer/result fields, `score`, `raw_content`, `response_time`, `auto_parameters`, usage, and request id. Its public search-evals repo covers SimpleQA and document relevance evaluations.

## Context Shape

Firecrawl:

- MCP surface in this run: 14 tools, 1 search tool, 2 fetch-style tools, 11,221 total MCP footprint tokens.
- Search output in step 001 returned a SERP-like object with URL/title/description/position. It was compact, but did not include relevance scores, dense excerpts, highlights, or answer-ready context.
- Docs evidence: Firecrawl's Search page says `/search` returns titles, descriptions, and URLs, and `scrapeOptions` can retrieve full-page markdown, HTML, links, or screenshots for each result.
- Scrape evidence was useful but large: Firecrawl MCP docs scrape was 13,911 raw-response tokens; Firecrawl Search docs scrape was 8,240 raw-response tokens.

Exa:

- Default MCP tools: `web_search_exa` and `web_fetch_exa`.
- Optional advanced tool: `web_search_advanced_exa`, with domain restrictions, date ranges, highlights, summaries, and subpage crawling.
- Context is designed for clean ready-to-use content and fetchable markdown, with advanced controls for more precise retrieval.

Parallel:

- MCP shape is intentionally small: `web_search` and `web_fetch`.
- Search MCP docs say it uses `basic` mode for low-latency agent loops and caps total excerpts per call around 25,000 characters.
- Its public pages repeatedly emphasize dense, query-relevant excerpts and native markdown as the agent-facing context shape.

Tavily:

- MCP tools: `tavily-search` and `tavily-extract`.
- Search API shape includes `answer`, `results[].content`, `score`, `raw_content`, `response_time`, `auto_parameters`, and usage.
- `search_depth` determines both quality/latency and content shape: `basic` and `ultra-fast` return content summaries, while `fast` and `advanced` return chunks; `advanced` has highest relevance but higher latency and cost.

## Tool-Call Flow

Firecrawl:

- Best flow from this run was search first, then scrape selected official pages.
- Direct search found useful Firecrawl/Parallel/Tavily candidates, but mixed in third-party results and missed Exa in the broad query.
- Targeted official-domain searches and direct scrapes were needed for a complete answer.
- The MCP gives many ways to proceed, but the large tool surface and large scrape outputs increase agent context overhead.

Exa:

- Intended flow is search, fetch, and optionally advanced search when the task needs filtering, highlights, summaries, or crawl-like behavior.
- The available tool split is clear and search-specific.

Parallel:

- Intended flow is simple: call `web_search`; use `web_fetch` only when a known URL needs deeper reading.
- Parallel docs intentionally avoid separate date/domain parameters in MCP and recommend expressing those constraints in the query/objective, because they found dedicated knobs can overconstrain results when agents overuse them.

Tavily:

- Intended flow is `tavily-search` with tuned `search_depth`, then `tavily-extract` or raw content when deeper reading is required.
- Agents must manage the depth/cost tradeoff: `auto_parameters` can set `search_depth` to `advanced`, but the docs warn that this costs 2 credits and can be overridden with explicit `basic`.

## Retrieval Quality

Firecrawl-original in this trajectory:

- Official coverage was ultimately good. The run gathered Firecrawl docs, Exa docs/benchmarks, Parallel docs/benchmarks, Tavily docs, and Tavily's official search-evals repository.
- Retrieval required refinement. Broad search had useful hits but also third-party/social/marketplace noise. Exa required a targeted search for the MCP docs. Parallel targeted search initially surfaced `docs.parallel.ai/llms-full.txt` rather than the canonical Search MCP page.
- Scrape retrieved the needed evidence, but long full-page markdown created large context cost.

Exa evidence:

- Exa says its search engine is built from the ground up for LLM use.
- Its API evals use SimpleQA and MSMARCO-style LLM-judged relevance over 1,000 sampled queries.
- WebCode separates contents quality and retrieval quality, evaluates highlights/groundedness/citation precision, and includes end-to-end coding-agent tasks.

Parallel evidence:

- Parallel's benchmark frames agent search around dense excerpts, fewer tool calls, lower token cost, and lower latency.
- WISER-Search blends WISER-Fresh and WISER-Atomic tasks across breaking news, financial data, technical documentation, and competitive intelligence.
- Parallel reports higher accuracy/lower total cost for Parallel MCP than compared native and Exa MCP/tool-calling baselines in that benchmark.

Tavily evidence:

- Tavily's docs expose relevance/latency as a product surface through `search_depth`.
- Its search-evals repo benchmarks SimpleQA and document relevance, with Tavily reporting 93.3% SimpleQA accuracy and 83.02% document relevance accuracy in the README.
- Tavily exposes scores, response time, usage, and auto-selected parameters, which makes post-processing and cost inspection more direct than Firecrawl's original search output.

## Key URLs

- https://docs.firecrawl.dev/mcp-server
- https://docs.firecrawl.dev/features/search
- https://exa.ai/docs/reference/exa-mcp
- https://exa.ai/blog/api-evals
- https://exa.ai/blog/webcode
- https://docs.parallel.ai/integrations/mcp/search-mcp
- https://parallel.ai/blog/search-api-benchmark
- https://parallel.ai/blog/free-web-search-mcp
- https://docs.tavily.com/documentation/mcp
- https://docs.tavily.com/documentation/best-practices/best-practices-search
- https://docs.tavily.com/documentation/api-reference/endpoint/search
- https://github.com/tavily-ai/tavily-search-evals

## Bottom Line

For hard web questions, Firecrawl-original can get to the answer, especially when the agent can follow search with high-quality page scrapes. Its weakness is that search results are not very evidence-dense, so the agent often pays for extra scrape calls and large markdown payloads. Exa looks strongest where semantic/code retrieval and grounded highlight quality matter. Parallel looks strongest for low-friction agent loops because it intentionally returns dense excerpts and tries to reduce follow-up calls. Tavily looks strongest when the agent wants explicit mode control, relevance scores, answer/raw-content toggles, and visible latency/cost tradeoffs.
