/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import type {NameViolation} from '@/domain/naming/NameValidator';
import type {ApiError} from '@/api/codec/ApiError';

/** Текст подсказки для нарушения правила имени (локальная проверка). */
export function nameViolationMessage(violation: NameViolation): string {
  return t(`name.error.${violation.rule}`, violation.params ?? {});
}

/**
 * Текст для ошибки API: если сервер прислал `details.rule` для `name_invalid` — та же подсказка,
 * что при локальной проверке; иначе — сообщение сервера или общий текст по коду.
 */
export function apiErrorMessage(error: ApiError): string {
  if (error.code === 'name_invalid' && typeof error.details.rule === 'string') {
    const params: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(error.details)) {
      if (typeof v === 'string' || typeof v === 'number') params[k] = v;
    }
    const key = `name.error.${error.details.rule}`;
    const text = t(key, params);
    if (text !== key) return text;
  }
  if (error.message && error.code !== 'internal' && error.code !== 'network') return error.message;
  return t(`error.${error.code}`);
}
