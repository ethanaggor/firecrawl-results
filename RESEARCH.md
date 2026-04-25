# Research

This repo is not just a benchmark viewer. It is the research notebook for the Firecrawl agent-search-context project.

The goal is to improve Firecrawl as an agent-facing search system. The MCP contract matters, but it sits on top of the endpoint. If the endpoint does not return the right context, the agent has to recover through extra searches, maps, scrapes, and its own priors. That recovery path is exactly what this benchmark is meant to expose.

## Research posture

The benchmark numbers are triage, not truth.

Use the metrics to find likely frontier performers and likely failure cases. Then read the trajectories. A provider with fewer calls may still have worse retrieval. A provider with more tokens may have returned better evidence. A provider with a high final answer score may have forced the agent through a bad path and only succeeded because the agent worked around the tool.

The unit of analysis is the trajectory:

1. What did the agent know from the schema before the first call?
2. What did the first search return?
3. Did the first search make the next call obvious?
4. Did the agent need recovery calls because search was empty, noisy, or under-extracted?
5. Did the final answer come from compact search context or from exact-page recovery?
6. Which problems belong to the endpoint, which belong to the MCP shape, and which belong to the benchmark harness?

This should be read against the frontier performers. In the first benchmark, Exa and Parallel are the main comparison points. Tavily is also useful because it has strong agent controls and compact operational behavior, even when its retrieval is sometimes less complete than Exa's.

## Layer model

We analyze failures across four layers.

### 1. Search endpoint

This is the highest-leverage layer. It determines whether a query returns relevant, compact, source-grounded context in the first place.

Questions:

- Does the first search find the right pages?
- Does source policy work as a retrieval primitive, or only as a query-string hint?
- Does the endpoint return enough page text to avoid immediate fetch/scrape recovery?
- Does it balance multi-domain objectives, or collapse into one noisy domain?
- Does it understand agent objectives, or does it behave like a keyword SERP?

### 2. Firecrawl primitive composition

Firecrawl has strong primitives: search, scrape, map, crawl, extract, browser, and agent. The question is whether those primitives compose naturally for an agent.

Questions:

- Does search reduce the need for map and scrape, or does it merely point the agent toward them?
- Is map a first-class discovery primitive or a recovery path after search fails?
- Does scrape return a useful amount of content for agent reasoning, or does it flood the context window?
- Should search be able to use map-like site discovery or scrape-like excerpt extraction server-side?

### 3. MCP contract

This is the layer we can change directly in the fork.

Questions:

- Did `content`, `focus`, `sourcePolicy`, `freshness`, usage metadata, and search IDs improve the agent's choices?
- Are the names and defaults right?
- Does the schema make the correct path obvious?
- Is the tool description too large or too instructional?
- Does the MCP hide endpoint weaknesses, or does it surface them cleanly enough to act on?

### 4. Benchmark harness

The harness must not reward the wrong thing.

Questions:

- Are we scoring first-search quality separately from eventual answer quality?
- Are we distinguishing direct success from recovery success?
- Are fetch/scrape outputs normalized into comparable evidence?
- Are call counts normalized for batching?
- Are semantic scores too forgiving when a trajectory is expensive but eventually succeeds?

## Metrics policy

Keep the original semantic scores, but never read them alone.

Important metrics:

- `retrievalQualityScore`: final answer support. Useful, but too forgiving by itself.
- `agentExperienceScore`: agent-facing usability. Useful, but must be checked against call count, recovery count, and trace quality.
- `toolCalls`: operational burden. Must be interpreted with batching support.
- `searchCalls`: search attempts only.
- `mapCalls`: Firecrawl discovery recovery. This matters because map is often used after search fails.
- `extractionCalls`: scrape/fetch/extract calls.
- `zeroResultSearchCalls`: direct endpoint failure signal.
- `recoverySignalCalls`: zero-result searches, expected-domain search misses, and map calls. This is the first attempt at measuring agent recovery burden.
- `firstSearch.resultCount`: whether the first search gave the agent something to work with.
- `firstSearch.expectedDomainHit`: whether the first search hit the requested source space.
- `normalizedEvidenceTokens`: useful only after normalization fixes. It should represent bounded inspectable evidence, not raw payload size.
- `evidenceToRawTokenRatio`: rough measure of how much raw output became inspectable evidence. This is a harness metric, not a pure product metric.
- `searchOnlyFootprintTokens`: the search tool schema footprint.
- `searchFetchFootprintTokens`: the working set for search plus fetch/scrape/extract.
- `totalMcpFootprintTokens`: the whole exposed MCP footprint.

Metrics that need caution:

- `failedCalls`: transport failures only. It misses zero-result and noisy-result failures.
- `hasSourcePolicyControl`: do not trust regex-derived booleans as product truth. Replace with manually reviewed capability manifests when making claims.
- `normalizedEvidenceTokens`: was previously broken for fetch/scrape. Use only after the normalizer has been recomputed.

## First benchmark: corrected postmortem

Suite: `real-20260425`

Runs: 25 trajectories, 5 tasks, 5 providers.

Providers:

- Firecrawl original MCP
- Firecrawl context fork
- Exa remote MCP
- Parallel Search MCP
- Tavily remote MCP

Tasks:

- `docs-parity`
- `agent-search-benchmark-methodology`
- `source-policy-docs-only`
- `hard-product-comparison`
- `needle-technical-release`

After the metric audit, the harness was corrected in two ways:

- Fetch/scrape normalization now retains bounded evidence from `markdown`, `raw_content`, `full_content`, `excerpts`, and plain markdown fetches.
- Run metrics now track recovery burden, zero-result searches, map calls, extraction calls, first-search quality, search-only footprint, and search+fetch footprint.

Corrected provider summary:

| Provider | RQ | AX | Avg calls | Recovery | Zero searches | First search results | Avg tokens | Evidence/raw | Full schema | Search schema |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Exa | 4.80 | 4.28 | 3.0 | 0.0 | 0.0 | 8.2 | 41.7k | 0.59 | 2.0k | 1.7k |
| Firecrawl context | 4.54 | 4.18 | 9.6 | 3.2 | 1.0 | 4.4 | 57.1k | 0.38 | 11.7k | 2.7k |
| Firecrawl original | 4.60 | 3.84 | 9.0 | 0.4 | 0.2 | 6.6 | 55.2k | 0.29 | 11.2k | 2.2k |
| Parallel | 4.64 | 4.16 | 4.8 | 0.0 | 0.0 | 10.0 | 30.2k | 0.84 | 3.8k | 1.6k |
| Tavily | 4.48 | 4.28 | 4.2 | 0.0 | 0.0 | 5.6 | 28.6k | 0.67 | 2.8k | 1.2k |

### What changed after the metric audit

The old summary understated the problem. After reading traces and fixing normalization, the main signal is not just that Firecrawl uses more calls. It is that Firecrawl context has a recovery problem.

On `hard-product-comparison`, Firecrawl context produced:

- 25 tool calls
- 5 search calls
- 5 map calls
- 15 scrape/extraction calls
- 3 zero-result search calls
- 12 recovery signals

Exa, Parallel, and Tavily had zero recovery signals on the same task by the current metric definition.

That does not mean they were perfect. Exa used large raw payloads. Parallel had some third-party noise and lacks hard source-policy fields in its MCP. Tavily sometimes needed known-URL extraction. But their search responses usually gave the agent a direct next step. Firecrawl context often made the agent recover.

### Endpoint-level hypothesis

Firecrawl Search is good at exposing Firecrawl's scrape power, but weaker at returning objective-shaped, domain-balanced, agent-ready context from the first search.

Evidence:

- The first Firecrawl context search for hard product comparison returned GitHub directory noise, even though the objective asked for official docs and benchmark pages across Firecrawl, Exa, Parallel, and Tavily.
- Multi-domain source policy compiled into an OR-site query did not produce balanced source coverage.
- Several focused official-domain searches returned zero results and forced map recovery.
- Exa and Parallel often returned relevant official pages and excerpts directly from search.

Potential server-side changes:

- Treat source policy as a retrieval plan, not only a query rewrite.
- For multi-domain include policy, perform domain-balanced retrieval or server-side fanout/merge.
- Add objective-aware excerpts to Search results, similar to Exa highlights or Parallel excerpts.
- Let Search return compact page evidence strong enough to avoid immediate exact-page scrape.
- Return explicit per-result reasons or matched sections so the agent can decide follow-up calls.
- Make search-result content budgets enforce useful evidence, not just raw markdown clipping.

### Firecrawl primitive-level hypothesis

Firecrawl's primitives are strong, but Search is not yet absorbing enough of Map and Scrape for agent search workflows.

Evidence:

- In the hard product comparison trajectory, map was used after search returned zero/noisy results.
- Scrape was used repeatedly to recover compact evidence that search did not provide.
- Firecrawl could complete the task, but it did so by making the agent manually compose primitives.
- Parallel and Exa collapse more of that work into search/fetch response shape.

Potential product changes:

- Add a server-side search mode that performs light map-like discovery for official docs/sites.
- Add a search mode that returns bounded, objective-selected excerpts from top pages.
- Add batch scrape/fetch ergonomics to the MCP working set if exact-page recovery remains common.
- Make map output more explicitly connected to search recovery: "these are likely pages for your objective."

### MCP-level hypothesis

The upgraded Firecrawl MCP direction is correct, but it is not finished.

What looks correct:

- `content` is better than a generic `scrapeOptions` blob for agent-facing search.
- `focus` is useful because agents naturally separate "find pages" from "extract this kind of information."
- `sourcePolicy` is worth keeping. It performed well on the docs-only task.
- `searchIds`, `warnings`, `usage`, `creditsUsed`, and flattened results are right.
- Preserving enterprise/ZDR capability was necessary.

What is now questionable:

- Default multi-domain `sourcePolicy` strategy should not be compile-only without more data.
- The search tool description is too long. Search operators do not need to dominate the schema context.
- `summary` as default still needs validation against `chunks`; the data does not yet prove the best default.
- `map` is not counted or described clearly enough as search recovery in the MCP trajectory.
- The MCP exposes a broad 14-tool Firecrawl surface. For product claims, report both full MCP footprint and search working-set footprint.

Potential MCP changes:

- Test `sourcePolicyStrategy: hybrid` before making it a default.
- Shorten `firecrawl_search` description and move operator examples out of the hot schema path.
- Improve `chunks` selection so focused chunks are more semantically useful.
- Consider a batch exact-page context tool or explicit search-followup mode if scrape recovery stays common.
- Make warnings more diagnostic when a source-policy search returns zero results or only one allowed domain.

### Benchmark-level fixes made

Implemented:

- Added bounded normalization for fetch/scrape page text.
- Added `mapCalls`, `discoveryCalls`, `extractionCalls`, `zeroResultSearchCalls`, `recoverySignalCalls`, `firstSearch`, `searchOnlyFootprintTokens`, and `searchFetchFootprintTokens`.
- Republished the first suite with corrected metrics.

Still needed:

- Re-score AX with stricter penalties for recovery burden.
- Add first-search/search-only quality scores.
- Add capability manifests instead of regex-derived capability booleans.
- Add URL batching normalization or at least report `urlsFetchedPerCall`.
- Add domain-balance metrics for multi-domain source-policy tasks.
- Add task-level ablations for Firecrawl content mode and source-policy strategy.

## Firecrawl ablation plan

The first ablation round should answer MCP-shape questions before we mutate the server again.

Questions:

1. Which `content` mode gives the best search-only evidence for agent follow-up: `results`, `summary`, `chunks`, or `markdown`?
2. For multi-domain `sourcePolicy`, should the MCP use `compile`, `fanout`, or `hybrid`?
3. Does `focus` materially improve chunk quality, or is it mostly ignored by the current implementation?
4. Does lowering `maxCharsPerResult` reduce token cost without hurting evidence?
5. Does increasing `maxCharsTotal` reduce follow-up scrape calls, or does it only bloat context?
6. Which failures are addressable in MCP code, and which require Search API/server-side work?

Gate to pass before running the second benchmark:

- The ablation report must identify at least one MCP change to keep, reject, or test further.
- Any changed MCP default must be supported by trajectory or ablation evidence.
- The benchmark harness must publish corrected metrics and normalization.
- `RESEARCH.md` must record the decision and its evidence.

## Second benchmark plan

The second benchmark should not simply repeat the first.

It should answer:

- Did the MCP changes reduce recovery burden?
- Did first-search quality improve?
- Did agent experience improve without hiding endpoint retrieval problems?
- Do Exa and Parallel still outperform Firecrawl on objective-shaped search?
- Are remaining Firecrawl gaps endpoint-level rather than MCP-level?

Minimum second run:

- Firecrawl original
- Firecrawl context before the new MCP change, if still available
- Firecrawl context after the new MCP change
- Exa
- Parallel
- Tavily when useful as a compact-control reference

High-signal tasks:

- `hard-product-comparison`
- `agent-search-benchmark-methodology`
- `source-policy-docs-only`
- `needle-technical-release`

If runtime is constrained, prioritize Firecrawl context versus Exa and Parallel on `hard-product-comparison` and `agent-search-benchmark-methodology`. Those two tasks exposed the largest Firecrawl recovery burden.

## Running log

### 2026-04-25: first benchmark audit

The first published summary was too scoreboard-like. It correctly showed Exa and Parallel ahead, but it did not explain why.

After reading traces, the core issue became clear: Firecrawl context can complete hard tasks, but too often completes them through recovery. Search returns too little, too noisy, or nothing for some constrained objectives. The agent then uses map and scrape to rebuild the context it wanted search to return.

The corrected metrics now expose that pattern. Firecrawl context averages `3.2` recovery signals per task. Exa, Parallel, and Tavily average `0.0` in this five-task suite by the current metric. On hard product comparison, Firecrawl context had `12` recovery signals.

This changes the product thesis:

The MCP context contract is a good first client-side move, but Firecrawl needs server-side agent-context search to become truly competitive. The endpoint should return objective-shaped, domain-balanced, bounded evidence. The MCP should make that behavior obvious and safe, but it cannot fully manufacture it after weak search results arrive.

Decision:

- Keep the context contract.
- Keep source policy, but question compile-only multi-domain behavior.
- Fix the benchmark harness before using it for further claims.
- Run Firecrawl ablations before changing more MCP defaults.
- Treat Exa and Parallel as frontier references for endpoint and MCP shape.

### 2026-04-25: Firecrawl ablation audit

Reports:

- Pre-change: `evals/reports/2026-04-25T06-42-55-665Z-firecrawl-ablations.json`
- Post-change: `evals/reports/2026-04-25T06-44-48-158Z-firecrawl-ablations.json`

The ablation was deliberately narrower than the agent trajectory benchmark. It called the upgraded Firecrawl Search context function directly and tested the MCP-shape questions that could be answered without another full provider matrix.

Questions:

1. Should multi-domain `sourcePolicy` default to `compile`, `fanout`, or `hybrid`?
2. Which content mode is strongest for known Firecrawl documentation parity: `results`, `summary`, `chunks`, or `markdown`?
3. Does `focus` materially improve chunk evidence today?
4. Are the biggest failures client-side MCP failures or endpoint retrieval failures?

Findings:

| Ablation | Result | Decision |
|---|---|---|
| Multi-domain source policy | `compile`, `fanout`, and `hybrid` all collapsed to weak coverage on the product-comparison task. The successful results were mostly GitHub-shaped, not balanced official-source context. | Do not make `hybrid` the default. More calls did not fix the retrieval shape. |
| Benchmark methodology | All tested Firecrawl variants returned zero results for a constrained Exa/Parallel/Tavily benchmark-methodology query. | Treat this as endpoint/search-planning evidence, not a content-mode choice. |
| Docs parity content mode | All modes found the relevant Firecrawl docs terms. `results` was cheapest. `summary` gave useful first-pass context. `chunks` and `markdown` cost more. | Recommend `summary` as the first-pass agent context mode; keep `results` for known narrow lookup. Do not promote `chunks` as default yet. |
| Focus effect | The with-focus and without-focus variants on the release query were nearly identical. | Keep `focus` in the contract, but do not claim it meaningfully improves retrieval until chunk selection is stronger. |

What changed in the MCP after this audit:

- Shortened the hot `firecrawl_search` description. The search-only footprint fell from roughly `2.7k` tokens to `2.3k`; the full Firecrawl MCP footprint fell from roughly `11.7k` to `11.4k`.
- Changed the primary bounded-context example to `content: "summary"` instead of `content: "chunks"`.
- Added diagnostic warnings when multi-domain `sourcePolicy` returns no covered domains or only partial include-domain coverage.
- Kept compile-only source-policy behavior as the default. The data did not justify fanout or hybrid as a default.

The important negative result: none of these client-side changes fixed Firecrawl's hard multi-domain retrieval problem. That is useful. It tells us where the boundary is.

Server-side hypothesis after ablation:

Firecrawl Search needs a source-policy planner. Multi-domain include policy should not behave like one brittle query-string expression. It should become a retrieval plan that can allocate result slots across requested domains, merge/rerank by objective, and return per-domain coverage diagnostics.

The endpoint also needs objective-shaped excerpts. Exa and Parallel keep winning because search returns context that is already close to the agent's next reasoning step. Firecrawl can scrape well, but Search often makes the agent discover and scrape the right page manually.

MCP hypothesis after ablation:

The context contract is still the right direction, but the MCP should be honest when the endpoint did not satisfy the contract. Warnings are part of that honesty. If Search only covered one of eight requested source domains, the agent should see that immediately and split the work.

Second benchmark gate:

- Run the post-change Firecrawl context MCP against the hard tasks again.
- Compare against Exa and Parallel as frontier references.
- Compare against the first Firecrawl context traces for recovery burden, schema footprint, first-search quality, and final answer quality.
- Do not expect the endpoint issue to disappear. The real question is whether the MCP changes improve the trajectory by making failures legible earlier.

### 2026-04-25: second benchmark audit

Suite: `real2-20260425`

Runs: 12 trajectories, 4 tasks, 3 providers.

Providers:

- Firecrawl context fork after the warning/schema pass
- Exa remote MCP
- Parallel Search MCP

Tasks:

- `hard-product-comparison`
- `agent-search-benchmark-methodology`
- `source-policy-docs-only`
- `needle-technical-release`

Second-suite provider summary:

| Provider | RQ | AX | Avg calls | Recovery | Zero searches | Raw outliers | First search results | Avg tokens | Evidence/raw | Search schema |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Exa | 5.00 | 4.00 | 4.0 | 0.0 | 0.0 | 0.0 | 7.5 | 57.8k | 0.65 | 1.7k |
| Firecrawl context | 4.50 | 4.00 | 8.5 | 4.25 | 1.25 | 0.75 | 5.25 | 195.0k | 0.41 | 2.3k |
| Parallel | 4.75 | 4.00 | 5.75 | 0.0 | 0.0 | 0.0 | 10.0 | 41.6k | 0.74 | 1.6k |

The averages hide the main story. Firecrawl context now behaves differently depending on the retrieval regime.

#### Where Firecrawl looked good

`source-policy-docs-only`:

- Firecrawl context solved the task in two calls: one search and one scrape.
- Exa also solved it in two calls.
- Parallel solved it in four calls, but the initial search leaked an off-domain result.

This is a real Firecrawl strength. Explicit source policy is worth keeping as a first-class MCP field. It gives Firecrawl a clearer constrained-source story than Parallel's MCP shape.

`needle-technical-release`:

- Firecrawl context solved the task in three calls.
- Exa and Parallel each used four calls.
- All three providers produced supported answers.

This suggests Firecrawl can perform well when the task can be narrowed toward a specific official page or small source set. Search plus exact scrape is a good Firecrawl primitive path in this regime.

#### Where Firecrawl still lagged

`hard-product-comparison`:

- First run Firecrawl context: 25 calls, 5 searches, 5 maps, 15 scrapes, 12 recovery signals.
- Second run Firecrawl context: 13 calls, all searches, 7 recovery signals, 3 zero-result searches.
- Exa second run: 6 calls, 0 recovery signals.
- Parallel second run: 10 calls, 0 recovery signals.

This is progress. The MCP warning/schema pass changed the trajectory from map/scrape recovery to search-only recovery. The agent saw the failure earlier and split into focused searches. That is a better agent experience.

It is not enough. The Firecrawl run still had three zero-result searches and seven recovery signals. Exa and Parallel needed decomposition too, but their decomposition looked like normal provider/domain targeting. Firecrawl's decomposition still looked like recovery from empty or brittle constrained searches.

`agent-search-benchmark-methodology`:

- Firecrawl context used 16 calls and hit roughly 684k trajectory tokens.
- Exa used 4 calls.
- Parallel used 5 calls.

This run exposed two separate issues:

1. Endpoint/search issue: broad Firecrawl searches over-focused on generic research and missed the exact competitor benchmark sources until provider-specific recovery.
2. MCP contract issue: the agent used `includeRawResults: true`, which returned huge raw search payloads into the context window. That field violates the purpose of bounded search context.

The second issue is directly fixable in the MCP. I removed `includeRawResults` from the public search contract after this run. The harness already saves raw artifacts. Agents should not ask the MCP to return raw provider payloads when the product contract is bounded evidence.

Post-removal smoke:

- Full Firecrawl MCP footprint: `11,369` tokens.
- Search-only footprint: `2,302` tokens.
- Search+fetch footprint: `5,275` tokens.

#### Server-side conclusions after the second suite

The strongest server-side hypothesis did not change:

Firecrawl Search needs agent-context retrieval, not just search-plus-scrape plumbing.

Specific server-side changes I would ship or prototype:

- Treat `sourcePolicy.includeDomains` as a retrieval plan with per-domain slot allocation, not just a query rewrite.
- Return source-coverage diagnostics from Search itself: requested domains, covered domains, uncovered domains, and reason hints.
- Add objective-selected excerpts to Search results. These should be query/focus-grounded and capped before returning to the agent.
- Add a Search mode that can use light site discovery for official docs when normal search misses exact pages.
- Make result diversity and official-source coverage explicit scoring inputs for multi-domain agent tasks.
- Keep full scrape power, but make Search good enough that scrape is a precision follow-up, not the default recovery path.

#### MCP conclusions after the second suite

What looks right:

- `content` as the primary control.
- `summary` as the first-pass recommendation.
- `results` for narrow known-source lookup.
- `sourcePolicy`, `freshness`, `focus`, hard budgets, warnings, usage, credits, and Search IDs.
- Diagnostic warnings for partial/no source-policy coverage.

What changed:

- Removed `includeRawResults`. Raw artifact capture belongs to the harness, not the agent-facing tool contract.
- Added raw-output outlier metrics to the benchmark so future runs surface context floods without manually opening traces.

What is still questionable:

- `chunks` is not yet compelling as the default. It can be useful, but the ablations did not show enough advantage over `summary`.
- `focus` is semantically right but not yet strongly evidenced by the deterministic chunk selector.
- The full Firecrawl MCP footprint is still large because Firecrawl exposes many primitives. Product claims should report both full MCP footprint and search working-set footprint.

#### Benchmark conclusions after the second suite

Keep the benchmark trajectory-first.

The metrics found the important anomalies, but only after trace review did the causes become clear:

- Firecrawl hard comparison improved because the agent stayed in search and split by provider.
- Firecrawl methodology got worse because the trajectory drifted into generic research and then used a raw debug affordance.
- Parallel's docs-only task looked successful by final answer, but the trace showed an off-domain search result.
- Exa and Parallel's hard comparisons still needed decomposition, but not the same kind of zero-result recovery as Firecrawl.

Benchmark improvements to make next:

- Add a task card artifact that repeats the question, expected terms, expected domains, and scoring policy in a single file before the first call.
- Add a recovery taxonomy: normal decomposition, zero-result recovery, noisy-result recovery, source-policy recovery, and exact-page verification.
- Add domain-balance scoring for multi-domain tasks.
- Add a first-search score separate from final answer quality.
- Keep raw-output outlier tracking.

Current conclusion:

The MCP changes are directionally correct and made one hard Firecrawl trajectory cleaner. They do not close the endpoint gap. Firecrawl's best next move is server-side: Search should return domain-balanced, objective-shaped, bounded evidence so the agent does not have to manually rebuild that context through repeated searches, map, and scrape.
