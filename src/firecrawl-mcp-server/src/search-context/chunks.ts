export interface ChunkInput {
  query: string;
  focus?: string;
  maxCharsPerResult: number;
}

interface ScoredBlock {
  index: number;
  text: string;
  score: number;
}

function termsFor(query: string, focus?: string): string[] {
  return Array.from(
    new Set(
      `${query} ${focus ?? ''}`
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .filter((term) => term.length > 2)
    )
  );
}

function splitMarkdown(markdown: string): string[] {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const blocks = normalized
    .split(/\n{2,}/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => block.length > 40);
  return blocks.length ? blocks : [normalized.trim()].filter(Boolean);
}

function scoreBlock(text: string, terms: string[], query: string, focus?: string): number {
  const lower = text.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (lower.includes(term)) score += 1;
  }

  const queryLower = query.toLowerCase().trim();
  if (queryLower && lower.includes(queryLower)) score += 4;

  const focusLower = focus?.toLowerCase().trim();
  if (focusLower && lower.includes(focusLower)) score += 3;

  if (/^#{1,6}\s/m.test(text)) score += 0.5;
  if (/```/.test(text)) score += 0.5;

  return score;
}

export function makeChunks(
  markdown: string,
  input: ChunkInput
): Array<{ text: string; charCount: number }> {
  const terms = termsFor(input.query, input.focus);
  const blocks = splitMarkdown(markdown);
  if (!blocks.length) return [];

  const scored: ScoredBlock[] = blocks.map((text, index) => ({
    index,
    text,
    score: scoreBlock(text, terms, input.query, input.focus),
  }));

  const ranked = scored
    .filter((block) => block.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = (ranked.length ? ranked : scored).slice(0, 3);
  selected.sort((a, b) => a.index - b.index);

  const perChunkLimit = Math.max(
    200,
    Math.min(1000, Math.ceil(input.maxCharsPerResult / selected.length))
  );

  return selected.map((block) => {
    const clipped = block.text.slice(0, perChunkLimit);
    return { text: clipped, charCount: clipped.length };
  });
}
