function maybeParseJson(text) {
  if (typeof text !== 'string') return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

export function extractMcpText(result) {
  const content = result?.content ?? result?.response?.content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((item) => item?.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n\n');
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function looksLikeResult(item) {
  return (
    item &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    typeof item.url === 'string'
  );
}

function collectResultLike(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value) collectResultLike(item, out);
    return out;
  }
  if (looksLikeResult(value)) out.push(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') collectResultLike(child, out);
  }
  return out;
}

function normalizeItem(item, index) {
  const chunks = Array.isArray(item.chunks)
    ? item.chunks.map((chunk) =>
        typeof chunk === 'string'
          ? { text: chunk }
          : { text: chunk.text ?? chunk.content ?? '', ...chunk }
      )
    : undefined;

  const content =
    item.content ??
    item.text ??
    item.markdown ??
    item.summary ??
    item.snippet ??
    item.highlight ??
    item.highlights?.join?.('\n\n');

  return {
    title: item.title ?? item.name,
    url: item.url,
    domain: getDomain(item.url),
    description: item.description ?? item.snippet,
    publishedDate: item.publishedDate ?? item.date,
    content: typeof content === 'string' ? content : undefined,
    chunks,
    source: item.source,
    category: item.category,
    position: item.position ?? index + 1,
  };
}

export function normalizeToolResult(providerId, toolName, response) {
  const rawText = extractMcpText(response);
  const parsedText = maybeParseJson(rawText);
  const parsed = parsedText ?? response;
  const resultLikes = collectResultLike(parsed);
  const seen = new Set();
  const results = [];

  for (const item of resultLikes) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    results.push(normalizeItem(item, results.length));
  }

  return {
    provider: providerId,
    tool: toolName,
    isError: Boolean(response?.isError),
    rawText,
    parsed,
    results,
  };
}

export function evidenceText(normalized) {
  return normalized.results
    .map((item) =>
      [
        item.title,
        item.url,
        item.description,
        item.content,
        ...(item.chunks?.map((chunk) => chunk.text) ?? []),
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n');
}
