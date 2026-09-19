import { type ExplorerConfig } from './ExplorerConfig';
import { Explorer } from './Explorer';
/**
 * Composition root (ADR-13): единственное место, где создаются и связываются все части
 * приложения. Никакого контейнера с токенами — явная типизированная сборка читается как
 * оглавление архитектуры и проверяется компилятором.
 *
 * Порядок: клиент → сторы → контекст команд → реестр команд + фичи → UI-зависимости →
 * объект {@link Explorer}, которым управляет хост.
 */
export declare function createExplorer(config: ExplorerConfig): Explorer;
//# sourceMappingURL=createExplorer.d.ts.map