/**
 * Разбор HTTP-ответа в `data` конверта либо ApiError.
 *
 * Учитывает три формы тела:
 *  1. наш конверт `{ok, data|error}` — основной путь;
 *  2. JSON фреймворка хоста без `ok` (Yii отдаёт `{name, message, status}` на 403/404) —
 *     код по HTTP-статусу, текст — из `message`;
 *  3. не-JSON (HTML-страница ошибки, пустое тело) — код по HTTP-статусу.
 */
export declare function decodeEnvelope(status: number, body: unknown): unknown;
/** Разбор текста тела как JSON; не-JSON → undefined (дальше решает decodeEnvelope по статусу). */
export declare function parseJsonSafe(text: string): unknown;
//# sourceMappingURL=envelope.d.ts.map