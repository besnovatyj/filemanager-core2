import type { Node } from '../node/Node.d.ts';
/** Физические возможности хранилища (контракт §6, `MountCapabilities`). */
export interface MountCapabilities {
    list: boolean;
    stat: boolean;
    content: boolean;
    download: boolean;
    mkdir: boolean;
    rename: boolean;
    move: boolean;
    copy: boolean;
    delete: boolean;
    upload: boolean;
    publicUrl: boolean;
    visibility: boolean;
    thumbnail: boolean;
    search: boolean;
    directories: 'native' | 'emulated';
}
/** Описание хранилища из `describe.mounts[]`. */
export interface MountInfo {
    id: string;
    label: string;
    icon?: string;
    root: string;
    readOnly: boolean;
    capabilities: MountCapabilities;
}
/** Операция контракта, на которую спрашиваем разрешение. */
export type OperationName = 'describe' | 'list' | 'tree' | 'stat' | 'content' | 'download' | 'preview' | 'thumbnail' | 'search' | 'archive' | 'extract' | 'mkdir' | 'rename' | 'move' | 'copy' | 'delete' | 'upload';
/**
 * Сводные возможности: «может ли ТЕКУЩИЙ пользователь выполнить операцию над ЭТИМ узлом».
 * Слияние трёх уровней (ADR, контракт §6):
 *  1. операции, разрешённые пользователю (`describe.operations`) — иначе кнопки нет вообще;
 *  2. capabilities и readOnly хранилища узла;
 *  3. `perms` самого узла (если сервер их прислал).
 *
 * UI спрашивает только этот класс; сервер перепроверяет всё сам.
 */
export declare class Capabilities {
    private readonly allowedOperations;
    private readonly mounts;
    constructor(allowedOperations: ReadonlySet<OperationName>, mounts: readonly MountInfo[]);
    static empty(): Capabilities;
    /** Разрешена ли операция пользователю вообще (без привязки к узлу). */
    allows(operation: OperationName): boolean;
    mount(id: string | null): MountInfo | undefined;
    allMounts(): MountInfo[];
    /** Может ли пользователь выполнить операцию над узлом (или внутри узла-папки для mkdir/upload/paste). */
    can(operation: OperationName, node: Node): boolean;
    /** Можно ли положить что-то (paste/upload/mkdir/drop) в эту папку. */
    canWriteInto(dir: Node, via?: 'move' | 'copy' | 'upload' | 'mkdir'): boolean;
    /** Все узлы поддерживают операцию (для пакетных команд над выделением). */
    canAll(operation: OperationName, nodes: readonly Node[]): boolean;
    private mountSupports;
}
//# sourceMappingURL=Capabilities.d.ts.map