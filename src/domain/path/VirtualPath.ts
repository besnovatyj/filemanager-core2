/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Виртуальный путь — адрес узла в единой ФС файлового менеджера (контракт §4):
 * `/` — корень (список хранилищ), `/{mount}` — корень хранилища, `/{mount}/a/b.txt` — узел.
 *
 * Зеркало серверного `Besnovatyj\File\fs\path\VirtualPath`, но с одним отличием по роли:
 * сервер только ОТКЛОНЯЕТ неканонические пути, а клиент ещё и НОРМАЛИЗУЕТ ввод пользователя
 * (адресная строка: лишние слеши, пробелы по краям) — см. {@link VirtualPath.normalize}.
 *
 * Неизменяемый value object; сравнивать через {@link equals} или по {@link toString}.
 */
export class VirtualPath {
  static readonly MOUNT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

  private constructor(
    /** Идентификатор хранилища; null — только у корня `/`. */
    readonly mount: string | null,
    /** Сегменты внутри хранилища (без его id). */
    readonly segments: readonly string[],
  ) {
    Object.freeze(this);
  }

  static root(): VirtualPath {
    return new VirtualPath(null, []);
  }

  static mountRoot(mountId: string): VirtualPath {
    VirtualPath.assertMountId(mountId);
    return new VirtualPath(mountId, []);
  }

  /**
   * Строгий разбор канонического пути (как на сервере). Бросает {@link PathError}.
   */
  static parse(raw: string): VirtualPath {
    if (raw === '/') {
      return VirtualPath.root();
    }
    if (!raw.startsWith('/')) {
      throw new PathError('absolute', raw);
    }
    if (raw.endsWith('/')) {
      throw new PathError('trailing_slash', raw);
    }
    const parts = raw.slice(1).split('/');
    const mountId = parts.shift() ?? '';
    VirtualPath.assertMountId(mountId, raw);
    for (const segment of parts) {
      VirtualPath.assertSegment(segment, raw);
    }
    return new VirtualPath(mountId, parts);
  }

  /**
   * Мягкий разбор пользовательского ввода: обрезает пробелы, схлопывает слеши, убирает
   * завершающий слеш, принимает `\` как разделитель (привычка Windows). Сегменты при этом
   * проверяются так же строго — `..` не пройдёт. Возвращает null, если путь невалиден.
   */
  static normalize(input: string): VirtualPath | null {
    const trimmed = input.trim().replace(/\\/g, '/').replace(/\/+/g, '/');
    if (trimmed === '' || trimmed === '/') {
      return VirtualPath.root();
    }
    const canonical = (trimmed.startsWith('/') ? trimmed : '/' + trimmed).replace(/\/$/, '');
    try {
      return VirtualPath.parse(canonical);
    } catch {
      return null;
    }
  }

  /** Быстрая проверка без создания объекта. */
  static isValid(raw: string): boolean {
    try {
      VirtualPath.parse(raw);
      return true;
    } catch {
      return false;
    }
  }

  get isRoot(): boolean {
    return this.mount === null;
  }

  get isMountRoot(): boolean {
    return this.mount !== null && this.segments.length === 0;
  }

  /** Последний сегмент; для корня хранилища — его id; для `/` — ''. */
  get name(): string {
    if (this.mount === null) return '';
    return this.segments.length === 0 ? this.mount : (this.segments[this.segments.length - 1] as string);
  }

  /** `/` → 0, `/m` → 1, `/m/a` → 2. */
  get depth(): number {
    return this.mount === null ? 0 : 1 + this.segments.length;
  }

  /** Родитель; null у `/`. Родитель корня хранилища — `/`. */
  parent(): VirtualPath | null {
    if (this.mount === null) return null;
    if (this.segments.length === 0) return VirtualPath.root();
    return new VirtualPath(this.mount, this.segments.slice(0, -1));
  }

  /** Все предки от корня до родителя включительно (для хлебных крошек). */
  ancestors(): VirtualPath[] {
    const result: VirtualPath[] = [];
    let current = this.parent();
    while (current) {
      result.unshift(current);
      current = current.parent();
    }
    return result;
  }

  /** Дочерний путь; у корня дочерний элемент — хранилище. */
  child(name: string): VirtualPath {
    if (this.mount === null) {
      return VirtualPath.mountRoot(name);
    }
    VirtualPath.assertSegment(name, `${this.toString()}/${name}`);
    return new VirtualPath(this.mount, [...this.segments, name]);
  }

  /** Строгий предок (сам себе — нет). */
  isAncestorOf(other: VirtualPath): boolean {
    if (this.mount === null) return other.mount !== null;
    if (this.mount !== other.mount || this.segments.length >= other.segments.length) return false;
    return this.segments.every((s, i) => other.segments[i] === s);
  }

  equals(other: VirtualPath): boolean {
    return this.mount === other.mount
      && this.segments.length === other.segments.length
      && this.segments.every((s, i) => other.segments[i] === s);
  }

  toString(): string {
    if (this.mount === null) return '/';
    return `/${this.mount}${this.segments.length ? '/' + this.segments.join('/') : ''}`;
  }

  toJSON(): string {
    return this.toString();
  }

  private static assertMountId(mountId: string, raw?: string): void {
    if (!VirtualPath.MOUNT_ID_PATTERN.test(mountId)) {
      throw new PathError('mount_id', raw ?? mountId);
    }
  }

  /** Та же проверка сегмента, что на сервере (SECURITY.md). */
  static assertSegment(segment: string, raw?: string): void {
    if (segment === '') throw new PathError('empty_segment', raw ?? segment);
    if (segment === '.' || segment === '..') throw new PathError('dot_segment', raw ?? segment);
    if (segment.includes('/') || segment.includes('\\')) throw new PathError('separator', raw ?? segment);
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x1F\x7F]/.test(segment)) throw new PathError('control_chars', raw ?? segment);
    if (new TextEncoder().encode(segment).length > 255) throw new PathError('max_segment_length', raw ?? segment);
  }
}

/** Ошибка разбора пути; `rule` совпадает с `details.rule` серверной ошибки `path_invalid`. */
export class PathError extends Error {
  constructor(readonly rule: string, readonly raw: string) {
    super(`Некорректный путь (${rule}): ${raw}`);
    this.name = 'PathError';
  }
}
