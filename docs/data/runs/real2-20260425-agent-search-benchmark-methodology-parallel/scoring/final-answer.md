# Recommended Methodology For Agent Web Search Tool Benchmarks

Use a multi-track benchmark, not a single leaderboard. The public Exa, Parallel, and Tavily materials point to the same conclusion: agent search tools need to be evaluated on final answer quality, retrieval quality, context efficiency, freshness, cost, latency, and tool-loop behavior.

## Evidence From Public Benchmarks

Exa uses both answer-level and retrieval-level evals. In its Search API evals, Exa runs SimpleQA as a RAG benchmark and adapts MSMARCO/MS MARCO for black-box search providers by using an LLM-as-judge on returned search results because providers do not share the same document index or relevance labels. The Exa methodology includes a 1-to-5 search-result relevance rubric from irrelevant to comprehensive. Exa's evals writeup also argues that closed IR datasets such as MS MARCO are useful for reproducibility but have "MS Marco myopia": sparse labels can create false negatives, and closed corpora do not fully reflect open-web search. Exa's open benchmark repo adds product-oriented tracks such as WebCode, People Search, and Company Search, with WebCode covering contents extraction, highlights, RAG, and end-to-end tasks. Exa's highlights benchmark also makes context budget a first-class variable: on SimpleQA, short query-aware highlights can match or beat much longer raw page content while using far fewer tokens.

Parallel evaluates agent-facing search with an explicit tool loop. Its quality benchmarks run tasks through a shared deep-research harness where one agent gets `web_search` and `web_fetch`, can use up to `MAX_TOOL_CALLS=25`, plans subqueries, fans out searches, fetches pages when snippets are insufficient, and returns an answer. The answer is LLM-graded against ground truth, and Parallel reports final-answer accuracy plus overall cost, including tool-call and LLM token costs. Parallel's Search API benchmark also defines WISER-Search as a blend of WISER-Fresh and WISER-Atomic: 40% fresh current-web questions and 60% hard atomic business questions, spanning breaking news, financial data, technical documentation, and competitive intelligence. Its methodology records test dates, uses verified ground truth, and includes average cost per query.

Tavily combines static factual QA with dynamic document relevance. Its public SimpleQA methodology uses the full OpenAI SimpleQA question set, a fixed answering model grounded by retrieved provider documents, max 10 documents per query, comparable document length across providers, and scoring by the SimpleQA classifier. Tavily's public eval repo adds a Document Relevance benchmark using a dynamic dataset generator and QuotientAI relevance assessment. Tavily explicitly warns that static benchmarks alone do not capture ambiguous, time-sensitive, evolving web tasks, and says reference-free document relevance can provide stronger retrieval signals than answer-only scoring. Its latency benchmark standardizes output token lengths where possible, runs benchmarks twice per provider, reports average scores, and frames "information density per millisecond" and efficiency per token as evaluation criteria.

## Benchmark Tracks To Use

1. Static factual answer track.
Use SimpleQA or SimpleQA-like short factual questions with verified answers. Each provider should retrieve up to the same number of documents or excerpts, feed a fixed answering model with the same prompt and context budget, and score final answers with the official classifier or a blinded judge. This tests factual grounding and hallucination reduction, but should not be treated as sufficient for real-world agent search.

2. Retrieval relevance track.
Use query-result relevance grading directly, including MS MARCO/MSMARCO-style query sets where useful. For black-box web providers, do not rely on MS MARCO's fixed document labels as the only source of truth because providers have different indexes. Instead, grade each returned result or excerpt against the query using a consistent rubric, such as Exa's 1-to-5 relevance scale, and report relevance@k, average relevance, nDCG@k or MRR where labels are meaningful, and duplicate/off-topic rates.

3. Dynamic freshness track.
Use WISER-Fresh-style tasks generated from current web events and evaluated within a short window after ground-truth creation. Include queries about breaking news, recent filings, financial facts, product changes, and other time-sensitive facts. Record generation dates, test dates, and whether the answer was answerable at evaluation time.

4. Hard atomic business and technical track.
Use WISER-Atomic-style and coding-agent tasks that reflect real production searches: business intelligence, competitive research, technical documentation lookup, API change detection, and narrow facts buried in long pages. These tasks should have verified atomic answers and source evidence.

5. Multi-hop agent track.
Use BrowseComp, WebWalker, Frames, FreshQA, HLE, SealQA, coding, or equivalent multi-hop tasks. Run every provider through the same agent harness with the same model, prompt, tool budget, and stopping rules. The harness should expose comparable `search` and `fetch` tools rather than mixing one provider's search API with another provider's deep-research product. Report answer accuracy, groundedness, citations, calls used, and failures.

6. Fetch/extraction and context-efficiency track.
Evaluate URL-plus-query extraction separately from open-web search. For long docs, API references, tables, and code pages, measure whether the returned excerpts contain the answer, preserve structure, and avoid irrelevant text. Report correctness, groundedness, table/code recall where relevant, citation precision, average returned tokens, and answer accuracy under fixed context budgets.

## Controls

Use the same agent model, prompts, answer schema, max tool calls, max results per search, max URLs fetched, and context/token budget for all providers. Separate tracks should exist for search-only APIs, fetch/extract APIs, and provider-native research APIs. Do not compare a one-shot search tool against a full deep-research endpoint in the same primary ranking unless the benchmark is explicitly about end-to-end research products.

Normalize output length and context volume. Tavily standardizes document length; Exa shows that highlights versus raw content can change accuracy and token cost; Parallel includes LLM token cost in CPM. A fair benchmark should therefore report both quality and the amount of context needed to achieve it.

Use blinded or standardized judging. For answer tasks, use exact-match/classifier scoring where possible and LLM-as-judge against verified ground truth where exact matching is brittle. For retrieval tasks, use pointwise relevance grading as the default because it is interpretable and cheaper, with pairwise/listwise audits on a sample to detect judge bias.

Record freshness and run timing. Fresh tasks should include dataset creation time, evaluation time, and source verification time. Static tasks should be versioned so repeated runs are comparable.

Publish configs and artifacts. The benchmark should expose the query set, provider parameters, prompts, judge prompts, model versions, run dates, raw outputs, normalized evidence, and scoring scripts. This is especially important because provider claims often depend on context budget, answer model, max results, and cost assumptions.

## Metrics

Primary quality metrics:

- Final answer accuracy, scored by verified answers, official classifiers, or blinded LLM judges.
- Retrieval/document relevance, using relevance@k, average relevance, nDCG@k, MRR, or document relevance accuracy.
- Groundedness and correctness of generated answers.
- Citation precision and evidence coverage.

Operational metrics:

- End-to-end latency, plus search latency and fetch latency where available.
- Tool calls per task and failure/timeout rate.
- Returned context tokens and answer-model input tokens.
- Cost per query and CPM, including provider API calls plus LLM token costs.
- Freshness adherence for current-event tasks.

Agent-experience metrics:

- Whether the tool returns dense, query-focused excerpts or noisy snippets.
- Whether fetch/extract can recover the answer from long pages.
- Whether response metadata supports citations, provenance, ranking, and debugging.
- Whether the provider supports controls agents need: result count, domains, dates/freshness, search depth, content budget, and source constraints.

## Bottom Line

The best methodology is a public, multi-track harness with standardized agent loops and separate retrieval, fetch, and answer-quality tracks. SimpleQA is useful for factual grounding; MSMARCO/MS MARCO is useful as a reproducible retrieval baseline but should be adapted with direct result judging for black-box web providers; WISER-style fresh and atomic tasks are needed for production realism; and document relevance/context-efficiency evals are necessary because agent search quality depends as much on dense, relevant context as on whether a final answer is correct.
