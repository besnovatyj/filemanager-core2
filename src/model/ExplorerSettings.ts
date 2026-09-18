/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {Node} from '@/domain/node/Node';

/** Режим работы: полноценный менеджер или выбор файлов для хоста (редактор, поле формы). */
export type ExplorerMode = 'manager' | 'picker';

/**
 * Настройки приложения после нормализации конфигурации хоста (`ExplorerConfig`): все поля
 * заполнены, дефолты применены. Живёт в слое model, чтобы команды и фичи не зависели от `app`.
 */
export interface ExplorerSettings {
  readonly startPath: string;
  /**
   * Корень области видимости ('/' — без ограничений). Навигация, дерево и адресная строка не
   * поднимаются выше него; сервер дополнительно проверяет область по токену (см. ExplorerConfig.scope).
   */
  readonly rootPath: string;
  readonly mode: ExplorerMode;
  readonly pickMultiple: boolean;
  readonly pickFilter: ((node: Node) => boolean) | null;
  readonly onPick: ((nodes: Node[]) => void) | null;
  readonly onClose: (() => void) | null;
  readonly title: string;
  readonly storageKey: string | null;
  readonly locale: string;
  readonly uploadConcurrency: number;
}
