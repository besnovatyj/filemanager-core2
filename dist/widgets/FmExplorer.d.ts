import { FmContentPane } from '../ui/explorer/FmContentPane.d.ts';
import type { ExplorerDeps } from '../ui/explorer/deps.d.ts';
/**
 * Композиция проводника: тулбар, адресная строка, панель навигации | содержимое, панель операций,
 * строка состояния. Все части получают общие зависимости через `bind(deps)`.
 *
 * Корневой элемент несёт дизайн-токены (тема) и является целью горячих клавиш.
 */
export declare class FmExplorer extends HTMLElement {
    private deps;
    private readonly disposables;
    contentPane: FmContentPane;
    bind(deps: ExplorerDeps): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
//# sourceMappingURL=FmExplorer.d.ts.map