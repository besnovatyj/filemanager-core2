import type { NameViolation } from '../domain/naming/NameValidator.d.ts';
import type { ApiError } from '../api/codec/ApiError.d.ts';
/** Текст подсказки для нарушения правила имени (локальная проверка). */
export declare function nameViolationMessage(violation: NameViolation): string;
/**
 * Текст для ошибки API: если сервер прислал `details.rule` для `name_invalid` — та же подсказка,
 * что при локальной проверке; иначе — сообщение сервера или общий текст по коду.
 */
export declare function apiErrorMessage(error: ApiError): string;
//# sourceMappingURL=nameMessages.d.ts.map