/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

const UNITS = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ', 'ПБ'] as const;

/**
 * Размер в человекочитаемом виде (двоичные единицы, как в проводнике): 1536 → «1,5 КБ».
 * null/undefined — «—».
 */
export function formatBytes(bytes: number | null | undefined, locale = 'ru-RU'): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} ${UNITS[0]}`;
  }
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = value < 10 ? 1 : 0;
  return `${value.toLocaleString(locale, {maximumFractionDigits: digits, minimumFractionDigits: 0})} ${UNITS[unit]}`;
}
