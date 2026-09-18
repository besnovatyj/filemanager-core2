/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {effect} from '@/shared/reactive/signal';
import {DisposableStore} from '@/shared/lib/Disposable';
import {t} from '@/shared/i18n/i18n';
import {isContainer, type Node} from '@/domain/node/Node';
import {ApiError} from '@/api/codec/ApiError';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {Feature} from './Feature';

/**
 * Навигация: переход в папку, назад/вперёд/вверх, обновление, открытие узла.
 *
 * Слушает `nav.current` и загружает содержимое через DirectoryStore; при недоступной папке
 * (удалена, нет прав) откатывается к ближайшему живому предку — окно никогда не «зависает» на
 * несуществующем пути.
 */
export class NavigationFeature implements Feature {
  private readonly disposables = new DisposableStore();
  private ctx!: CommandContext;
  private commands!: CommandRegistry;
  private abort: AbortController | null = null;

  init(ctx: CommandContext, commands: CommandRegistry): void {
    this.ctx = ctx;
    this.commands = commands;

    commands.registerAll([
      {
        id: 'back', group: 'navigation', order: 10, icon: 'arrow-left', shortcuts: ['Alt+ArrowLeft'],
        label: () => t('cmd.back'),
        canExecute: (c) => c.nav.canGoBack.value,
        execute: (c) => c.nav.back(),
      },
      {
        id: 'forward', group: 'navigation', order: 20, icon: 'arrow-right', shortcuts: ['Alt+ArrowRight'],
        label: () => t('cmd.forward'),
        canExecute: (c) => c.nav.canGoForward.value,
        execute: (c) => c.nav.forward(),
      },
      {
        id: 'up', group: 'navigation', order: 30, icon: 'arrow-up', shortcuts: ['Backspace', 'Alt+ArrowUp'],
        label: () => t('cmd.up'),
        canExecute: (c) => c.nav.canGoUp.value,
        execute: (c) => c.nav.up(),
      },
      {
        id: 'refresh', group: 'navigation', order: 40, icon: 'refresh', shortcuts: ['F5', 'Ctrl+R'],
        label: () => t('cmd.refresh'),
        canExecute: () => true,
        // При активном поиске F5 повторяет и его (результаты могли измениться на сервере).
        execute: async (c) => {
          await this.reload(c.currentPath(), true);
          if (c.search.active.peek()) await commands.execute('search.rerun');
        },
      },
      {
        id: 'open', group: 'file', order: 10, icon: 'open', shortcuts: ['Enter'],
        label: () => t('cmd.open'),
        canExecute: (c) => c.selectedNodes().length === 1,
        execute: (c) => this.open(c.selectedNodes()[0] as Node),
      },
      {
        id: 'navigate', group: 'hidden',
        label: () => '',
        canExecute: () => true,
        execute: (c, arg) => {
          if (typeof arg === 'string') c.nav.navigate(arg);
        },
      },
    ]);

    // Смена текущего пути → загрузка. Предыдущая загрузка отменяется.
    this.disposables.add(effect(() => {
      const path = ctx.nav.current.value;
      void this.reload(path, false);
    }));
  }

  /** Открыть узел: папку — перейти; файл — в picker выбрать, в manager — скачать/открыть. */
  async open(node: Node): Promise<void> {
    if (isContainer(node)) {
      this.ctx.nav.navigate(node.path);
      return;
    }
    if (this.ctx.config.mode === 'picker') {
      await this.commands.execute('pick');
      return;
    }
    await this.commands.execute('download');
  }

  private async reload(path: string, force: boolean): Promise<void> {
    this.abort?.abort();
    const controller = new AbortController();
    this.abort = controller;
    try {
      await this.ctx.dirs.load(path, {force, signal: controller.signal});
      this.ctx.selection.clear();
    } catch (error) {
      const apiError = ApiError.wrap(error);
      if (apiError.isAborted) return;
      if (apiError.code === 'not_found' || apiError.code === 'mount_unknown' || apiError.code === 'path_invalid') {
        // Папки нет — поднимаемся к живому предку (если это не корень).
        if (path !== '/') {
          this.ctx.dirs.invalidate(path);
          this.ctx.nav.escapeFrom(path);
          return;
        }
      }
      // Остальные ошибки показывает панель содержимого (состояние error в DirectoryStore).
    }
  }

  dispose(): void {
    this.abort?.abort();
    this.disposables.dispose();
  }
}
