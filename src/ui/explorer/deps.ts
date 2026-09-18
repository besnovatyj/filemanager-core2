/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {CommandContext} from '@/commands/CommandContext';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {NavigationFeature, RenameFeature, UploadFeature, TransferFeature, DeleteFeature, SearchFeature, ArchiveFeature} from '@/features';
import type {FmMenu, MenuEntry} from '@/ui/primitives/FmMenu';
import type {DndAdapter} from '@/ui/ports/DndAdapter';
import type {Virtualizer} from '@/ui/ports/Virtualizer';

/**
 * Зависимости UI-компонентов проводника. Web Components создаются без аргументов, поэтому
 * получают этот объект через `bind(deps)` сразу после создания (до вставки в DOM).
 */
export interface ExplorerDeps {
  readonly ctx: CommandContext;
  readonly commands: CommandRegistry;
  readonly features: {
    readonly navigation: NavigationFeature;
    readonly rename: RenameFeature;
    readonly upload: UploadFeature;
    readonly transfer: TransferFeature;
    readonly delete: DeleteFeature;
    readonly search: SearchFeature;
    readonly archive: ArchiveFeature;
  };
  /** Общее всплывающее меню приложения. */
  readonly menu: FmMenu;
  /** Адаптер перетаскивания (порт). */
  readonly dnd: DndAdapter;
  /** Фабрика виртуализации списка (порт; экземпляр на панель). */
  createVirtualizer(): Virtualizer;
  /** Открыть меню из команд по списку id ('|' — разделитель). */
  openMenu(ids: readonly string[], at: {x: number; y: number}, extra?: MenuEntry[]): void;
}

/** Пункты меню по id команд; '|' — разделитель; скрытые и отсутствующие команды пропускаются. */
export function entriesFromIds(commands: CommandRegistry, ids: readonly string[]): MenuEntry[] {
  const ctx = commands.context;
  const entries: MenuEntry[] = [];
  for (const id of ids) {
    if (id === '|') {
      if (entries.length > 0 && entries[entries.length - 1]?.type !== 'separator') entries.push({type: 'separator'});
      continue;
    }
    const command = commands.get(id);
    if (!command || command.isHidden?.(ctx)) continue;
    const entry: MenuEntry = {
      type: 'item',
      id,
      label: command.label(ctx),
      disabled: !command.canExecute(ctx),
      danger: id === 'delete',
      onSelect: () => void commands.execute(id),
    };
    if (command.icon) entry.icon = command.icon;
    if (command.shortcuts?.[0]) entry.shortcut = command.shortcuts[0];
    if (command.isChecked) entry.checked = command.isChecked(ctx);
    entries.push(entry);
  }
  while (entries.length > 0 && entries[entries.length - 1]?.type === 'separator') entries.pop();
  return entries;
}

/** Контекстное меню элемента (файла/папки). */
export const ITEM_MENU: readonly string[] = ['open', 'pick', '|', 'cut', 'copy', 'paste', '|', 'rename', 'delete', 'download', '|', 'archive', 'extract', '|', 'properties'];
/** Контекстное меню пустого места текущей папки. */
export const FOLDER_MENU: readonly string[] = ['new-folder', 'upload', 'paste', '|', 'refresh', 'select-all', '|', 'properties'];
/** Меню «Вид». */
export const VIEW_MENU: readonly string[] = ['view.details', 'view.list', 'view.tiles', 'view.icons', '|', 'sort.name', 'sort.size', 'sort.mtime', 'sort.ext', '|', 'toggle-nav-pane', 'toggle-preview', 'toggle-queue'];
