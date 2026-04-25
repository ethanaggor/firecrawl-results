# Agent Web Search Benchmark Methodology

Use a trajectory benchmark, not just a standalone SERP benchmark. The public Exa, Parallel, and Tavily material points to a benchmark that measures whether an agent can decide when to search, form follow-up queries, fetch specific pages when snippets are insufficient, and produce a grounded final answer under a fixed budget.

## Recommended Method

1. Run all providers through the same agent harness.
   Give the same model the same task, the same maximum tool-call budget, the same answer format, and equivalent search/fetch tools. Record the complete trajectory: schema footprint, arguments, raw responses, normalized evidence, tool-call count, failed calls, latency, token volume, final evidence, and answer.

2. Compare providers within latency and mode classes.
   Exa's evaluation guide explicitly warns not to compare fast search against deep search as if they were the same product surface. Record each provider mode and compare near peers: low-latency factual search, balanced search, and deep/agentic search. Tavily's docs make the same point through `search_depth`: `ultra-fast`, `fast`, `basic`, and `advanced` trade latency, relevance, and content shape, with chunks used for query-targeted snippets and content used for broader page summaries.

3. Use a mixed task suite.
   Include static factual QA, document relevance, fresh/current facts, multi-hop agentic tasks, and domain-specific/coding retrieval. No single public benchmark covers agent web search well enough by itself.

4. Separate retrieval quality from final answer quality.
   Score document relevance and evidence coverage before judging the final answer. Then score answer accuracy/grounding against visible evidence and ground truth. This avoids hiding poor retrieval behind a strong answering model.

## Task Construction Patterns

Use these slices:

- SimpleQA-style factual QA: Short factual questions with known ground-truth answers. Tavily's public evals run the full SimpleQA dataset, reformat retrieved documents for an LLM answer step, and grade with the official SimpleQA classifier. Tavily's blog describes SimpleQA as 4,326 short-form factual questions designed to test retrieval quality and answer accuracy using only retrieved documents.

- MSMARCO-style document relevance: Sample many realistic search queries and grade returned results/snippets directly for relevance. Exa's API evals used a random sample of 1,000 MSMARCO queries and judged results plus snippets with GPT-4o on a 1-5 scale from irrelevant to exceptionally relevant/comprehensive.

- Dynamic document relevance: Include live or generated datasets for production-like topics. Tavily's search-evals repo pairs SimpleQA with a Document Relevance benchmark, using QuotientAI and a Dynamic Eval Dataset Generator so teams can build domain-specific or real-time datasets.

- WISER/FreshQA-style freshness: Include questions whose answers depend on current web data. Parallel's WISER-Search blends WISER-Fresh, 76 current-day easily verifiable questions generated with o3 pro, and WISER-Atomic, 120 hard real-world business questions based on customer use cases. Test fresh tasks close to generation time and record testing dates.

- Agentic multi-hop tasks: Include tasks where the agent must plan subqueries, search, fetch, and synthesize across pages. Parallel's quality benchmark describes BrowseComp, FRAMES, FreshQA, HLE, SealQA, and WebWalker as complementary agentic search datasets, run through a deep-research harness with web search and web fetch and up to 25 tool calls per question.

- Coding and extraction tasks: Include technical documentation/code retrieval where page extraction quality matters. Exa's benchmark repo includes WebCode with Contents, Highlights, RAG, and E2E tracks; metrics include completeness, accuracy, structure, signal, code recall, table recall, ROUGE-L, groundedness, correctness, average tokens, and citation precision.

## Metrics To Record

Primary outcome metrics:

- Final answer accuracy against ground truth.
- Partial-credit accuracy where exact binary scoring is too harsh.
- Document relevance on a 1-5 judged scale.
- Retrieval coverage: whether relevant information was retrieved at all.
- Answer groundedness and citation precision.
- Freshness correctness for time-sensitive tasks.

Agent workflow metrics:

- Tool calls, search calls, fetch calls, and failed calls.
- Whether the agent needed fetch after search.
- Whether follow-up calls were enabled by returned context.
- Raw response tokens, normalized evidence tokens, and tokens per useful finding.
- Context footprint from tool schemas and descriptions.

Operational metrics:

- P50/P95 latency by provider and mode.
- Cost per query or CPM, including both search API costs and LLM token costs.
- Mode/depth/configuration used, such as Exa Fast/Auto/Deep, Parallel Basic/Advanced, or Tavily `search_depth`.
- Source/domain policy adherence where a task asks for official or constrained sources.

## Scoring Shape

Use a weighted scorecard rather than one leaderboard number:

- Retrieval quality: relevance, source quality, coverage, freshness, grounding.
- Agent experience: discoverability, controls, output inspectability, follow-up affordance, error recoverability.
- Efficiency: cost, latency, token footprint, and number of calls.
- Reproducibility: fixed task ids, ground truth, provider configuration, model, judge prompt, run dates, and raw traces.

For the final benchmark report, publish per-slice results and an aggregate only after normalizing by mode class. A provider that wins low-latency SimpleQA should not be declared better than a deep search product on multi-hop research without running the deep/agentic slice.

## Evidence URLs

- Exa API evals: https://exa.ai/blog/api-evals
- Exa evaluation guide: https://exa.ai/docs/reference/evaluating-exa-search
- Exa benchmarks repo: https://github.com/exa-labs/benchmarks
- Parallel Search API benchmark: https://parallel.ai/blog/search-api-benchmark
- Parallel quality benchmarks: https://parallel.ai/benchmarks
- Tavily search-evals repo: https://github.com/tavily-ai/tavily-search-evals
- Tavily SimpleQA benchmark blog: https://tavily.com/blog/tavily-evaluation-part-1-tavily-achieves-sota-on-simpleqa-benchmark/
- Tavily search best practices: https://docs.tavily.com/documentation/best-practices/best-practices-search
- Tavily Python SDK reference: https://docs.tavily.com/sdk/python/reference
- Tavily agent toolkit tools: https://docs.tavily.com/examples/agent-toolkit/tools
