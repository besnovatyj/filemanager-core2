/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

let counter = 0;

/**
 * Короткий уникальный идентификатор в пределах страницы (задачи очереди, DOM-id для aria).
 * Не криптографический и не глобально уникальный — для этого есть `crypto.randomUUID()`.
 */
export function uid(prefix = 'fm'): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}
