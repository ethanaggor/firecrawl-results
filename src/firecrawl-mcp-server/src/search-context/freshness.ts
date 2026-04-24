import type { SearchFreshness } from './types.js';

function formatDateForTbs(date: string): string {
  const [year, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}/${year}`;
}

export function toTbs(freshness?: SearchFreshness): string | undefined {
  if (!freshness) return undefined;

  if (typeof freshness === 'string') {
    const map = {
      hour: 'qdr:h',
      day: 'qdr:d',
      week: 'qdr:w',
      month: 'qdr:m',
      year: 'qdr:y',
    } as const;
    return map[freshness];
  }

  const parts: string[] = [];
  if (freshness.sortByDate) parts.push('sbd:1');
  if (freshness.startDate || freshness.endDate) {
    parts.push('cdr:1');
    if (freshness.startDate) {
      parts.push(`cd_min:${formatDateForTbs(freshness.startDate)}`);
    }
    if (freshness.endDate) {
      parts.push(`cd_max:${formatDateForTbs(freshness.endDate)}`);
    }
  }

  return parts.length ? parts.join(',') : undefined;
}
