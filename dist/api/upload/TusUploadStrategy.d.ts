import type { FsClient } from '../client/FsClient.d.ts';
import type { DescribeResponse } from '../contract/describe.d.ts';
import type { CallOptions, UploadRequest, UploadResponse } from '../contract/operations.d.ts';
import type { UploadStrategy } from './UploadStrategy';
/**
 * Докачиваемая загрузка по протоколу tus (tus-js-client, MIT) + финализация через операцию
 * контракта `upload-finalize` (§9.12).
 *
 * Разделение ответственности: tus доставляет байты во временный файл на сервере (куски, докачка
 * после обрыва, повтор с экспоненциальной паузой); наша операция переносит готовый файл в папку с
 * обычной семантикой (санитизация имени, политика, конфликты). Поэтому при конфликте повтор
 * `upload()` с новой стратегией НЕ гоняет байты заново: id завершённой загрузки запоминается по файлу.
 *
 * Стратегия берёт файлы не меньше `tus.threshold`; мелкие уходят обычным multipart.
 */
export declare class TusUploadStrategy implements UploadStrategy {
    private readonly client;
    private readonly headers;
    private readonly describe;
    readonly name = "tus";
    /** Файлы, чьи байты уже на сервере: повторная финализация без загрузки. */
    private readonly completed;
    /**
     * @param client клиент контракта (для `upload-finalize`)
     * @param headers заголовки для tus-запросов (CSRF, X-Fs-Scope) — функция, т.к. могут обновляться
     * @param describe актуальный ответ describe (параметры tus берутся из него)
     */
    constructor(client: FsClient, headers: () => Record<string, string>, describe: () => DescribeResponse | null);
    canHandle(file: File, describe: DescribeResponse | null): boolean;
    upload(request: UploadRequest, options: CallOptions): Promise<UploadResponse>;
    /** Параметры tus из describe; при их отсутствии стратегия неприменима. */
    private static rules;
    private transfer;
    /** Идентификатор загрузки — query `id` либо последний сегмент Location (оба формата допустимы протоколом). */
    private static idFromUrl;
}
//# sourceMappingURL=TusUploadStrategy.d.ts.map