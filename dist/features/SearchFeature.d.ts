import type { CommandRegistry } from '../commands/CommandRegistry.d.ts';
import type { CommandContext } from '../commands/CommandContext.d.ts';
import type { Feature } from './Feature';
/**
 * Поиск по именам (контракт §9.15): `run(query)` ищет от текущей папки рекурсивно, результаты
 * живут в `SearchStore`, панель содержимого показывает их вместо папки.
 *
 * Из виртуального корня `/` поиск идёт по всем хранилищам параллельно (сервер тоже умеет искать
 * из корня, но параллельные запросы по хранилищам быстрее и дают частичный результат, если одно
 * из хранилищ медленное или недоступно). Навигация в другую папку закрывает поиск; факты операций
 * (удаление, переименование, загрузка) правят список результатов без повторного запроса.
 */
export declare class SearchFeature implements Feature {
    private readonly disposables;
    private ctx;
    private inflight;
    init(ctx: CommandContext, commands: CommandRegistry): void;
    dispose(): void;
    /** Можно ли искать из текущей папки (операция разрешена и хранилище её поддерживает). */
    available(): boolean;
    /**
     * Запустить поиск. Доступность здесь не «гасится» молча: если операции нет в describe или ни
     * одно хранилище её не поддерживает — пользователь видит диалог, а не пустую реакцию на Enter.
     * Отказ конкретного хранилища (`unsupported`) приходит от сервера и показывается в панели.
     */
    run(query: string): Promise<void>;
    clear(): void;
    /** Из виртуального корня — по каждому хранилищу с поддержкой поиска; иначе одна папка. */
    private roots;
}
//# sourceMappingURL=SearchFeature.d.ts.map