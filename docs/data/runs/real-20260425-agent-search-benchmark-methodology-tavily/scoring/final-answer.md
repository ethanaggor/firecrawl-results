# Recommended Methodology

Agent web search tools should be benchmarked as agent trajectories, not only as standalone search-result rankers. The benchmark should measure whether an agent can discover the right tool, use search/fetch controls, retrieve evidence, decide when to follow up, and produce an evidence-supported final answer under equal model, tool-budget, latency, and cost conditions.

## Public Benchmark Lessons

Exa's public evals support a layered methodology. Its search evals combine result-grading datasets such as 5,000 in-the-wild queries, 10,000 MS Marco queries, and about 500 hand-crafted Exa Olympiad queries with downstream RAG grading on SimpleQA. Exa describes MS Marco-style evaluation as retrieving top passages and reporting metrics like MRR for the first human-labeled relevant passage. Its WebCode benchmark adds an agent-facing coding-search frame: evaluate index quality, retrieval quality, and content quality, construct tasks from niche/current documentation that models cannot answer from parametric memory, and score extraction/content quality on completeness, signal, structure, accuracy, code recall, table recall, and ROUGE-L. Exa's evaluation guide also maps benchmark families to latency/quality search modes, including SimpleQA and FRAMES for low-latency QA, and MultiLoKo, BrowseComp, WebWalkerQA, HLE, and agentic FRAMES for deeper agent workflows.

Parallel's benchmark is explicitly agentic. Its Search MCP benchmark blends WISER-Fresh and WISER-Atomic: 40% WISER-Fresh, with 76 easily verifiable current-day questions, and 60% WISER-Atomic, with 120 hard real-world customer/business queries across areas such as breaking news, finance, technical documentation, and competitive intelligence. Parallel evaluates answers against verified ground truth with standardized LLM evaluators and reports accuracy, total cost, latency, fewer sequential tool calls, and the value of dense excerpts. Its public benchmark pages also describe controlled MCP runs where official search MCP tools are provided to the same model and answers are judged by an LLM.

Tavily's public search-evals repository contributes two useful tracks: SimpleQA and document relevance. For SimpleQA, search outputs are converted into predicted answers and graded with the official SimpleQA classifier; direct-answer providers can be compared to ground truth, although Tavily notes its evals used the classifier route. For document relevance, Tavily uses QuotientAI to assess retrieved documents against a query and supports dynamic datasets generated with an open-source dynamic eval dataset generator. Tavily's docs also make search mode part of the evaluated product surface: `search_depth` trades latency against relevance and content shape, with `basic` and `ultra-fast` returning general content summaries, while `fast` and `advanced` return reranked chunks; `advanced` targets highest relevance at higher latency.

## Recommended Suite

Use a mixed suite with fixed public tasks plus dynamic/current tasks:

1. **Factual QA:** SimpleQA and single-step FRAMES-style questions. Score answer correctness against known ground truth and require citations/evidence support.
2. **Document relevance and ranking:** MS Marco/BEIR-style static relevance tasks plus Tavily-style dynamic document relevance tasks. Score MRR, nDCG or precision@k, relevance-judged source quality, primary-source hit rate, and duplicate/noise rate.
3. **Fresh/current web tasks:** WISER-Fresh-style questions requiring current-day or recent facts. Score answer accuracy, freshness adherence, source dates, and whether freshness controls were used when available.
4. **Atomic business/research tasks:** WISER-Atomic-style customer-like questions across finance, product, technical docs, competitive intelligence, and breaking-news scenarios. Score correctness, coverage, number of tool calls, and evidence density.
5. **Agentic multi-hop tasks:** BrowseComp, WebWalkerQA, HLE, MultiLoKo, and agentic FRAMES-style tasks. Give each provider the same model, official MCP tools, and iterative search/fetch budget; score final answer accuracy, cost, latency, and whether follow-up calls were necessary and useful.
6. **Coding-agent/WebCode tasks:** Current SDK docs, changelogs, GitHub issues, release notes, and buried long-document facts. Filter or flag tasks solvable from model memory. Score retrieval success and content extraction quality, including completeness, structure, accuracy, code recall, table recall, signal, and ROUGE-L.

## Execution Protocol

Run each provider through the same trajectory harness:

- List tools and record schema/context footprint before search.
- Expose only the provider's official search and fetch/extract tools.
- Use the same agent model, reasoning setting, max tool-call budget, and final-answer format across providers.
- Separate latency classes and search modes instead of mixing them: for example, compare Tavily `basic`, `fast`, `advanced`, and `ultra-fast` as distinct product surfaces; likewise separate Exa `fast`/`auto`/`deep` and Parallel basic/advanced-style modes where available.
- Require the agent to search first, fetch/extract when snippets are insufficient, and cite the evidence it used.
- Run source-policy and freshness-constrained tasks where controls exist.
- Use a standardized evaluator for final answers, ideally ground-truth exact/semantic checks for closed tasks plus LLM judges for open or multi-hop answers, with spot checks for judge drift.

## Metrics

The benchmark should report both retrieval metrics and agent-workflow metrics:

- Answer accuracy or correctness against ground truth.
- Document relevance metrics such as MRR, nDCG, precision@k, document relevance score, and first relevant document rank.
- Evidence grounding: whether final claims are supported by visible URLs and excerpts.
- Source quality: primary-source hit rate, expected-domain hit rate, unique domains, and duplicate URL rate.
- Freshness: date adherence, current-source availability, and cost of freshness controls.
- Context efficiency: raw response tokens, normalized evidence tokens, useful evidence ratio, excerpt density, and whether returned content is summary text, chunks, or full raw content.
- Agent efficiency: search calls, fetch calls, failed calls, recoverable errors, total trajectory tokens, wall latency, search/API cost, LLM token cost, and total cost per query or CPM.
- Tool experience: schema footprint, control expressiveness, output inspectability, follow-up affordance, and error recoverability.
- Extraction/content quality for coding and RAG tasks: completeness, signal, structure, accuracy, code recall, table recall, and ROUGE-L.

The strongest overall methodology is therefore a combined agent-trajectory benchmark: SimpleQA and MS Marco-style relevance for comparability, WISER-style fresh/atomic tasks for real-world agent search, Tavily-style dynamic document relevance for production-like domains, and WebCode/coding-agent tasks for current technical retrieval. Final rankings should not be a single accuracy number; they should be reported by task family and latency/cost class, with answer quality, evidence quality, tool-call efficiency, and context efficiency shown side by side.

## Key Evidence URLs

- https://exa.ai/blog/evals-at-exa
- https://exa.ai/blog/webcode
- https://exa.ai/docs/reference/evaluating-exa-search
- https://parallel.ai/blog/search-api-benchmark
- https://github.com/tavily-ai/tavily-search-evals
- https://github.com/tavily-ai/tavily-search-evals/blob/main/run_evaluation.py
- https://docs.tavily.com/documentation/best-practices/best-practices-search
