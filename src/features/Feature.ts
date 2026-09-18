/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';

/**
 * Фича — сценарий использования, связывающий сторы, клиент, очередь и диалоги, и регистрирующий
 * свои команды. Фичи не знают о разметке: UI вызывает команды или публичные методы фич
 * (например, `UploadFeature.uploadFiles()` при drop из ОС).
 */
export interface Feature {
  /** Регистрирует команды и подписки. */
  init(ctx: CommandContext, commands: CommandRegistry): void;
  dispose(): void;
}
