/**
 * Сопоставление имени с поисковым запросом — зеркало серверного `fs/operation/NameMatcher.php`:
 * подстрока без учёта регистра либо маска `*`/`?`, если в запросе есть метасимволы.
 *
 * Нужно клиенту, чтобы после операций (переименование, загрузка) поправить список результатов
 * поиска по фактам, не гоняя обход на сервере заново, и клиенту в памяти для демо.
 */
export interface NameMatcher {
    readonly isGlob: boolean;
    matches(name: string): boolean;
}
export declare function createNameMatcher(query: string): NameMatcher;
//# sourceMappingURL=nameMatcher.d.ts.map