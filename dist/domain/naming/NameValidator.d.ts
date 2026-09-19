import { type NameRules } from './NameRules';
/**
 * Нарушение правила именования. `rule` совпадает с серверными идентификаторами
 * (`details.rule` ошибки `name_invalid`), поэтому подсказки в UI одни и те же для локальной и
 * серверной проверки. `params` — данные для текста подсказки.
 */
export interface NameViolation {
    rule: 'empty' | 'dot_name' | 'max_length' | 'control_chars' | 'forbidden_char' | 'trailing_dot_or_space' | 'leading_space' | 'leading_dot' | 'reserved_name' | 'blocked_extension' | 'separator';
    params?: Record<string, string | number>;
}
/**
 * Клиентская проверка имени по правилам сервера — чтобы подсветить ошибку при вводе, а не после
 * запроса. Сервер всё равно проверяет заново; здесь — только UX.
 */
export declare class NameValidator {
    private readonly rules;
    constructor(rules?: NameRules);
    /** Первое нарушение либо null, если имя допустимо. */
    validate(rawName: string): NameViolation | null;
    isValid(name: string): boolean;
    /** NFC-нормализация, как на сервере. */
    normalize(name: string): string;
}
//# sourceMappingURL=NameValidator.d.ts.map