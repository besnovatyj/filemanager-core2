/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Правила именования — приходят от сервера в `describe.naming` (контракт §6).
 * Дефолты совпадают с серверными `NameRules`, чтобы UI работал и до ответа `describe`.
 */
export interface NameRules {
  maxLength: number;
  forbiddenChars: string[];
  forbiddenNames: string[];
  allowLeadingDot: boolean;
  allowTrailingDotOrSpace: boolean;
  blockedExtensions: string[];
  unicodeNormalization: 'NFC' | null;
  /** Сервер транслитерирует кириллицу при загрузке (информационно: имя формирует сервер). */
  transliterate?: boolean;
}

export const DEFAULT_NAME_RULES: NameRules = Object.freeze({
  maxLength: 255,
  forbiddenChars: ['/', '\\', ':', '*', '?', '"', '<', '>', '|'],
  forbiddenNames: [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
  ],
  allowLeadingDot: false,
  allowTrailingDotOrSpace: false,
  blockedExtensions: ['php', 'phtml', 'phar', 'shtml', 'cgi', 'pl', 'py', 'asp', 'aspx', 'jsp', 'htaccess', 'htpasswd', 'sh'],
  unicodeNormalization: 'NFC',
});
