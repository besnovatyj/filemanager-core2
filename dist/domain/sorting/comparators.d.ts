import { type Node } from '../node/Node.d.ts';
export type SortKey = 'name' | 'size' | 'mtime' | 'ext' | 'kind';
export type SortDirection = 'asc' | 'desc';
export interface SortSpec {
    readonly by: SortKey;
    readonly dir: SortDirection;
}
export declare const DEFAULT_SORT: SortSpec;
/**
 * Компаратор списка: папки всегда над файлами (в любом направлении), внутри групп — по ключу,
 * при равенстве — по имени. Совпадает с серверным {@see Lister::comparator()}, чтобы порядок
 * не «прыгал» между серверной и клиентской сортировкой.
 */
export declare function nodeComparator(spec: SortSpec): (a: Node, b: Node) => number;
export declare function sortNodes(nodes: readonly Node[], spec: SortSpec): Node[];
export declare function toggleSort(current: SortSpec, key: SortKey): SortSpec;
//# sourceMappingURL=comparators.d.ts.map