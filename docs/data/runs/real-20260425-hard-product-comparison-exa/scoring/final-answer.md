# Hard Product Comparison - Exa Trajectory

Run id: `real-20260425-hard-product-comparison-exa`
Provider: `exa`
Agent model recorded: `gpt-5.5 xhigh`
Task: `hard-product-comparison`

## Answer

For an agent trying to answer hard web questions, Firecrawl, Exa, Parallel, and Tavily differ most in what they try to put into the model context.

Parallel is the most explicitly context-first search product in the evidence gathered: its docs and benchmark pages frame AI search as selecting "what tokens should go in an agent's context window", returning dense, LLM-ready excerpts, and reducing search/scrape/rerank loops. Exa is the most flexible search-and-contents surface: it exposes web search, advanced search controls, targeted highlights, summaries, full text, subpages, freshness/cache controls, and a fetch tool. Tavily is the clearest about an explicit latency/relevance/content-shape tradeoff through `search_depth`: fast modes return quicker, lower-relevance content; advanced modes return reranked chunks with higher relevance and latency. Firecrawl is the strongest fit when search needs to turn immediately into extraction or scraping: search can return basic result metadata, or use `scrapeOptions` to return full markdown, HTML, links, screenshots, and metadata from each result.

## Provider Comparison

| Provider | Context shape | Tool-call flow | Retrieval-quality read |
| --- | --- | --- | --- |
| Firecrawl | Search defaults to URL/title/description, but `scrapeOptions` can add full-page markdown, HTML, raw HTML, links, screenshots, audio, and metadata. It also supports sources (`web`, `images`, `news`), categories (`github`, `research`, `pdf`), `country`, `location`, `tbs`, `timeout`, `ignoreInvalidURLs`, and enterprise ZDR options. | Broad MCP surface: search, scrape, map, crawl, extract, deep research, and page interaction. The agent can do search plus scrape in one call, or search first and scrape/fetch later. | Best evidence supports Firecrawl as a web-data acquisition and extraction layer. It is likely strong when the hard question requires full page content, dynamic pages, or downstream scraping. The retrieved official docs did not provide the same public search-quality benchmark evidence found for Exa, Parallel, and Tavily. |
| Exa | Search responses can include clean text, highlights, summaries, and subpage content. Exa docs describe content modes as Text for full markdown, Highlights for key excerpts and token-efficient factual lookups, and Summary for abstracts/structured extraction. The MCP trajectory exposed `web_search_exa`, `web_search_advanced_exa`, and `web_fetch_exa`. | Two main paths: quick search, or advanced search with domain/date/text/freshness/content controls; fetch follows when search snippets are insufficient. In this run, advanced search was the effective path because domain targeting and highlights were needed. | Strong official evidence for retrieval evaluation methodology: Exa evaluates retrieval quality, latency, freshness, cost efficiency, and agentic suitability. Its WebCode benchmark framing is directly agentic: stale/noisy results can derail long-running coding agents, and search quality splits into content quality plus retrieval quality. In this trajectory, Exa found all required provider evidence, but broad discovery missed Tavily until a focused domain query, and fetch output was too large. |
| Parallel | Dense excerpts and ranked URLs are the center of the product. The Search MCP docs say search runs in `basic` mode for low-latency agent loops and caps total excerpts per call around 25,000 characters. Parallel blog pages frame AI search as dense, citation-rich, LLM-ready passages instead of full pages or human snippets. | Simple MCP shape: `web_search` for current web context and `web_fetch` for URL content. Parallel positions this as replacing multi-step search/scrape/extract/rerank pipelines with a one-shot search interface, then fetch only when needed. | Best evidence for hard agent questions among the competitor benchmark pages. The WISER-Search benchmark blends freshness-heavy and hard business questions, and Parallel claims fewer tokens, better signal-to-noise, fewer steps, lower latency, and lower cost. These are official claims rather than independently verified in this trajectory, but they are directly aligned with the task. |
| Tavily | Search context is explicitly controlled by `search_depth`. `ultra-fast` and `basic` use content summaries; `fast` and `advanced` use chunks. `advanced` gives highest relevance with higher latency and multiple semantically relevant snippets per URL via `chunks_per_source`; `basic` gives one NLP summary per URL. Results include title, URL, relevance score, and content snippet, with domain and time filters available. | MCP exposes `tavily-search` and `tavily-extract`. Tavily docs recommend short queries under 400 characters and splitting complex/multi-topic questions into separate focused requests, which implies more agent orchestration for hard comparisons. | Strong, explicit search-mode ergonomics. Tavily gives the agent clear knobs for speed versus relevance and content versus chunks. It looks particularly predictable for agents that can choose depth and split subquestions well. The evidence is less focused on a single one-shot hard-question benchmark than Parallel, but the docs include benchmark methodology and search-depth guidance. |

## Main Takeaway

For hard, multi-hop web questions:

- Choose Parallel when the agent needs a compact, high-signal search result intended to answer the question with fewer calls.
- Choose Exa when the agent needs flexible semantic search, targeted highlights, summaries, freshness controls, and follow-up fetches across many domains.
- Choose Tavily when the agent benefits from an explicit search-depth dial and can decompose a hard question into short focused searches.
- Choose Firecrawl when the hard part is not only finding sources but turning results into clean page content, structured extraction, screenshots, or dynamic-page data.

In this Exa trajectory, retrieval quality was strong enough to answer the product comparison from official sources. Agent experience was good for search and schema discovery, but weaker for fetch/context budgeting: the two batch fetches produced 20,159 and 26,098 raw response tokens despite `maxCharacters` limits, and fetch responses did not normalize into evidence entries in the harness.

## Evidence URLs

- Firecrawl MCP Server: https://docs.firecrawl.dev/mcp-server
- Firecrawl Search feature: https://docs.firecrawl.dev/features/search
- Firecrawl Search API reference: https://docs.firecrawl.dev/api-reference/endpoint/search
- Exa MCP docs: https://docs.exa.ai/docs/reference/exa-mcp
- Exa evaluation guide: https://docs.exa.ai/reference/evaluating-exa-search
- Exa API evals: https://exa.ai/blog/api-evals
- Exa WebCode eval: http://exa.ai/blog/webcode
- Exa Contents API guide: https://docs.exa.ai/docs/reference/contents-api-guide
- Parallel Search MCP docs: https://docs.parallel.ai/integrations/mcp/search-mcp
- Parallel Search MCP / remote MCP docs: https://docs.parallel.ai/features/remote-mcp
- Parallel Search API benchmark: https://parallel.ai/blog/search-api-benchmark
- Parallel Search API product page/blog: https://parallel.ai/blog/parallel-search-api
- Parallel MCP programmatic use: https://docs.parallel.ai/integrations/mcp/programmatic-use
- Tavily MCP docs: https://docs.tavily.com/documentation/mcp
- Tavily Search best practices: https://docs.tavily.com/documentation/best-practices/best-practices-search
- Tavily Search API reference: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily Search essentials: https://docs.tavily.com/examples/quick-tutorials/search-api

## Call Rationale

1. `001 web_search_advanced_exa`: broad official-domain discovery across Firecrawl, Exa, Parallel, and Tavily expected domains.
2. `003 web_search_advanced_exa`: focused Tavily recovery query after the broad call missed Tavily docs.
3. `005 web_search_advanced_exa`: focused Firecrawl query for Search API shape and MCP search evidence.
4. `007 web_search_advanced_exa`: focused Exa query for MCP docs, evaluation guide, API evals, and WebCode.
5. `009 web_search_advanced_exa`: focused Parallel query for Search MCP docs and benchmark/product evidence.
6. `011 web_fetch_exa`: batch fetch for MCP/search contract pages.
7. `013 web_fetch_exa`: batch fetch for benchmark and quality pages.

## Failures And Caveats

- The broad discovery query did not return Tavily; a domain-specific follow-up fixed coverage.
- `web_fetch_exa` returned much larger raw responses than requested by `maxCharacters`, creating high context cost for batch fetches.
- Fetch calls produced zero normalized evidence entries in the harness, so the final synthesis relies mainly on search-normalized evidence plus visible raw fetch text.
- One local setup mistake occurred before the first successful call: an args file was initially written relative to the wrong workspace and the attempted harness call failed before provider execution. The accidental file was moved to trash and recreated under the required workdir; no tracked files were edited.
