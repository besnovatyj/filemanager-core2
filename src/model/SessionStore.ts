/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {computed, signal, type ReadonlySignal} from '@/shared/reactive/signal';
import {Capabilities, type OperationName} from '@/domain/capabilities/Capabilities';
import {DEFAULT_NAME_RULES, type NameRules} from '@/domain/naming/NameRules';
import {NameValidator} from '@/domain/naming/NameValidator';
import type {DescribeResponse, Limits, UploadRules} from '@/api/contract/describe';
import type {FsClient} from '@/api/client/FsClient';
import {ApiError} from '@/api/codec/ApiError';

export type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

const DEFAULT_UPLOAD: UploadRules = {maxFileSize: null, maxFilesPerRequest: 1, allowedExtensions: null, allowedMime: null, chunked: false};
const DEFAULT_LIMITS: Limits = {listPageSize: 2000, maxBatchItems: 500, contentMaxBytes: 1_048_576};

/**
 * Сессия с бэкендом: результат `describe` и всё, что из него выводится (capabilities, правила
 * имён, лимиты). Загружается один раз при открытии; повторный `load()` — при ошибке или по
 * явному запросу (например, после смены прав).
 */
export class SessionStore {
  readonly status = signal<SessionStatus>('idle');
  readonly error = signal<ApiError | null>(null);
  readonly describe = signal<DescribeResponse | null>(null);

  readonly capabilities: ReadonlySignal<Capabilities> = computed(() => {
    const d = this.describe.value;
    if (!d) return Capabilities.empty();
    return new Capabilities(new Set(Object.keys(d.operations) as OperationName[]), d.mounts);
  });

  readonly nameRules: ReadonlySignal<NameRules> = computed(() => ({...DEFAULT_NAME_RULES, ...(this.describe.value?.naming ?? {})}));
  readonly nameValidator: ReadonlySignal<NameValidator> = computed(() => new NameValidator(this.nameRules.value));
  readonly uploadRules: ReadonlySignal<UploadRules> = computed(() => ({...DEFAULT_UPLOAD, ...(this.describe.value?.upload ?? {})}));
  readonly limits: ReadonlySignal<Limits> = computed(() => ({...DEFAULT_LIMITS, ...(this.describe.value?.limits ?? {})}));
  readonly defaultMount: ReadonlySignal<string | null> = computed(() => this.describe.value?.defaultMount ?? null);
  /** Допустимые размеры серверных миниатюр (по возрастанию); пусто — миниатюр нет. */
  readonly thumbnailSizes: ReadonlySignal<readonly number[]> = computed(() => [...(this.describe.value?.thumbnails?.sizes ?? [])].sort((a, b) => a - b));

  constructor(private readonly client: FsClient) {}

  async load(): Promise<void> {
    this.status.set('loading');
    this.error.set(null);
    try {
      this.describe.set(await this.client.describe());
      this.status.set('ready');
    } catch (error) {
      this.error.set(ApiError.wrap(error));
      this.status.set('error');
      throw error;
    }
  }

  get isReady(): boolean {
    return this.status.peek() === 'ready';
  }
}
