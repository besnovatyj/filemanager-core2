/**
 * Узел виртуальной ФС — единая модель файла, папки и хранилища (контракт §5, ADR-3).
 *
 * Это одновременно доменная модель и wire-формат: сервер отдаёт ровно эту структуру, клиент
 * хранит её как есть (никаких «Entity с сеттерами» — данные неизменяемы, а логика — в функциях
 * рядом). Новые поля контракта добавляются опциональными.
 */
export type NodeKind = 'file' | 'dir' | 'mount';
export interface NodePermissions {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
    rename?: boolean;
}
export interface NodeMeta {
    /** Подпись для UI (у хранилищ и корня). */
    label?: string;
    /** Подсказка иконки: 'drive' | 'archive' | 'cloud' | … */
    icon?: string;
    /** Хранилище только для чтения (у узлов kind=mount). */
    readOnly?: boolean;
    /** Есть ли дочерние папки: true/false — известно, null — не подсчитано. */
    hasChildren?: boolean | null;
    /** Размеры изображения (после stat). */
    image?: {
        width: number;
        height: number;
    };
    [key: string]: unknown;
}
export interface Node {
    /** Канонический виртуальный путь — идентификатор узла. */
    readonly path: string;
    readonly name: string;
    readonly kind: NodeKind;
    readonly mount: string | null;
    readonly size: number | null;
    readonly mtime: number | null;
    readonly mime: string | null;
    readonly ext: string | null;
    readonly url: string | null;
    readonly visibility: 'public' | 'private' | null;
    readonly perms?: NodePermissions;
    readonly meta?: NodeMeta;
}
export declare function isContainer(node: Node): boolean;
export declare function isFile(node: Node): boolean;
/** Изображение, которое браузер отобразит (по MIME или расширению). */
export declare function isImage(node: Node): boolean;
/** Текстовый файл — кандидат на предпросмотр содержимого. */
export declare function isText(node: Node): boolean;
/** Человекочитаемая подпись узла (label хранилища либо имя). */
export declare function displayName(node: Node): string;
/** Копия узла с новым путём (после rename/move — для оптимистичных обновлений кэша). */
export declare function withPath(node: Node, path: string): Node;
/** Родительский путь строки-пути (без создания VirtualPath). `/` → null. */
export declare function parentPathOf(path: string): string | null;
//# sourceMappingURL=Node.d.ts.map