/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {Node} from '@/domain/node/Node';
import type {FsClient} from '@/api/client/FsClient';
import type {Dictionary} from '@/shared/i18n/i18n';
import type {DndAdapter} from '@/ui/ports/DndAdapter';
import type {Virtualizer} from '@/ui/ports/Virtualizer';
import type {UploadStrategy} from '@/api/upload/UploadStrategy';
import type {ExplorerMode, ExplorerSettings} from '@/model/ExplorerSettings';

export type {ExplorerMode, ExplorerSettings};

/**
 * Конфигурация проводника — единственное, что хост передаёт в {@link createExplorer}.
 * Всё необязательное имеет дефолт; обязателен либо `connector`, либо готовый `client`.
 */
export interface ExplorerConfig {
  /** Базовый URL API bescms-fs (например '/File/backend/api'). Игнорируется, если задан `client`. */
  connector?: string;
  /** Заголовки хоста для запросов (CSRF и т. п.). */
  headers?: Record<string, string>;
  /** Готовый клиент (например, MemoryFsClient в демо/тестах). */
  client?: FsClient;

  /** Виртуальный путь при открытии; невалидный/недоступный → корень (области). */
  startPath?: string;
  /**
   * Область видимости: менеджер работает только внутри `root` (редактор конкретной сущности).
   * `token` — подписанный сервером токен области; отправляется заголовком `X-Fs-Scope` и в
   * query `download`, сервер отклоняет пути вне области. Без токена ограничение только в UI
   * (демо, доверенные клиенты).
   */
  scope?: {root: string; token?: string};
  mode?: ExplorerMode;
  /** picker: разрешить выбор нескольких файлов. */
  pickMultiple?: boolean;
  /** picker: какие файлы можно выбрать (например, только изображения). Папки не выбираются. */
  pickFilter?: (node: Node) => boolean;
  /** picker: пользователь подтвердил выбор. */
  onPick?: (nodes: Node[]) => void;
  /** Окно закрыто (любым способом). */
  onClose?: () => void;

  /** Заголовок окна. */
  title?: string;
  /** Ключ localStorage для настроек вида; null — не сохранять. По умолчанию 'fm2:view'. */
  storageKey?: string | null;
  /** Словарь локализации поверх встроенного русского. */
  dictionary?: Dictionary;
  /** Локаль для форматирования чисел/дат. */
  locale?: string;
  /** Параллельных загрузок. */
  uploadConcurrency?: number;
  /** Таймаут JSON-запросов, мс. */
  timeoutMs?: number;
  /**
   * Замена встроенных реализаций портов (ARCHITECTURE.md §2): перетаскивание, виртуализация,
   * стратегии загрузки. Не задано — HTML5 DnD, сетка одинаковых ячеек, tus + multipart.
   */
  adapters?: {
    dnd?: DndAdapter;
    virtualizer?: () => Virtualizer;
    uploadStrategies?: (client: FsClient) => UploadStrategy[];
  };
}

export function resolveConfig(config: ExplorerConfig): ExplorerSettings {
  const rootPath = config.scope?.root ?? '/';
  const start = config.startPath ?? rootPath;
  return {
    startPath: start === rootPath || start.startsWith(rootPath === '/' ? '/' : rootPath + '/') ? start : rootPath,
    rootPath,
    mode: config.mode ?? 'manager',
    pickMultiple: config.pickMultiple ?? false,
    pickFilter: config.pickFilter ?? null,
    onPick: config.onPick ?? null,
    onClose: config.onClose ?? null,
    title: config.title ?? '',
    storageKey: config.storageKey === undefined ? 'fm2:view' : config.storageKey,
    locale: config.locale ?? 'ru-RU',
    uploadConcurrency: config.uploadConcurrency ?? 3,
  };
}
