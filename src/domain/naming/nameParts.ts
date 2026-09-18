/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/** Основа и расширение имени: 'a.tar.gz' → {stem:'a.tar', ext:'gz'}; '.env' → {stem:'.env', ext:null}. */
export interface NameParts {
  stem: string;
  ext: string | null;
}

export function splitName(name: string): NameParts {
  const pos = name.lastIndexOf('.');
  if (pos <= 0 || pos === name.length - 1) {
    return {stem: name, ext: null};
  }
  return {stem: name.slice(0, pos), ext: name.slice(pos + 1).toLowerCase()};
}

export function joinName(stem: string, ext: string | null): string {
  return ext ? `${stem}.${ext}` : stem;
}

/** Все dot-сегменты после основы: 'shell.php.jpg' → ['php','jpg'] (для блок-листа). */
export function allExtensions(name: string): string[] {
  const parts = name.replace(/^\.+/, '').split('.');
  parts.shift();
  return parts.map((p) => p.toLowerCase()).filter(Boolean);
}

/** Длина строки в байтах UTF-8 (лимиты имён считаются в байтах, как в ФС). */
export function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}
