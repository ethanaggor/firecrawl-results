# Agent Web Search Benchmark Methodology

## Executive Recommendation

Use a four-lane benchmark suite, because the public Exa, Parallel, and Tavily methodologies measure different failure modes:

1. **Open result relevance**: score raw search results for relevance, quality, authority, and content usability on open-web indexes.
2. **Grounded short-answer QA**: run SimpleQA-style factual questions where retrieved documents must be enough for an LLM to answer correctly.
3. **Agentic deep-search task completion**: put the search tool behind a fixed agent harness with search plus fetch, limited tool calls, and final-answer grading.
4. **Dynamic/domain relevance**: use live or generated domain-specific tasks where document relevance, precision, freshness, and provider configuration matter more than static answer matching.

The final leaderboard should report **accuracy, document relevance/precision, cost per thousand queries (CPM), latency, tool-call budget, and retrieval-context quality**. A single answer-accuracy score is not enough.

## Provider Methodology Comparison

| Provider | Public benchmark pattern | Task construction | Harness / evaluator | Metrics to copy |
| --- | --- | --- | --- | --- |
| Exa | "Open evals" for black-box search providers, plus SimpleQA RAG grading | In-the-wild de-identified Exa queries, 10,000 MS MARCO queries, about 500 hand-crafted Exa Olympiad queries, and SimpleQA questions | For result grading, run each query through each search engine and have an LLM grade each query-result pair from 0 to 1. For SimpleQA, let an LLM agent call the search engine and grade the final answer with OpenAI's SimpleQA grader. | Mean relevance score by query/result; optional median, rank-weighted mean, NDCG; SimpleQA accuracy; top-k depth; grader confidence/content issues. Source: https://exa.ai/blog/evals-at-exa |
| Parallel Task API | WISER-Atomic plus SimpleQA price/performance | WISER-Atomic has 121 customer-inspired real-world web research questions: 50% multi-hop and 50% single-hop, with 40% financial research, 20% sales research, 20% recruitment, and 20% miscellaneous. SimpleQA has 4,326 short fact-seeking questions. | Same evaluator and evaluation criteria across systems. SimpleQA uses the standard evaluator; WISER uses Parallel's proprietary evaluator. Testing dates and CPM normalization are reported. | Accuracy and CPM. Also report task mix, reasoning-hop mix, domain distribution, evaluator type, benchmark dates, and latency limitations. Source: https://parallel.ai/blog/parallel-task-api |
| Parallel Search & Extract | Agentic search-provider benchmark across public deep-search tasks | BrowseComp, FRAMES, FreshQA, HLE, SealQA, and WebWalker cover hard live-web multi-hop, multi-document factoid reasoning, freshness-sensitive QA, expert QA, misleading-snippet robustness, and link-following tasks. Parallel also uses company-search, coding, finance extraction, and multilingual SimpleQA-derived benchmarks. | Shared deep-research harness: one GPT-5.4 agent, two tools (web search and web fetch), up to `MAX_TOOL_CALLS=25`, sub-query planning, page fetching when snippets are insufficient, final answer LLM-graded by GPT-5.4. | Final-answer accuracy plus total cost including LLM token costs and tool costs. Company search uses 250 queries, 10 results/query, GPT-5.4-mini URL relevance grading, and precision. Finance extraction reports recall. Multilingual reports correctness and cross-lingual accuracy drop. Source: https://parallel.ai/blog/parallel-search-extract-ga |
| Tavily | SimpleQA factual grounding plus dynamic document relevance | Full SimpleQA dataset of 4,326 short factual questions. Dynamic document relevance datasets can be generated for domain-specific or real-time topics using Tavily's generator. | Tavily sends each SimpleQA question to its real-time search API, gives returned documents to GPT-4.1, instructs it to answer only from retrieved documents, then grades with OpenAI's correctness prompt. The public GitHub harness supports Tavily, Exa, Brave, Google/Serper, Perplexity, and others. | SimpleQA accuracy; document relevance accuracy; provider config; post-process model; evaluator model; output summaries. Tavily reports that dynamic questions are harder and that reference-free document relevance can be more informative than answer-only scoring. Sources: https://www.tavily.com/blog/tavily-evaluation-part-1-tavily-achieves-sota-on-simpleqa-benchmark and https://github.com/tavily-ai/tavily-search-evals |

## Recommended Benchmark Suite

### 1. Raw Search Result Relevance

This should follow Exa's open-eval approach rather than a closed-corpus-only IR benchmark.

Task construction:

- Include real user or product queries when available.
- Include a static reference set such as MS MARCO for comparability, but do not rely on it alone.
- Add hand-crafted hard queries that require semantic understanding, specialized knowledge, current information, and multi-constraint matching.
- Use open-web search APIs as black boxes instead of forcing all providers onto a fixed document corpus.

Evaluation:

- Retrieve top `k` results from each provider, with `k=5` as the efficient default and optional `k=10/20` sensitivity checks.
- Judge each `(query, result)` pair for query relevance, result quality/authority, content issues, confidence, and overall score from 0 to 1.
- Aggregate with mean score as the default; additionally report NDCG or rank-weighted mean to emphasize top results.
- Calibrate the LLM judge against human preferences where possible. Exa reports using pointwise grading by default, with pairwise/listwise methods considered for consistency.

Why: Exa argues that MS MARCO-style closed evals have sparse labels, false negatives, scale mismatch, and white-box assumptions that do not fit general web search APIs.

### 2. SimpleQA Grounded Answer Accuracy

This should be the shared factual QA lane because all three provider ecosystems reference it directly or indirectly.

Task construction:

- Use the full SimpleQA set of 4,326 short factual questions.
- Keep the ground-truth answer hidden from the answering model.
- Standardize the post-processing model and prompt across providers.

Evaluation:

- For each question, call the provider search API.
- Give only the retrieved documents/context to a fixed answer model, for example GPT-4.1 as in Tavily's public setup.
- Grade with OpenAI's SimpleQA correctness classifier/prompt.
- Record accuracy, not-attempted rate, latency, tokens, result count, and cost.

Important control: do not let model parametric knowledge mask retrieval quality. Tavily explicitly framed its run as answering only from retrieved documents.

### 3. Agentic Deep-Search Completion

This is the most representative lane for agent web search tools.

Task construction:

- Use public task families similar to Parallel's Search & Extract benchmark: BrowseComp, FRAMES, FreshQA, HLE, SealQA, and WebWalker.
- Keep the task mix broad: hard-to-find web facts, multi-document reasoning, freshness, expert knowledge, misleading snippets, and link-following.

Evaluation:

- Use one fixed agent model across providers.
- Give the agent exactly two tools: search and fetch/scrape.
- Cap the budget, for example `MAX_TOOL_CALLS=25`, and report that budget.
- Require the agent to plan sub-queries, fan out searches, fetch pages when snippets are insufficient, and return a final answer.
- Grade final answers with a fixed LLM judge and, for a subset, human audit.

Metrics:

- final-answer accuracy
- total cost/CPM, including LLM tokens and tool calls
- latency and timeout rate
- number of search calls and fetch calls
- answer-supported-by-evidence rate
- failure category: bad query, bad ranking, missing fetch, stale source, synthesis error, unsupported citation

Why: this directly measures whether a search API is useful to an agent, not just whether its first result looks relevant.

### 4. Dynamic And Domain-Specific Document Relevance

This lane should combine Tavily's dynamic document relevance idea with Parallel's domain/task construction patterns.

Task construction:

- Generate live, domain-specific query sets for finance, sales, recruiting, coding, company search, multilingual search, and user-specific production workloads.
- For candidate-generation tasks, use multi-constraint queries, not simple keyword prompts. Parallel's company benchmark uses filters like sector, funding stage, geography, investors, revenue, and team composition.
- For multilingual coverage, use paired translations of the same fact-seeking question so that the accuracy drop from English to non-English isolates cross-lingual retrieval quality.

Evaluation:

- For document relevance, judge each returned URL/document directly against the query objective.
- For candidate generation, report precision: the fraction of returned results that genuinely match the query.
- For extraction/compression tasks, report recall: whether returned excerpts contain enough information to answer a known reference question.
- For live data, record the evaluation date and rerun periodically.

Why: Tavily's public writeup says dynamic questions are harder and more representative, and that reference-free document relevance can give stronger signals than answer-only scoring. Parallel's company/coding/multilingual methods show how to make those dynamic tasks concrete.

## Minimum Scorecard

Every run should output this schema:

| Category | Required fields |
| --- | --- |
| Identity | provider, model/agent, date, task suite, provider configuration |
| Retrieval | result count, unique domains, duplicate rate, top-k relevance, source authority, content issue rate |
| Answering | SimpleQA accuracy, deep-search accuracy, not-attempted rate, evidence-supported rate |
| Dynamic relevance | document relevance accuracy, candidate precision, extraction recall, freshness-sensitive accuracy |
| Agent process | search calls, fetch calls, max tool-call budget, timeout/failure rate |
| Cost/performance | CPM, LLM token cost, tool-call cost, P50/P90 latency |
| Robustness | multilingual drop, freshness drift, variance across repeated runs |

## What To Avoid

- Do not use MS MARCO/MRR alone. Exa's critique is persuasive: closed corpora are reproducible, but fixed sparse labels and white-box corpus assumptions do not model black-box web search APIs.
- Do not use answer accuracy alone. Tavily's document relevance benchmark and Exa's raw result grading both show why the retrieved evidence itself must be scored.
- Do not compare providers with hidden or unequal budgets. Parallel reports tool-call budgets, model, CPM, and testing dates; the benchmark should do the same.
- Do not mix standalone LLMs and web search APIs as if they are the same system. Parallel explicitly treats standalone LLMs as a different category because they lack real-time web access.
- Do not ignore provider configuration. Tavily's public harness stores config files; Parallel separates Basic and Advanced modes; Exa distinguishes result content returned by different APIs.

## Final Method

The benchmark methodology should be:

1. **Exa-style open result grading** for raw retrieval quality.
2. **Tavily-style SimpleQA** for grounded factual answer accuracy.
3. **Parallel-style agentic harness** for multi-step search/fetch task completion under fixed tool budgets.
4. **Tavily/Parallel dynamic document relevance** for live, domain-specific, production-like search quality.
5. **Cost and latency normalized reporting** for every metric, using CPM and P50/P90 latency.

The most important trajectory finding is that the public benchmarks converge on a layered methodology: **score the retrieved documents, score the final grounded answer, and score the whole agentic search process under an explicit cost/tool budget**. Any benchmark missing one of those layers will overstate quality for some class of search tool.
