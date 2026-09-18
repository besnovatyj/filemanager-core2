/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {ApiError} from './ApiError';
import {CONTRACT_VERSION} from '@/api/contract/describe';
import type {ErrorBody} from '@/api/contract/errors';

/**
 * Разбор HTTP-ответа в `data` конверта либо ApiError.
 *
 * Учитывает три формы тела:
 *  1. наш конверт `{ok, data|error}` — основной путь;
 *  2. JSON фреймворка хоста без `ok` (Yii отдаёт `{name, message, status}` на 403/404) —
 *     код по HTTP-статусу, текст — из `message`;
 *  3. не-JSON (HTML-страница ошибки, пустое тело) — код по HTTP-статусу.
 */
export function decodeEnvelope(status: number, body: unknown): unknown {
  if (isObject(body) && typeof body.ok === 'boolean') {
    checkContract(body.meta);
    if (body.ok === true) {
      return body.data;
    }
    const error = body.error;
    if (isObject(error) && typeof error.code === 'string' && typeof error.message === 'string') {
      return throwError(ApiError.fromBody(error as unknown as ErrorBody, status));
    }
    return throwError(ApiError.fromHttpStatus(status));
  }
  if (status >= 200 && status < 300) {
    return throwError(new ApiError('decode', 'Ответ сервера не в формате конверта bescms-fs', {httpStatus: status, details: {body}}));
  }
  const message = isObject(body) && typeof body.message === 'string' ? body.message : undefined;
  return throwError(ApiError.fromHttpStatus(status, message));
}

/** Разбор текста тела как JSON; не-JSON → undefined (дальше решает decodeEnvelope по статусу). */
export function parseJsonSafe(text: string): unknown {
  if (text === '') return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

let contractWarned = false;

/** Major контракта должен совпадать; minor — предупреждение один раз. */
function checkContract(meta: unknown): void {
  if (!isObject(meta) || typeof meta.contract !== 'string') return;
  const [serverMajor, serverMinor] = meta.contract.split('.');
  const [clientMajor, clientMinor] = CONTRACT_VERSION.split('.');
  if (serverMajor !== clientMajor) {
    throw new ApiError('contract', `Несовместимая версия контракта сервера: ${meta.contract} (клиент ${CONTRACT_VERSION})`);
  }
  if (serverMinor !== clientMinor && !contractWarned) {
    contractWarned = true;
    console.warn(`[filemanager] версия контракта сервера ${meta.contract}, клиента ${CONTRACT_VERSION}: неизвестные поля игнорируются`);
  }
}

function throwError(error: ApiError): never {
  throw error;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
