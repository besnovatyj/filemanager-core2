/**
 * Виртуальный путь — адрес узла в единой ФС файлового менеджера (контракт §4):
 * `/` — корень (список хранилищ), `/{mount}` — корень хранилища, `/{mount}/a/b.txt` — узел.
 *
 * Зеркало серверного `Besnovatyj\File\fs\path\VirtualPath`, но с одним отличием по роли:
 * сервер только ОТКЛОНЯЕТ неканонические пути, а клиент ещё и НОРМАЛИЗУЕТ ввод пользователя
 * (адресная строка: лишние слеши, пробелы по краям) — см. {@link VirtualPath.normalize}.
 *
 * Неизменяемый value object; сравнивать через {@link equals} или по {@link toString}.
 */
export declare class VirtualPath {
    /** Идентификатор хранилища; null — только у корня `/`. */
    readonly mount: string | null;
    /** Сегменты внутри хранилища (без его id). */
    readonly segments: readonly string[];
    static readonly MOUNT_ID_PATTERN: RegExp;
    private constructor();
    static root(): VirtualPath;
    static mountRoot(mountId: string): VirtualPath;
    /**
     * Строгий разбор канонического пути (как на сервере). Бросает {@link PathError}.
     */
    static parse(raw: string): VirtualPath;
    /**
     * Мягкий разбор пользовательского ввода: обрезает пробелы, схлопывает слеши, убирает
     * завершающий слеш, принимает `\` как разделитель (привычка Windows). Сегменты при этом
     * проверяются так же строго — `..` не пройдёт. Возвращает null, если путь невалиден.
     */
    static normalize(input: string): VirtualPath | null;
    /** Быстрая проверка без создания объекта. */
    static isValid(raw: string): boolean;
    get isRoot(): boolean;
    get isMountRoot(): boolean;
    /** Последний сегмент; для корня хранилища — его id; для `/` — ''. */
    get name(): string;
    /** `/` → 0, `/m` → 1, `/m/a` → 2. */
    get depth(): number;
    /** Родитель; null у `/`. Родитель корня хранилища — `/`. */
    parent(): VirtualPath | null;
    /** Все предки от корня до родителя включительно (для хлебных крошек). */
    ancestors(): VirtualPath[];
    /** Дочерний путь; у корня дочерний элемент — хранилище. */
    child(name: string): VirtualPath;
    /** Строгий предок (сам себе — нет). */
    isAncestorOf(other: VirtualPath): boolean;
    equals(other: VirtualPath): boolean;
    toString(): string;
    toJSON(): string;
    private static assertMountId;
    /** Та же проверка сегмента, что на сервере (SECURITY.md). */
    static assertSegment(segment: string, raw?: string): void;
}
/** Ошибка разбора пути; `rule` совпадает с `details.rule` серверной ошибки `path_invalid`. */
export declare class PathError extends Error {
    readonly rule: string;
    readonly raw: string;
    constructor(rule: string, raw: string);
}
//# sourceMappingURL=VirtualPath.d.ts.map