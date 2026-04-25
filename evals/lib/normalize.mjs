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
    typeof (item.url ?? item.sourceURL ?? item.finalURL) === 'string'
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

function textParts(item) {
  const values = [
    item.content,
    item.text,
    item.markdown,
    item.summary,
    item.snippet,
    item.highlight,
    item.raw_content,
    item.rawContent,
    item.full_content,
    item.fullContent,
    Array.isArray(item.excerpts) ? item.excerpts.join('\n\n') : undefined,
    Array.isArray(item.highlights) ? item.highlights.join('\n\n') : undefined,
  ];

  return values
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
}

function clipContent(text, maxChars = 8000) {
  if (!text) return undefined;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[normalized excerpt truncated ${text.length - maxChars} chars; full response saved in raw artifact]`;
}

function normalizeItem(item, index) {
  const chunks = Array.isArray(item.chunks)
    ? item.chunks.map((chunk) =>
        typeof chunk === 'string'
          ? { text: chunk }
          : { text: chunk.text ?? chunk.content ?? '', ...chunk }
      )
    : undefined;

  const content = textParts(item).join('\n\n');

  return {
    title: item.title ?? item.name,
    url: item.url ?? item.sourceURL ?? item.finalURL,
    domain: getDomain(item.url ?? item.sourceURL ?? item.finalURL),
    description: item.description ?? item.snippet,
    publishedDate: item.publishedDate ?? item.publish_date ?? item.date,
    content: clipContent(content),
    chunks,
    source: item.source,
    category: item.category,
    position: item.position ?? index + 1,
  };
}

function resultLikesFromParsed(parsed) {
  const resultLikes = collectResultLike(parsed);

  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    typeof parsed.markdown === 'string'
  ) {
    const metadata = parsed.metadata ?? {};
    const url = parsed.url ?? metadata.sourceURL ?? metadata.finalURL ?? metadata.url;
    if (url) {
      resultLikes.unshift({
        title: parsed.title ?? metadata.title,
        url,
        sourceURL: metadata.sourceURL,
        finalURL: metadata.finalURL,
        markdown: parsed.markdown,
      });
    }
  }

  return resultLikes;
}

function markdownSections(rawText) {
  const matches = Array.from(rawText.matchAll(/^#\s+(.+?)\nURL:\s+(https?:\/\/\S+)/gm));
  if (!matches.length) return [];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? rawText.length;
    return {
      title: match[1].trim(),
      url: match[2].trim(),
      markdown: rawText.slice(start, end).trim(),
    };
  });
}

export function normalizeToolResult(providerId, toolName, response) {
  const rawText = extractMcpText(response);
  const parsedText = maybeParseJson(rawText);
  const parsed = parsedText ?? response;
  const resultLikes = [
    ...markdownSections(rawText),
    ...resultLikesFromParsed(parsed),
  ];
  const seen = new Set();
  const results = [];

  for (const item of resultLikes) {
    const url = item.url ?? item.sourceURL ?? item.finalURL;
    if (!url || seen.has(url)) continue;
    seen.add(url);
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
