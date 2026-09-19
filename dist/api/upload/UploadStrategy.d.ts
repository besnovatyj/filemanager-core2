import type { DescribeResponse } from '../contract/describe.d.ts';
import type { CallOptions, UploadRequest, UploadResponse } from '../contract/operations.d.ts';
/**
 * Порт стратегии загрузки. Семантика (папка, имя, конфликты, результат — `Node`) одна на всех,
 * различается только доставка байтов: одним multipart-запросом ({@link XhrUploadStrategy}) или
 * докачиваемыми кусками по протоколу tus ({@link TusUploadStrategy}).
 *
 * `UploadFeature` выбирает первую стратегию, чья `canHandle()` вернула true, — порядок регистрации
 * задаёт приоритет (tus раньше XHR).
 */
export interface UploadStrategy {
    readonly name: string;
    /** Подходит ли стратегия для файла при данных возможностях бэкенда. */
    canHandle(file: File, describe: DescribeResponse | null): boolean;
    /**
     * Загрузить файл. Повторный вызов с тем же `file` (после конфликта) не должен гонять байты
     * заново, если стратегия умеет их сохранять (tus).
     */
    upload(request: UploadRequest, options: CallOptions): Promise<UploadResponse>;
}
//# sourceMappingURL=UploadStrategy.d.ts.map