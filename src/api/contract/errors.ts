/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/** Коды ошибок контракта bescms-fs v1 (§3). */
export type ErrorCode =
  | 'bad_request'
  | 'path_invalid'
  | 'name_invalid'
  | 'mount_unknown'
  | 'not_found'
  | 'exists'
  | 'forbidden'
  | 'policy_rejected'
  | 'unsupported'
  | 'too_large'
  | 'invalid_operation'
  | 'conflict'
  | 'internal';

export const ERROR_CODES: ReadonlySet<string> = new Set<ErrorCode>([
  'bad_request', 'path_invalid', 'name_invalid', 'mount_unknown', 'not_found', 'exists', 'forbidden',
  'policy_rejected', 'unsupported', 'too_large', 'invalid_operation', 'conflict', 'internal',
]);

/** Тело `error` конверта (§2). */
export interface ErrorBody {
  code: ErrorCode;
  message: string;
  path?: string;
  details?: Record<string, unknown>;
}
