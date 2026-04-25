# Agent experience rubric

Use this rubric after completing a trajectory. Score each dimension from 1 to 5.

## Tool discovery

5: The right tool and usage pattern were obvious from the tool name, description, and schema.
4: The right tool was clear with minor ambiguity.
3: The tool was usable, but required reading around or guessing.
2: The right path was not obvious and required trial and error.
1: The tool surface actively misled or blocked the trajectory.

## Control expressiveness

5: The MCP exposed the controls needed for the task directly and safely.
4: The important controls existed, with minor naming or shape friction.
3: The task was possible, but the controls were awkward or indirect.
2: The task required provider-specific workarounds.
1: The needed controls were absent.

## Output inspectability

5: The result was compact, source-grounded, and easy to inspect for follow-up.
4: The result was useful with small amounts of extra parsing.
3: The result contained useful evidence but also notable noise or missing fields.
2: The result required substantial extra work before it was actionable.
1: The result was not inspectable or not useful.

## Follow-up affordance

5: The output made the next best call obvious.
4: The next call was clear with minor gaps.
3: The agent could continue, but mostly from its own priors.
2: The output gave weak follow-up clues.
1: The output did not support follow-up reasoning.

## Error recoverability

5: Errors were explicit, scoped, and easy to recover from.
4: Errors were recoverable with small interpretation.
3: Errors were understandable but required trial and error.
2: Errors were vague or provider-specific.
1: Errors blocked progress.

## Overall score

Average the dimensions, then add a short rationale that references exact trace steps.
