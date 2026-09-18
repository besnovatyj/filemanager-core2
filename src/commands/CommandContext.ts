/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {Node} from '@/domain/node/Node';
import type {Capabilities} from '@/domain/capabilities/Capabilities';
import type {OperationQueue} from '@/domain/operations/OperationQueue';
import type {FsClient} from '@/api/client/FsClient';
import type {SessionStore, NavigationStore, DirectoryStore, SelectionStore, ClipboardStore, ViewStore, DialogStore, ViewportStore, ActivityStore, SearchStore} from '@/model';
import type {UploadStrategy} from '@/api/upload/UploadStrategy';
import type {ExplorerSettings} from '@/model/ExplorerSettings';

/**
 * Всё, что доступно командам и фичам. Один объект на приложение; команды читают из него
 * состояние через сигналы (поэтому `canExecute`, вызванный внутри `computed`, автоматически
 * пересчитывается при изменении выделения/папки/буфера).
 */
export interface CommandContext {
  readonly config: ExplorerSettings;
  readonly client: FsClient;
  readonly session: SessionStore;
  readonly nav: NavigationStore;
  readonly dirs: DirectoryStore;
  readonly selection: SelectionStore;
  readonly clipboard: ClipboardStore;
  readonly view: ViewStore;
  readonly queue: OperationQueue;
  readonly dialogs: DialogStore;
  readonly viewport: ViewportStore;
  /** Запросы к серверу в полёте (индикатор в строке состояния). */
  readonly activity: ActivityStore;
  /** Результаты поиска по именам (показываются вместо папки, пока активны). */
  readonly search: SearchStore;
  /** Стратегии загрузки в порядке приоритета (первая подходящая выигрывает). */
  readonly uploadStrategies: readonly UploadStrategy[];

  /** Текущий путь (реактивно). */
  currentPath(): string;
  /** Узел текущей папки, если листинг загружен (реактивно). */
  currentDir(): Node | null;
  /** Выделенные узлы (реактивно). */
  selectedNodes(): readonly Node[];
  /** Сводные возможности (реактивно). */
  capabilities(): Capabilities;
}
