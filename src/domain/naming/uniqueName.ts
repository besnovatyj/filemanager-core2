/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {joinName, splitName} from './nameParts';

/**
 * Незанятое имя в стиле проводника: 'Новая папка' → 'Новая папка (2)'; 'a (2).txt' → 'a (3).txt'.
 * Используется для дефолтного имени новой папки и оптимистичных вставок; сервер делает то же
 * самое при `onConflict: rename`.
 */
export function uniqueName(name: string, exists: (candidate: string) => boolean): string {
  if (!exists(name)) return name;
  const {stem, ext} = splitName(name);
  const match = /^(.*) \((\d+)\)$/.exec(stem);
  const base = match ? (match[1] as string) : stem;
  let i = match ? Number(match[2]) + 1 : 2;
  for (let attempts = 0; attempts < 1000; attempts++, i++) {
    const candidate = joinName(`${base} (${i})`, ext);
    if (!exists(candidate)) return candidate;
  }
  return joinName(`${base} (${Date.now().toString(36)})`, ext);
}
