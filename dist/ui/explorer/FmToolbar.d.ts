import { type ExplorerDeps } from './deps';
/**
 * Панель инструментов: кнопки команд (состояние — из `canExecute`), меню «Вид», в режиме picker —
 * кнопка «Выбрать». Кнопки не содержат логики: только `commands.execute(id)`.
 */
export declare class FmToolbar extends HTMLElement {
    private deps;
    private readonly disposables;
    bind(deps: ExplorerDeps): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
//# sourceMappingURL=FmToolbar.d.ts.map