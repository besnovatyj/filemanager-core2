/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import {DisposableStore} from '@/shared/lib/Disposable';
import type {Node} from '@/domain/node/Node';
import {ApiError} from '@/api/codec/ApiError';
import type {SearchResponse} from '@/api/contract/operations';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {Feature} from './Feature';

/**
 * Поиск по именам (контракт §9.15): `run(query)` ищет от текущей папки рекурсивно, результаты
 * живут в `SearchStore`, панель содержимого показывает их вместо папки.
 *
 * Из виртуального корня `/` поиск идёт по всем хранилищам параллельно (сервер тоже умеет искать
 * из корня, но параллельные запросы по хранилищам быстрее и дают частичный результат, если одно
 * из хранилищ медленное или недоступно). Навигация в другую папку закрывает поиск; факты операций
 * (удаление, переименование, загрузка) правят список результатов без повторного запроса.
 */
export class SearchFeature implements Feature {
  private readonly disposables = new DisposableStore();
  private ctx!: CommandContext;
  private inflight: AbortController | null = null;

  init(ctx: CommandContext, commands: CommandRegistry): void {
    this.ctx = ctx;
    commands.registerAll([
      {
        id: 'search', group: 'hidden', shortcuts: ['Ctrl+F'],
        label: () => t('cmd.search'),
        canExecute: (c) => c.capabilities().allows('search'),
        execute: (c) => c.search.requestFocus(),
      },
      {
        id: 'search.rerun', group: 'hidden',
        label: () => '',
        canExecute: (c) => c.search.active.value,
        execute: (c) => this.run(c.search.query.peek()),
      },
      {
        id: 'search.clear', group: 'hidden',
        label: () => t('cmd.search.clear'),
        canExecute: (c) => c.search.active.value,
        execute: () => this.clear(),
      },
    ]);

    // Ушли в другую папку — поиск закрыт (как в проводнике). Первый запуск эффекта пропускаем.
    this.disposables.add(ctx.nav.current.subscribe(() => this.clear()));
    // Факты операций → правка результатов на месте.
    this.disposables.add(ctx.dirs.changes.on('removed', (path) => ctx.search.applyRemoved(path)));
    this.disposables.add(ctx.dirs.changes.on('added', (node) => ctx.search.applyAdded(node)));
    this.disposables.add(ctx.dirs.changes.on('updated', (node) => ctx.search.applyUpdated(node)));
  }

  dispose(): void {
    this.inflight?.abort();
    this.disposables.dispose();
  }

  /** Можно ли искать из текущей папки (операция разрешена и хранилище её поддерживает). */
  available(): boolean {
    const caps = this.ctx.capabilities();
    if (!caps.allows('search')) return false;
    const dir = this.ctx.currentDir();
    return dir ? caps.can('search', dir) : this.ctx.currentPath() === '/';
  }

  /**
   * Запустить поиск. Доступность здесь не «гасится» молча: если операции нет в describe или ни
   * одно хранилище её не поддерживает — пользователь видит диалог, а не пустую реакцию на Enter.
   * Отказ конкретного хранилища (`unsupported`) приходит от сервера и показывается в панели.
   */
  async run(query: string): Promise<void> {
    const trimmed = query.trim();
    if (trimmed === '') {
      this.clear();
      return;
    }
    if (!this.ctx.capabilities().allows('search')) {
      await this.ctx.dialogs.error(t('search.unavailable'), t('cmd.search'));
      return;
    }
    const targets = this.roots(this.ctx.currentPath());
    if (targets.length === 0) {
      await this.ctx.dialogs.error(t('search.unavailable'), t('cmd.search'));
      return;
    }
    this.inflight?.abort();
    const controller = new AbortController();
    this.inflight = controller;
    const root = this.ctx.currentPath();
    this.ctx.search.begin(trimmed, root);
    this.ctx.selection.clear();

    try {
      const responses = await Promise.all(targets.map((path) => this.ctx.client.search({path, query: trimmed, recursive: true}, {signal: controller.signal})));
      if (controller.signal.aborted) return;
      const items: Node[] = responses.flatMap((r) => r.items);
      this.ctx.search.complete(items, responses.some((r: SearchResponse) => r.truncated));
    } catch (error) {
      if (controller.signal.aborted) return;
      this.ctx.search.fail(error instanceof ApiError ? error : new ApiError('internal', String(error)));
    } finally {
      if (this.inflight === controller) this.inflight = null;
    }
  }

  clear(): void {
    this.inflight?.abort();
    this.inflight = null;
    this.ctx.search.clear();
  }

  /** Из виртуального корня — по каждому хранилищу с поддержкой поиска; иначе одна папка. */
  private roots(root: string): string[] {
    if (root !== '/') return [root];
    const caps = this.ctx.capabilities();
    return caps.allMounts().filter((m) => m.capabilities.search && m.capabilities.list).map((m) => `/${m.id}`);
  }
}
