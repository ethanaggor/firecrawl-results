# Agent search context benchmark

This benchmark evaluates MCP search tools the way a coding agent actually uses them: through tool discovery, schema inspection, search calls, possible follow-up fetches, and final evidence synthesis.

The main comparison is:

- `firecrawl-original`: upstream Firecrawl MCP server.
- `firecrawl-context`: this project's Firecrawl MCP fork with the upgraded `firecrawl_search` context contract.
- `exa`: Exa remote MCP.
- `parallel`: Parallel Search remote MCP.
- `tavily`: Tavily remote MCP.

## Research grounding

The benchmark design borrows the useful parts of public competitor evals without pretending to reproduce them exactly.

Parallel's public search benchmark frames search for agents around accuracy, total cost, fewer tool calls, and dense excerpts. Their WISER-Search blend combines WISER-Fresh and WISER-Atomic tasks, then compares Parallel MCP, Exa MCP/tool calling, and native model search across several models. The relevant lesson for this project is that agent search should be judged over the full workflow, not only over standalone SERP relevance.

Exa's public evals use several complementary frames: SimpleQA-style answer correctness, MSMARCO-style result relevance with LLM judges, WebCode-style coding-agent retrieval, and extraction/content quality metrics such as completeness, accuracy, structure, code recall, table recall, signal, and ROUGE-L. Exa's evaluation guide also warns against comparing systems across different latency classes and recommends recording retrieval quality, latency, freshness, cost efficiency, and agentic suitability.

Tavily publishes a search-evals repository for SimpleQA and document relevance, and its docs make `search_depth` an explicit quality/latency/content-shape tradeoff. Tavily's useful lesson is to treat search modes as product surfaces: different depths return different kinds of context and should be evaluated as such.

Sources:

- Parallel Search MCP benchmark and WISER-Search framing: `https://parallel.ai/blog/search-api-benchmark`
- Parallel free Search MCP: `https://parallel.ai/blog/free-web-search-mcp`
- Parallel Search MCP docs: `https://docs.parallel.ai/integrations/mcp/search-mcp`
- Exa API evals: `https://exa.ai/blog/api-evals`
- Exa WebCode eval: `https://exa.ai/blog/webcode`
- Exa evaluation guide: `https://docs.exa.ai/reference/evaluating-exa-search`
- Exa remote MCP docs: `https://exa.ai/docs/reference/exa-mcp`
- Tavily search-evals repo: `https://github.com/tavily-ai/tavily-search-evals`
- Tavily search best practices: `https://docs.tavily.com/documentation/best-practices/best-practices-search`

## Benchmark questions

Every suite answers a question.

1. Can the agent discover and use the right search tool from schema alone?
2. How much tool/schema footprint enters the context window before any search call?
3. Can the agent get enough useful web context without blowing the context budget?
4. Does the MCP preserve enough context for good follow-up calls?
5. How often does the agent need search plus fetch rather than search alone?
6. Do source and freshness constraints work when the task requires them?
7. How much of the final answer is supported by visible evidence?
8. Which provider gives the best combined retrieval quality and agent experience?

## Suites

### Contract footprint

Connect to each MCP, call `listTools`, capture the full tool surface, and count:

- `toolCount`
- `searchToolCount`
- `schemaTokens`
- `descriptionTokens`
- `totalMcpFootprintTokens`
- `requiredFieldCount`
- `optionalFieldCount`
- `enumCount`
- `hasFreshnessControl`
- `hasSourcePolicyControl`
- `hasContentBudgetControl`
- `hasFetchTool`
- `hasUsageMetadata`

### Agent trajectory

This is the primary benchmark. The harness records the trajectory, but the agent decides what to call next after seeing each result.

A trajectory may include:

- list tools
- inspect schema
- search
- refine search
- fetch/scrape when necessary
- finish with evidence and a score

Recorded metrics:

- `toolCalls`
- `searchCalls`
- `fetchCalls`
- `mapCalls`
- `discoveryCalls`
- `extractionCalls`
- `failedCalls`
- `recoverableErrors`
- `zeroResultSearchCalls`
- `recoverySignalCalls`
- `firstSearch`
- `latencyTotalMs`
- `rawInputTokens`
- `rawOutputTokens`
- `normalizedEvidenceTokens`
- `evidenceToRawTokenRatio`
- `rawOutputOutlierCalls`
- `maxRawOutputCall`
- `totalTrajectoryTokens`
- `finalEvidenceTokens`
- `usefulEvidenceRatio`
- `agentExperienceScore`
- `retrievalQualityScore`

### Retrieval/context

Normalize each provider's result into a common evidence shape and score:

- `resultCount`
- `uniqueUrlCount`
- `uniqueDomainCount`
- `primarySourceCount`
- `expectedDomainHit`
- `expectedUrlHit`
- `expectedTermHit`
- `sourcePolicyAdherent`
- `freshnessAdherent`
- `answerSupportedByEvidence`
- `tokensPerUsefulFinding`

### Case studies

Select the most informative trajectories and render them side by side in the results page:

- task
- provider
- tool calls
- arguments
- excerpts
- normalized evidence
- quantitative metrics
- agent scoring rationale

## Provider endpoints

Remote MCPs:

- Exa: `https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa,web_search_advanced_exa`
- Parallel: `https://search.parallel.ai/mcp`
- Tavily: `https://mcp.tavily.com/mcp/?tavilyApiKey=<TAVILY_API_KEY>`

Local stdio MCPs:

- Original Firecrawl: `../firecrawl-mcp-server-upstream`, command `node dist/index.js`
- Firecrawl context fork: `../firecrawl-mcp-server`, command `node dist/index.js`

Expected env vars in this repo's `.env`:

- `FIRECRAWL_API_KEY`
- `EXA_API_KEY`
- `TAVILY_API_KEY`
- `PARALLEL_API_KEY` optional

The repo `.env` is ignored and loaded with override semantics so local benchmark keys win over shell values.

## Token counting

The benchmark uses `js-tiktoken` with `o200k_base`. Counts are recorded for:

- tool schemas and descriptions
- tool arguments
- raw MCP responses as seen by the agent
- normalized evidence
- final answer and scoring artifacts

The raw MCP response token count is the key context-cost metric because it reflects what enters the agent's context window.

Raw output outliers are calls whose raw response is above 50,000 tokens. They are not automatically failures, but they require trace review. The second suite exposed one bad MCP affordance this way: `includeRawResults` allowed raw Firecrawl search payloads to enter the agent context even though the harness already records raw artifacts separately.

## Normalization policy

The harness keeps raw MCP responses on disk and also writes a bounded normalized evidence shape for metric calculations and visual comparison.

Normalization is intentionally conservative:

- Search outputs keep title, URL, description/snippet, source, and bounded content fields when present.
- Fetch/scrape outputs now preserve bounded page evidence from common fields such as `markdown`, `content`, `text`, `raw_content`, `full_content`, `summary`, `highlights`, and `excerpts`.
- Plain markdown fetch responses are parsed into inspectable evidence instead of being treated as zero-result payloads.
- Normalized content is clipped for comparability; the raw artifact remains the source of truth.
- MCP contracts should not expose debug/raw payload flags to the agent by default. The harness owns raw artifact capture.

This matters because the first benchmark initially undercounted evidence from fetch and scrape calls. The corrected reports recompute `normalizedEvidenceTokens`, first-search metrics, recovery burden, and schema footprint from the saved raw artifacts.

## Recovery metrics

The benchmark treats final answer quality as necessary but insufficient. A tool can eventually answer a task while still making the agent work around weak search results.

The current recovery signals are:

- zero-result search calls
- search calls that miss all expected domains
- Firecrawl map calls, because map often appears after search fails or under-discovers the target pages

These metrics are not a judge by themselves. They are a triage signal. When recovery is high, read the trajectory before making a product claim.

## Firecrawl ablations

Run controlled Firecrawl-only ablations after building the MCP fork:

```bash
node evals/firecrawl-ablations.mjs --mcp-root=../firecrawl-mcp-server
```

The ablation runner calls the search context implementation directly and compares content modes, source-policy strategies, and focus behavior. It writes reports under `evals/reports/`.

The first ablation result rejected `hybrid` source-policy as a default. It also moved the MCP recommendation toward `summary` as first-pass agent context while keeping `results` for narrow known-source lookup.

## Manual agent workflow

Start a run:

```bash
node evals/agent-run.mjs start --provider firecrawl-context --task docs-parity
```

List recorded tools:

```bash
node evals/agent-run.mjs tools --run <run-id>
```

Call a tool:

```bash
node evals/agent-run.mjs call --run <run-id> --tool firecrawl_search --args evals/work/args.json
```

Finish and score:

```bash
node evals/agent-run.mjs finish --run <run-id> --answer evals/work/final-answer.md --score evals/work/score.json
```

Publish a run into GitHub Pages data:

```bash
node evals/publish-results.mjs --run <run-id>
```

The harness saves all raw responses, normalized evidence, traces, and metrics under `evals/runs/<run-id>/`.
