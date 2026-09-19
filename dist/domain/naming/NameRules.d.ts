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
export declare const DEFAULT_NAME_RULES: NameRules;
//# sourceMappingURL=NameRules.d.ts.map