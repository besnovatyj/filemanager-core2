/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {OperationQueue} from '@/domain/operations/OperationQueue';
import type {CommandContext} from '@/commands/CommandContext';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {Keymap} from '@/commands/Keymap';
import type {ViewStore, DialogStore} from '@/model';
import type {FmMenu} from '@/ui/primitives/FmMenu';
import type {DialogHost} from '@/ui/explorer/dialogs/DialogHost';
import type {FmWindow} from '@/ui/explorer/FmWindow';
import type {FmExplorer} from '@/widgets/FmExplorer';
import {loadingPlaceholder} from '@/ui/primitives/placeholder';

interface ExplorerInternals {
  element: FmExplorer;
  ctx: CommandContext;
  commands: CommandRegistry;
  view: ViewStore;
  dialogs: DialogStore;
  queue: OperationQueue;
  menu: FmMenu;
  dialogHost: DialogHost;
  keymap: Keymap;
  start(): Promise<void>;
  createWindow(): FmWindow;
  onClose(): void;
  dispose(): void;
}

/**
 * Публичный объект проводника, который получает хост из {@link createExplorer}.
 *
 * Жизненный цикл: `open()` (плавающее окно) или `mount(container)` (встроенный) → работа →
 * `close()`/`destroy()`. Повторное открытие после `destroy()` невозможно — создайте новый.
 */
export class Explorer {
  private window: FmWindow | null = null;
  private started = false;
  private destroyed = false;

  constructor(private readonly internals: ExplorerInternals) {}

  /** Корневой элемент `<fm-explorer>` (для стилизации через CSS custom properties, data-theme). */
  get element(): HTMLElement {
    return this.internals.element;
  }

  get commands(): CommandRegistry {
    return this.internals.commands;
  }

  get context(): CommandContext {
    return this.internals.ctx;
  }

  /** Открыть в плавающем модальном окне. */
  async open(): Promise<void> {
    this.assertAlive();
    if (this.window) return;
    const win = this.internals.createWindow();
    win.onClose = () => this.close();
    document.body.appendChild(win);
    win.setSize(this.internals.view.windowSize.peek());
    this.window = win;
    // Сначала describe и регистрация команд фичами, потом вставка в DOM: панели (тулбар, меню)
    // строят кнопки из реестра команд в connectedCallback и должны видеть его заполненным.
    // Пока идёт describe, в окне — плейсхолдер: пустое окно неотличимо от зависшего.
    const placeholder = loadingPlaceholder();
    win.appendChild(placeholder);
    try {
      await this.start();
    } finally {
      placeholder.remove();
    }
    if (this.destroyed) return;
    win.appendChild(this.internals.element);
    this.focus();
  }

  /** Встроить в контейнер страницы (без окна). */
  async mount(container: HTMLElement): Promise<void> {
    this.assertAlive();
    this.internals.element.setAttribute('embedded', '');
    const placeholder = loadingPlaceholder();
    container.appendChild(placeholder);
    try {
      await this.start();
    } finally {
      placeholder.remove();
    }
    if (this.destroyed) return;
    container.appendChild(this.internals.element);
  }

  /** Перейти в папку. */
  navigate(path: string): void {
    this.internals.ctx.nav.navigate(path);
  }

  focus(): void {
    this.internals.element.contentPane?.focusList();
  }

  /** Закрыть окно и освободить ресурсы. Вызывает `onClose` конфигурации. */
  close(): void {
    if (this.destroyed) return;
    this.internals.onClose();
    this.destroy();
  }

  /** Освободить всё без вызова `onClose` (например, при удалении редактора со страницы). */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.internals.queue.cancelAll();
    this.internals.dialogs.closeAll();
    this.internals.dialogHost.detach();
    this.internals.keymap.detach();
    this.internals.menu.close();
    this.internals.menu.remove();
    this.internals.dispose();
    this.internals.view.dispose();
    this.internals.element.remove();
    this.window?.remove();
    this.window = null;
  }

  private async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    try {
      await this.internals.start();
    } catch (error) {
      // Ошибка describe: показываем диалог и закрываем — работать без описания бэкенда нельзя.
      this.internals.dialogHost.attach();
      await this.internals.dialogs.error(error instanceof Error ? error : String(error));
      this.close();
      throw error;
    }
  }

  private assertAlive(): void {
    if (this.destroyed) throw new Error('[filemanager] проводник уже уничтожен; создайте новый через createExplorer()');
  }
}
