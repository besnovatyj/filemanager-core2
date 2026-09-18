/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * «Естественное» сравнение строк как в проводнике: 'file2' < 'file10', регистр не важен,
 * диакритика учитывается по правилам локали. `Intl.Collator` кэшируется — он дорог в создании.
 */
const collators = new Map<string, Intl.Collator>();

export function naturalCompare(a: string, b: string, locale = 'ru'): number {
  let collator = collators.get(locale);
  if (!collator) {
    collator = new Intl.Collator(locale, {numeric: true, sensitivity: 'base', ignorePunctuation: false});
    collators.set(locale, collator);
  }
  return collator.compare(a, b);
}
