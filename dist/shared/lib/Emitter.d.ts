import type { DisposeFn } from './Disposable';
export type { DisposeFn };
type Listener<T> = (payload: T) => void;
/**
 * Типизированный эмиттер событий для случаев, где событие — по природе событие (задача очереди
 * завершилась, транспорт сообщил прогресс), а не состояние. Для состояния — сигналы.
 *
 * @template Events карта `имя события → тип payload` (`void` — без payload).
 */
export declare class Emitter<Events extends Record<string, unknown>> {
    private readonly listeners;
    on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): DisposeFn;
    once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): DisposeFn;
    off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void;
    emit<K extends keyof Events>(event: K, ...args: Events[K] extends void ? [] : [Events[K]]): void;
    clear(): void;
}
//# sourceMappingURL=Emitter.d.ts.map