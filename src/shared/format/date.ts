/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/** Unix-время (секунды) → «18.09.2026 14:05». null — «—». */
export function formatDateTime(unixSeconds: number | null | undefined, locale = 'ru-RU'): string {
  if (unixSeconds === null || unixSeconds === undefined || !Number.isFinite(unixSeconds)) {
    return '—';
  }
  return new Date(unixSeconds * 1000).toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
