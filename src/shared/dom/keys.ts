/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Нормализация клавиатурных сочетаний в строку вида `Ctrl+Shift+A`, `F2`, `Delete`, `Alt+ArrowLeft`.
 * Модификаторы в фиксированном порядке (Ctrl, Alt, Shift, Meta), буквы — в верхнем регистре,
 * чтобы сочетание из конфига команды и сочетание из события сравнивались строкой.
 */

const MODIFIERS = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;

/** Каноническая форма сочетания из строки конфига (`ctrl+a` → `Ctrl+A`). */
export function normalizeShortcut(shortcut: string): string {
  const parts = shortcut.split('+').map((p) => p.trim()).filter(Boolean);
  const mods = new Set<string>();
  let key = '';
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'control') mods.add('Ctrl');
    else if (lower === 'alt' || lower === 'option') mods.add('Alt');
    else if (lower === 'shift') mods.add('Shift');
    else if (lower === 'meta' || lower === 'cmd' || lower === 'command') mods.add('Meta');
    else key = normalizeKey(part);
  }
  return [...MODIFIERS.filter((m) => mods.has(m)), key].filter(Boolean).join('+');
}

/** Каноническая форма сочетания из события клавиатуры. */
export function shortcutFromEvent(event: KeyboardEvent): string {
  const mods: string[] = [];
  if (event.ctrlKey) mods.push('Ctrl');
  if (event.altKey) mods.push('Alt');
  if (event.shiftKey) mods.push('Shift');
  if (event.metaKey) mods.push('Meta');
  return [...mods, normalizeKey(event.key)].join('+');
}

function normalizeKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key === 'Esc') return 'Escape';
  if (key === 'Del') return 'Delete';
  return key.length === 1 ? key.toUpperCase() : key;
}

/** Идёт ли событие из поля ввода (там горячие клавиши списка не действуют). */
export function isEditableTarget(event: Event): boolean {
  const path = event.composedPath();
  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue;
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) {
      return true;
    }
    if (node.isContentEditable) {
      return true;
    }
  }
  return false;
}
