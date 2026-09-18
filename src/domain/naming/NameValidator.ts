/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {DEFAULT_NAME_RULES, type NameRules} from './NameRules';
import {allExtensions, splitName, utf8Length} from './nameParts';

/**
 * Нарушение правила именования. `rule` совпадает с серверными идентификаторами
 * (`details.rule` ошибки `name_invalid`), поэтому подсказки в UI одни и те же для локальной и
 * серверной проверки. `params` — данные для текста подсказки.
 */
export interface NameViolation {
  rule:
    | 'empty' | 'dot_name' | 'max_length' | 'control_chars' | 'forbidden_char'
    | 'trailing_dot_or_space' | 'leading_space' | 'leading_dot' | 'reserved_name'
    | 'blocked_extension' | 'separator';
  params?: Record<string, string | number>;
}

/**
 * Клиентская проверка имени по правилам сервера — чтобы подсветить ошибку при вводе, а не после
 * запроса. Сервер всё равно проверяет заново; здесь — только UX.
 */
export class NameValidator {
  constructor(private readonly rules: NameRules = DEFAULT_NAME_RULES) {}

  /** Первое нарушение либо null, если имя допустимо. */
  validate(rawName: string): NameViolation | null {
    const name = this.normalize(rawName);

    if (name === '') return {rule: 'empty'};
    if (name === '.' || name === '..') return {rule: 'dot_name'};
    if (name.includes('/') || name.includes('\\')) return {rule: 'separator'};
    if (utf8Length(name) > this.rules.maxLength) return {rule: 'max_length', params: {max: this.rules.maxLength}};
    if (/[\p{Cc}\p{Cf}]/u.test(name)) return {rule: 'control_chars'};
    for (const char of this.rules.forbiddenChars) {
      if (char && name.includes(char)) return {rule: 'forbidden_char', params: {char}};
    }
    if (!this.rules.allowTrailingDotOrSpace && (name.endsWith('.') || name.endsWith(' '))) {
      return {rule: 'trailing_dot_or_space'};
    }
    if (name.startsWith(' ')) return {rule: 'leading_space'};
    if (!this.rules.allowLeadingDot && name.startsWith('.')) return {rule: 'leading_dot'};

    const stem = splitName(name).stem.toUpperCase();
    if (this.rules.forbiddenNames.some((r) => r.toUpperCase() === stem)) return {rule: 'reserved_name'};

    const blocked = new Set(this.rules.blockedExtensions.map((e) => e.toLowerCase()));
    for (const ext of allExtensions(name)) {
      if (blocked.has(ext)) return {rule: 'blocked_extension', params: {ext}};
    }
    return null;
  }

  isValid(name: string): boolean {
    return this.validate(name) === null;
  }

  /** NFC-нормализация, как на сервере. */
  normalize(name: string): string {
    return this.rules.unicodeNormalization === 'NFC' ? name.normalize('NFC') : name;
  }
}
