/**
 * Разрешение конфликтов имён (контракт §8, ADR-6).
 *
 * Сервер по умолчанию отвечает `exists`; клиент спрашивает пользователя и повторяет операцию
 * только для конфликтных элементов с выбранной стратегией. «Применить ко всем» запоминает выбор
 * на время одной пакетной операции (см. TransferFeature и UploadFeature).
 */
export type ConflictStrategy = 'fail' | 'overwrite' | 'rename' | 'skip';
/** Выбор пользователя в диалоге конфликта. */
export interface ConflictChoice {
    strategy: Exclude<ConflictStrategy, 'fail'>;
    applyToAll: boolean;
}
/** Элемент отчёта, упавший с `exists`, — кандидат на повтор. */
export interface ConflictItem {
    source: string;
    /** Имя, которое конфликтует (последний сегмент источника). */
    name: string;
}
//# sourceMappingURL=ConflictResolution.d.ts.map