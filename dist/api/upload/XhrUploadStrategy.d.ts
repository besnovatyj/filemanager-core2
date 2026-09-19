import type { FsClient } from '../client/FsClient.d.ts';
import type { CallOptions, UploadRequest, UploadResponse } from '../contract/operations.d.ts';
import type { UploadStrategy } from './UploadStrategy';
/** Загрузка одним multipart-запросом через операцию `upload` контракта. Подходит всегда — стратегия по умолчанию. */
export declare class XhrUploadStrategy implements UploadStrategy {
    private readonly client;
    readonly name = "xhr";
    constructor(client: FsClient);
    canHandle(): boolean;
    upload(request: UploadRequest, options: CallOptions): Promise<UploadResponse>;
}
//# sourceMappingURL=XhrUploadStrategy.d.ts.map