import { getEncoding } from 'js-tiktoken';

export const tokenizerName = 'o200k_base';
const encoder = getEncoding(tokenizerName);

export function stableStringify(value) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value ?? null, null, 2);
}

export function countTokens(value) {
  const text = stableStringify(value);
  return encoder.encode(text).length;
}

export function countChars(value) {
  return stableStringify(value).length;
}

export function countBytes(value) {
  return Buffer.byteLength(stableStringify(value), 'utf8');
}

export function textStats(value) {
  return {
    chars: countChars(value),
    bytes: countBytes(value),
    tokens: countTokens(value),
    tokenizer: tokenizerName,
  };
}
