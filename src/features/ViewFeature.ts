/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import type {SortKey} from '@/domain/sorting/comparators';
import {toggleSort} from '@/domain/sorting/comparators';
import type {ViewMode} from '@/model/ViewStore';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {Feature} from './Feature';

const MODES: {id: ViewMode; icon: string; order: number}[] = [
  {id: 'details', icon: 'view-details', order: 10},
  {id: 'list', icon: 'view-list', order: 20},
  {id: 'tiles', icon: 'view-tiles', order: 30},
  {id: 'icons', icon: 'view-icons', order: 40},
];

const SORT_KEYS: SortKey[] = ['name', 'size', 'mtime', 'ext'];

/** Команды представления: режим, сортировка, панели. */
export class ViewFeature implements Feature {
  init(_ctx: CommandContext, commands: CommandRegistry): void {
    for (const mode of MODES) {
      commands.register({
        id: `view.${mode.id}`, group: 'view', order: mode.order, icon: mode.icon,
        label: () => t(`cmd.view.${mode.id}`),
        canExecute: () => true,
        isChecked: (c) => c.view.mode.value === mode.id,
        execute: (c) => c.view.mode.set(mode.id),
      });
    }
    for (const [i, key] of SORT_KEYS.entries()) {
      commands.register({
        id: `sort.${key}`, group: 'sort', order: i * 10,
        label: () => t(`cmd.sort.${key}`),
        canExecute: () => true,
        isChecked: (c) => c.view.sort.value.by === key,
        execute: (c) => c.view.sort.update((s) => toggleSort(s, key)),
      });
    }
    commands.registerAll([
      {
        id: 'view.cycle', group: 'hidden', shortcuts: ['Ctrl+Shift+V'],
        label: () => '',
        canExecute: () => true,
        execute: (c) => {
          const idx = MODES.findIndex((m) => m.id === c.view.mode.peek());
          c.view.mode.set((MODES[(idx + 1) % MODES.length] as {id: ViewMode}).id);
        },
      },
      {
        id: 'toggle-nav-pane', group: 'panels', order: 10, icon: 'sidebar',
        label: () => t('cmd.toggleNavPane'),
        canExecute: () => true,
        isChecked: (c) => (c.viewport.narrow.value ? c.view.navDrawerOpen.value : c.view.navPaneVisible.value),
        execute: (c) => (c.viewport.narrow.peek() ? c.view.navDrawerOpen.update((v) => !v) : c.view.navPaneVisible.update((v) => !v)),
      },
      {
        id: 'toggle-preview', group: 'panels', order: 15, icon: 'panel-right',
        label: () => t('cmd.togglePreview'),
        canExecute: () => true,
        isChecked: (c) => c.view.previewVisible.value,
        execute: (c) => c.view.previewVisible.update((v) => !v),
      },
      {
        id: 'toggle-queue', group: 'panels', order: 20, icon: 'tasks',
        label: () => t('cmd.toggleQueue'),
        canExecute: () => true,
        isChecked: (c) => c.view.queuePaneVisible.value,
        execute: (c) => c.view.queuePaneVisible.update((v) => !v),
      },
    ]);
  }

  dispose(): void {
    // подписок нет
  }
}
