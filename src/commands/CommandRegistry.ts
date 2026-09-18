/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {normalizeShortcut} from '@/shared/dom/keys';
import {ApiError} from '@/api/codec/ApiError';
import type {Command} from './Command';
import type {CommandContext} from './CommandContext';

/**
 * Реестр команд. Выполнение всегда идёт через {@link execute}: проверка `canExecute`,
 * единая обработка ошибок (диалог ошибки, кроме отмены), защита от исключений в UI.
 */
export class CommandRegistry {
  private readonly commands = new Map<string, Command>();
  private readonly byShortcut = new Map<string, Command>();

  constructor(private readonly ctx: CommandContext) {}

  register(command: Command): void {
    if (this.commands.has(command.id)) {
      throw new Error(`[commands] команда '${command.id}' уже зарегистрирована`);
    }
    this.commands.set(command.id, command);
    for (const shortcut of command.shortcuts ?? []) {
      const key = normalizeShortcut(shortcut);
      if (this.byShortcut.has(key)) {
        console.warn(`[commands] сочетание ${key} уже занято командой '${this.byShortcut.get(key)?.id}', '${command.id}' его не получит`);
        continue;
      }
      this.byShortcut.set(key, command);
    }
  }

  registerAll(commands: Iterable<Command>): void {
    for (const c of commands) this.register(c);
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  all(): Command[] {
    return [...this.commands.values()];
  }

  /** Команды группы, отсортированные по order, без скрытых. */
  group(name: string): Command[] {
    return this.all()
      .filter((c) => c.group === name && !c.isHidden?.(this.ctx))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  forShortcut(combo: string): Command | undefined {
    return this.byShortcut.get(combo);
  }

  canExecute(id: string): boolean {
    const command = this.commands.get(id);
    return command !== undefined && command.canExecute(this.ctx);
  }

  /** Выполняет команду, если она доступна. Ошибки показывает пользователю (кроме отмены). */
  async execute(id: string, arg?: unknown): Promise<boolean> {
    const command = this.commands.get(id);
    if (!command) {
      console.warn(`[commands] неизвестная команда '${id}'`);
      return false;
    }
    if (!command.canExecute(this.ctx)) return false;
    try {
      await command.execute(this.ctx, arg);
      return true;
    } catch (error) {
      const apiError = ApiError.wrap(error);
      if (!apiError.isAborted) {
        console.error(`[commands] '${id}' завершилась ошибкой`, error);
        await this.ctx.dialogs.error(apiError);
      }
      return false;
    }
  }

  get context(): CommandContext {
    return this.ctx;
  }
}
