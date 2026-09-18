/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Сопоставление имени с поисковым запросом — зеркало серверного `fs/operation/NameMatcher.php`:
 * подстрока без учёта регистра либо маска `*`/`?`, если в запросе есть метасимволы.
 *
 * Нужно клиенту, чтобы после операций (переименование, загрузка) поправить список результатов
 * поиска по фактам, не гоняя обход на сервере заново, и клиенту в памяти для демо.
 */
export interface NameMatcher {
  readonly isGlob: boolean;
  matches(name: string): boolean;
}

export function createNameMatcher(query: string): NameMatcher {
  const trimmed = query.trim();
  const isGlob = trimmed.includes('*') || trimmed.includes('?');
  if (isGlob) {
    const escaped = trimmed.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
    const re = new RegExp(`^${escaped}$`, 'iu');
    return {isGlob, matches: (name) => re.test(name)};
  }
  const needle = trimmed.toLowerCase();
  return {isGlob, matches: (name) => needle === '' || name.toLowerCase().includes(needle)};
}
