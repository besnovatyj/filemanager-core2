import type { ErrorBody } from './errors';
/** Конверт ответа (§2). */
export interface SuccessEnvelope<T> {
    ok: true;
    data: T;
    meta?: {
        contract?: string;
        elapsedMs?: number;
        [key: string]: unknown;
    };
}
export interface ErrorEnvelope {
    ok: false;
    error: ErrorBody;
    meta?: {
        contract?: string;
        [key: string]: unknown;
    };
}
export type Envelope<T> = SuccessEnvelope<T> | ErrorEnvelope;
//# sourceMappingURL=envelope.d.ts.map