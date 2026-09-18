/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Минимальная реактивность: сигналы, вычисляемые значения, эффекты.
 *
 * Зачем своя: приложению нужна точечная перерисовка («изменилось выделение одной строки —
 * перерисуй одну строку»), а тащить фреймворк ради этого не хочется (ADR-1). Реализация
 * умышленно маленькая и «скучная»: push-уведомления, ленивые computed, батчинг эффектов.
 * Интерфейс совместим по духу с `@preact/signals-core` — при желании заменяется на него.
 *
 * Модель:
 *  - {@link signal} — ячейка с значением; при записи уведомляет подписчиков;
 *  - {@link computed} — производное значение; пересчитывается лениво при чтении, если источники изменились;
 *  - {@link effect} — побочный эффект; выполняется сразу и при каждом изменении прочитанных им сигналов;
 *  - {@link batch} — группирует записи: эффекты выполняются один раз в конце.
 *
 * Отслеживание зависимостей автоматическое: всё, что прочитано через `.value` внутри
 * computed/effect, становится зависимостью. `peek()`/{@link untracked} читают без подписки.
 */

/** Внутренний узел-потребитель (computed или effect), который источник должен уведомлять. */
interface Consumer {
  notify(): void;
}

/** Внутренний узел-источник (signal или computed), на который можно подписаться. */
interface Source {
  readonly subscribers: Set<Consumer>;
}

let activeConsumer: (Consumer & {track(source: Source): void}) | null = null;
let batchDepth = 0;
const pendingEffects = new Set<EffectNode>();

function flushEffects(): void {
  if (batchDepth > 0 || pendingEffects.size === 0) {
    return;
  }
  // Копируем: эффект в процессе выполнения может запланировать другие эффекты.
  const effects = [...pendingEffects];
  pendingEffects.clear();
  for (const e of effects) {
    e.run();
  }
  // Каскад: если выполнение породило новые ожидающие эффекты — прогоняем их тоже.
  if (pendingEffects.size > 0) {
    flushEffects();
  }
}

/** Значение, которое можно только читать и на которое можно подписаться. */
export interface ReadonlySignal<T> {
  /** Текущее значение; чтение внутри computed/effect создаёт зависимость. */
  readonly value: T;
  /** Чтение без создания зависимости. */
  peek(): T;
  /** Подписка на изменения; возвращает функцию отписки. Вызывается сразу с текущим значением. */
  subscribe(listener: (value: T) => void): () => void;
}

/** Изменяемый сигнал. */
export interface Signal<T> extends ReadonlySignal<T> {
  value: T;
  set(value: T): void;
  /** Обновление через функцию от предыдущего значения. */
  update(updater: (previous: T) => T): void;
}

class SignalNode<T> implements Source, Signal<T> {
  readonly subscribers = new Set<Consumer>();

  constructor(private current: T, private readonly equals: (a: T, b: T) => boolean) {}

  get value(): T {
    activeConsumer?.track(this);
    return this.current;
  }

  set value(next: T) {
    this.set(next);
  }

  peek(): T {
    return this.current;
  }

  set(next: T): void {
    if (this.equals(this.current, next)) {
      return;
    }
    this.current = next;
    batchDepth++;
    try {
      for (const consumer of [...this.subscribers]) {
        consumer.notify();
      }
    } finally {
      batchDepth--;
    }
    flushEffects();
  }

  update(updater: (previous: T) => T): void {
    this.set(updater(this.current));
  }

  subscribe(listener: (value: T) => void): () => void {
    return effect(() => listener(this.value));
  }
}

class ComputedNode<T> implements Source, Consumer, ReadonlySignal<T> {
  readonly subscribers = new Set<Consumer>();
  private readonly sources = new Set<Source>();
  private cached!: T;
  private dirty = true;
  private computing = false;

  constructor(private readonly compute: () => T, private readonly equals: (a: T, b: T) => boolean) {}

  get value(): T {
    activeConsumer?.track(this);
    return this.read();
  }

  peek(): T {
    return this.read();
  }

  subscribe(listener: (value: T) => void): () => void {
    return effect(() => listener(this.value));
  }

  /** Источник изменился: помечаем себя грязным и уведомляем своих подписчиков (транзитивно). */
  notify(): void {
    if (this.dirty) {
      return;
    }
    this.dirty = true;
    for (const consumer of [...this.subscribers]) {
      consumer.notify();
    }
  }

  track(source: Source): void {
    this.sources.add(source);
    source.subscribers.add(this);
  }

  private read(): T {
    if (!this.dirty) {
      return this.cached;
    }
    if (this.computing) {
      throw new Error('[signal] циклическая зависимость в computed');
    }
    this.computing = true;
    // Отписываемся от старых источников: набор зависимостей может меняться от запуска к запуску.
    for (const source of this.sources) {
      source.subscribers.delete(this);
    }
    this.sources.clear();

    const previous = activeConsumer;
    activeConsumer = this;
    try {
      const next = this.compute();
      // Первое вычисление (cached ещё не задан) всегда принимается.
      if (!this.hasValue || !this.equals(this.cached, next)) {
        this.cached = next;
        this.hasValue = true;
      }
    } finally {
      activeConsumer = previous;
      this.computing = false;
      this.dirty = false;
    }
    return this.cached;
  }

  private hasValue = false;
}

class EffectNode implements Consumer {
  private readonly sources = new Set<Source>();
  private cleanup: (() => void) | void = undefined;
  private disposed = false;

  constructor(private readonly fn: () => void | (() => void)) {}

  notify(): void {
    if (!this.disposed) {
      pendingEffects.add(this);
    }
  }

  track(source: Source): void {
    this.sources.add(source);
    source.subscribers.add(this);
  }

  run(): void {
    if (this.disposed) {
      return;
    }
    this.cleanup?.();
    this.cleanup = undefined;
    for (const source of this.sources) {
      source.subscribers.delete(this);
    }
    this.sources.clear();

    const previous = activeConsumer;
    activeConsumer = this;
    try {
      this.cleanup = this.fn();
    } finally {
      activeConsumer = previous;
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    pendingEffects.delete(this);
    this.cleanup?.();
    this.cleanup = undefined;
    for (const source of this.sources) {
      source.subscribers.delete(this);
    }
    this.sources.clear();
  }
}

const strictEquals = <T>(a: T, b: T): boolean => Object.is(a, b);

/** Создаёт изменяемый сигнал. `equals` — сравнение для подавления лишних уведомлений. */
export function signal<T>(initial: T, equals: (a: T, b: T) => boolean = strictEquals): Signal<T> {
  return new SignalNode(initial, equals);
}

/** Создаёт вычисляемое значение: пересчитывается лениво, только если изменились источники. */
export function computed<T>(compute: () => T, equals: (a: T, b: T) => boolean = strictEquals): ReadonlySignal<T> {
  return new ComputedNode(compute, equals);
}

/**
 * Создаёт эффект: выполняется немедленно и при каждом изменении прочитанных сигналов.
 * Функция может вернуть cleanup, который вызовется перед следующим запуском и при dispose.
 *
 * @returns функция остановки эффекта
 */
export function effect(fn: () => void | (() => void)): () => void {
  const node = new EffectNode(fn);
  node.run();
  return () => node.dispose();
}

/** Группирует несколько записей: эффекты выполнятся один раз после завершения. */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    flushEffects();
  }
}

/** Выполняет функцию без отслеживания зависимостей. */
export function untracked<T>(fn: () => T): T {
  const previous = activeConsumer;
  activeConsumer = null;
  try {
    return fn();
  } finally {
    activeConsumer = previous;
  }
}
