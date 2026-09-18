/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {ru} from './ru';

/** Словарь: ключ → строка с плейсхолдерами `{name}`. */
export type Dictionary = Record<string, string>;

/**
 * Локализация без зависимостей. Русский — встроенный дефолт (админка русскоязычная); другой язык
 * подключается через {@link setDictionary} — словарь передаёт хост, ядро в него не заглядывает.
 *
 * Ключи — стабильные идентификаторы (`cmd.rename`, `dialog.delete.title`), а не английский текст:
 * так текст можно править, не трогая код.
 */
let active: Dictionary = ru;

export function setDictionary(dictionary: Dictionary): void {
  active = {...ru, ...dictionary};
}

/** Переводит ключ, подставляя параметры. Неизвестный ключ возвращается как есть (видно в UI). */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = active[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

/**
 * Русская плюрализация: `plural(n, ['файл', 'файла', 'файлов'])`.
 * Для других языков хост может передать словарь с готовыми формами.
 */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) {
    return forms[2];
  }
  if (last > 1 && last < 5) {
    return forms[1];
  }
  if (last === 1) {
    return forms[0];
  }
  return forms[2];
}
