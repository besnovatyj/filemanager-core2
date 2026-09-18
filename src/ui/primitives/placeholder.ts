/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {h} from '@/shared/dom/html';
import {t} from '@/shared/i18n/i18n';

/**
 * Плейсхолдер «идёт загрузка» для пустого окна/контейнера до появления содержимого: спиннер и
 * подпись по центру. Правило проекта: ни один процесс не должен быть невидимым — на медленной
 * сети пустое окно неотличимо от зависшего.
 */
let keyframesInstalled = false;

/** Плейсхолдер живёт в light DOM хоста, где наших shadow-стилей нет — ставим keyframes один раз. */
function ensureKeyframes(): void {
  if (keyframesInstalled || typeof document === 'undefined') return;
  keyframesInstalled = true;
  const style = document.createElement('style');
  style.textContent = '@keyframes fm-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

export function loadingPlaceholder(text = t('app.connecting')): HTMLElement {
  ensureKeyframes();
  return h('div', {
    class: 'fm-placeholder',
    role: 'status',
    attrs: {'aria-live': 'polite'},
    style: {display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', flex: '1', minHeight: '160px', color: 'var(--fm-fg-muted, #6b7280)', font: 'var(--fm-font-size, 13px) / 1.4 var(--fm-font, system-ui, sans-serif)'},
  }, h('span', {class: 'fm-spinner', style: {width: '24px', height: '24px', border: '3px solid var(--fm-border, #d9dde3)', borderTopColor: 'var(--fm-accent, #0067c0)', borderRadius: '50%', animation: 'fm-spin 0.8s linear infinite'}}), h('span', {text}));
}
