/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Стили Web Components: строка CSS → `CSSStyleSheet`, кэшируемый по тексту и подключаемый через
 * `adoptedStyleSheets` (один парсинг на все экземпляры компонента).
 */
const cache = new Map<string, CSSStyleSheet>();

/** Тег для подсветки CSS в редакторе: css`...`. Ничего не делает, кроме склейки. */
export function css(strings: TemplateStringsArray, ...values: (string | number)[]): string {
  return strings.reduce((out, part, i) => out + part + (i < values.length ? String(values[i]) : ''), '');
}

export function sheet(text: string): CSSStyleSheet {
  let s = cache.get(text);
  if (!s) {
    s = new CSSStyleSheet();
    s.replaceSync(text);
    cache.set(text, s);
  }
  return s;
}

/** Подключает наборы стилей к shadow root (порядок = порядок каскада). */
export function adoptStyles(root: ShadowRoot, ...texts: string[]): void {
  root.adoptedStyleSheets = texts.map(sheet);
}
