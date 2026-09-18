/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {t} from '@/shared/i18n/i18n';
import {formatBytes} from '@/shared/format/bytes';
import type {Node} from '@/domain/node/Node';
import type {ConflictChoice, ConflictStrategy} from '@/domain/conflict/ConflictResolution';
import {ApiError} from '@/api/codec/ApiError';
import type {CommandRegistry} from '@/commands/CommandRegistry';
import type {CommandContext} from '@/commands/CommandContext';
import type {Feature} from './Feature';

/** Файл вместе с относительным путём папок (при перетаскивании каталога из ОС). */
export interface UploadEntry {
  file: File;
  /** Подпапки относительно целевой директории, например ['photos', '2026']. */
  dirs: string[];
}

/**
 * Загрузка файлов: кнопка (диалог выбора), drop из ОС (включая папки через
 * `webkitGetAsEntry`), прогресс по каждой задаче, конфликты через диалог с «применить ко всем».
 *
 * Каждый файл — отдельная задача полосы `upload` (параллельность ограничена очередью), поэтому
 * прогресс и отмена индивидуальны, а один упавший файл не рушит остальные.
 */
export class UploadFeature implements Feature {
  private ctx!: CommandContext;
  private input: HTMLInputElement | null = null;

  init(ctx: CommandContext, commands: CommandRegistry): void {
    this.ctx = ctx;
    commands.register({
      id: 'upload', group: 'file', order: 30, icon: 'upload', shortcuts: ['Ctrl+U'],
      label: () => t('cmd.upload'),
      canExecute: (c) => {
        const dir = c.currentDir();
        return dir !== null && c.capabilities().canWriteInto(dir, 'upload');
      },
      execute: () => this.pickFiles(),
    });
  }

  /** Открыть системный диалог выбора файлов. */
  private pickFiles(): void {
    if (!this.input) {
      this.input = document.createElement('input');
      this.input.type = 'file';
      this.input.multiple = true;
      this.input.hidden = true;
      document.body.appendChild(this.input);
      this.input.addEventListener('change', () => {
        const files = [...(this.input?.files ?? [])];
        if (this.input) this.input.value = '';
        void this.uploadFiles(files.map((file) => ({file, dirs: []})), this.ctx.currentPath());
      });
    }
    this.input.click();
  }

  /**
   * Загрузить набор файлов в папку. Для файлов с `dirs` сначала создаются подпапки
   * (одна `mkdir`-задача на уникальный путь; уже существующие — пропускаются).
   */
  async uploadFiles(entries: UploadEntry[], targetDir: string): Promise<void> {
    if (entries.length === 0) return;
    const rules = this.ctx.session.uploadRules.peek();
    const tooLarge = rules.maxFileSize !== null ? entries.filter((e) => e.file.size > (rules.maxFileSize as number)) : [];
    if (tooLarge.length > 0) {
      const first = tooLarge[0] as UploadEntry;
      await this.ctx.dialogs.error(t('error.upload.tooLarge', {name: first.file.name, limit: formatBytes(rules.maxFileSize)}));
      entries = entries.filter((e) => !tooLarge.includes(e));
      if (entries.length === 0) return;
    }

    // 1. Папки создаём заранее и последовательно (одна mkdir-задача на уникальную цепочку) —
    //    чтобы параллельные загрузки не пытались создать одну и ту же папку дважды.
    const dirCache = new Map<string, string>(); // относительный путь папок → виртуальный путь
    const chains = [...new Map(entries.filter((e) => e.dirs.length > 0).map((e): [string, string[]] => [e.dirs.join('/'), e.dirs])).values()]
      .sort((a, b) => a.length - b.length);
    for (const dirs of chains) {
      if ((await this.ensureDirs(targetDir, dirs, dirCache)) === null) {
        const failed = dirs.join('/');
        entries = entries.filter((e) => !e.dirs.join('/').startsWith(failed));
      }
    }

    let remembered: ConflictChoice['strategy'] | null = null;
    let remaining = entries.length;

    // 2. Файлы — параллельно (лимит параллельности задаёт очередь); диалоги конфликтов
    //    показываются по одному (DialogStore — стек), выбор «ко всем» запоминается.
    const uploadOne = async (entry: UploadEntry): Promise<void> => {
      const dir = entry.dirs.length === 0 ? targetDir : dirCache.get(entry.dirs.join('/'));
      if (dir === undefined) {
        remaining--;
        return;
      }
      let strategy: ConflictStrategy = 'fail';
      // Стратегия доставки байтов: первая подходящая (tus для больших файлов, иначе multipart).
      const describe = this.ctx.session.describe.peek();
      const uploader = this.ctx.uploadStrategies.find((s) => s.canHandle(entry.file, describe)) ?? this.ctx.uploadStrategies[this.ctx.uploadStrategies.length - 1];
      if (!uploader) return;
      // Повторяем при конфликте с выбранной пользователем стратегией.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await this.ctx.queue.run({
            kind: 'upload', lane: 'upload', label: t('queue.task.upload', {name: entry.file.name}), paths: [dir],
            execute: (task) => uploader.upload(
              {path: dir, file: entry.file, onConflict: strategy},
              {signal: task.signal, onProgress: (f) => task.progress(f)},
            ),
          });
          this.ctx.dirs.applyAdded(result.node);
          if (dir === this.ctx.currentPath()) this.ctx.selection.setSelected([result.node.path], true);
          break;
        } catch (error) {
          const apiError = ApiError.wrap(error);
          if (apiError.isConflict && attempt === 0) {
            let chosen = remembered;
            if (chosen === null) {
              const choice = await this.ctx.dialogs.conflict({name: entry.file.name, remaining});
              if (choice === null) break;
              chosen = choice.strategy;
              if (choice.applyToAll) remembered = chosen;
            }
            if (chosen === 'skip') break;
            strategy = chosen;
            continue;
          }
          if (!apiError.isAborted) {
            await this.ctx.dialogs.error(apiError, entry.file.name);
          }
          break;
        }
      }
      remaining--;
    };

    await Promise.all(entries.map(uploadOne));
  }

  /** Разобрать DataTransfer (drop из ОС) в записи с относительными папками. */
  async entriesFromDataTransfer(dt: DataTransfer): Promise<UploadEntry[]> {
    const result: UploadEntry[] = [];
    const items = [...dt.items].filter((i) => i.kind === 'file');
    const fsEntries = items.map((i) => (i as DataTransferItem & {webkitGetAsEntry?: () => FileSystemEntry | null}).webkitGetAsEntry?.() ?? null);
    if (fsEntries.some((e) => e !== null)) {
      for (const entry of fsEntries) {
        if (entry) await this.walkEntry(entry, [], result);
      }
      return result;
    }
    return [...dt.files].map((file) => ({file, dirs: []}));
  }

  private async walkEntry(entry: FileSystemEntry, dirs: string[], out: UploadEntry[]): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      out.push({file, dirs});
      return;
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const children: FileSystemEntry[] = [];
      // readEntries отдаёт порциями — читаем, пока не вернёт пустой массив.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (batch.length === 0) break;
        children.push(...batch);
      }
      for (const child of children) await this.walkEntry(child, [...dirs, entry.name], out);
    }
  }

  /** Создать цепочку подпапок; вернуть путь конечной либо null при неисправимой ошибке. */
  private async ensureDirs(base: string, dirs: string[], cache: Map<string, string>): Promise<string | null> {
    let current = base;
    let rel = '';
    for (const name of dirs) {
      rel = rel ? `${rel}/${name}` : name;
      const cached = cache.get(rel);
      if (cached) {
        current = cached;
        continue;
      }
      const existing = this.ctx.dirs.directory(current).peek().items.find((n) => n.name === name && n.kind !== 'file');
      if (existing) {
        current = existing.path;
        cache.set(rel, current);
        continue;
      }
      try {
        const node: Node = await this.ctx.queue.run({
          kind: 'mkdir', lane: 'mutation', label: t('queue.task.mkdir', {name}), paths: [current],
          execute: (task) => this.ctx.client.mkdir({parent: current, name}, {signal: task.signal}),
        });
        this.ctx.dirs.applyAdded(node);
        current = node.path;
      } catch (error) {
        const apiError = ApiError.wrap(error);
        if (apiError.isConflict) {
          // Папка появилась параллельно — используем её.
          current = `${current === '/' ? '' : current}/${name}`;
        } else {
          if (!apiError.isAborted) await this.ctx.dialogs.error(apiError, name);
          return null;
        }
      }
      cache.set(rel, current);
    }
    return current;
  }

  dispose(): void {
    this.input?.remove();
    this.input = null;
  }
}
