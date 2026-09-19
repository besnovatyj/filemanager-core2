/** Словарь: ключ → строка с плейсхолдерами `{name}`. */
export type Dictionary = Record<string, string>;
export declare function setDictionary(dictionary: Dictionary): void;
/** Переводит ключ, подставляя параметры. Неизвестный ключ возвращается как есть (видно в UI). */
export declare function t(key: string, params?: Record<string, string | number>): string;
/**
 * Русская плюрализация: `plural(n, ['файл', 'файла', 'файлов'])`.
 * Для других языков хост может передать словарь с готовыми формами.
 */
export declare function plural(n: number, forms: [string, string, string]): string;
//# sourceMappingURL=i18n.d.ts.map