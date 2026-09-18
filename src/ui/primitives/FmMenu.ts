/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {css, adoptStyles} from '@/shared/dom/css';
import {h} from '@/shared/dom/html';
import {listen, DisposableStore} from '@/shared/lib/Disposable';
import {icon} from '@/ui/icons';
import {base, tokens} from '@/ui/theme/tokens';
import type {CommandRegistry} from '@/commands/CommandRegistry';

export type MenuEntry =
  | {type: 'separator'}
  | {type: 'item'; id: string; label: string; icon?: string; shortcut?: string; disabled?: boolean; checked?: boolean; danger?: boolean; onSelect: () => void};

const styles = css`
  :host {
    position: fixed; z-index: 2147483000; display: block;
    min-width: 200px; max-width: 320px; max-height: min(70vh, 480px); overflow: auto;
    background: var(--fm-bg); color: var(--fm-fg);
    border: 1px solid var(--fm-border); border-radius: var(--fm-radius-lg);
    box-shadow: var(--fm-shadow); padding: 4px;
    font: var(--fm-font-size) / var(--fm-line) var(--fm-font);
  }
  .item {
    display: grid; grid-template-columns: 20px 1fr auto; align-items: center; gap: 8px;
    padding: 6px 10px; border-radius: var(--fm-radius); cursor: default; user-select: none; outline: none;
  }
  .item:hover, .item.is-focused { background: var(--fm-bg-hover); }
  .item[aria-disabled="true"] { color: var(--fm-fg-disabled); }
  .item[aria-disabled="true"]:hover { background: transparent; }
  .item.is-danger:not([aria-disabled="true"]) { color: var(--fm-danger); }
  .shortcut { color: var(--fm-fg-muted); font-size: 0.92em; margin-left: 16px; }
  .separator { height: 1px; margin: 4px 8px; background: var(--fm-border); }
  .check { visibility: hidden; }
  .item[aria-checked="true"] .check { visibility: visible; }
`;

/**
 * Всплывающее меню (контекстное и выпадающее): позиционируется в пределах окна, закрывается по
 * клику вне/Escape/потере фокуса, навигация стрелками, Enter/Space — выбор. Один экземпляр на
 * приложение; каждое открытие — новый список пунктов.
 */
export class FmMenu extends HTMLElement {
  /** Подписки текущего открытия; после dispose() копилка одноразова, поэтому на каждое открытие — новая. */
  private disposables = new DisposableStore();
  private entries: MenuEntry[] = [];
  private focused = -1;
  private onCloseCallback: (() => void) | null = null;

  connectedCallback(): void {
    if (!this.shadowRoot) {
      const root = this.attachShadow({mode: 'open'});
      adoptStyles(root, tokens, base, styles);
      this.setAttribute('role', 'menu');
      this.tabIndex = -1;
    }
  }

  /** Открыть меню в точке (clientX/Y). */
  open(entries: MenuEntry[], at: {x: number; y: number}, onClose?: () => void): void {
    this.close();
    this.disposables = new DisposableStore();
    this.entries = entries;
    this.onCloseCallback = onClose ?? null;
    this.render();
    this.hidden = false;
    this.style.left = '0px';
    this.style.top = '0px';
    // Сначала измеряем, затем позиционируем так, чтобы не выйти за край окна.
    requestAnimationFrame(() => {
      const rect = this.getBoundingClientRect();
      const x = Math.min(at.x, window.innerWidth - rect.width - 4);
      const y = Math.min(at.y, window.innerHeight - rect.height - 4);
      this.style.left = `${Math.max(4, x)}px`;
      this.style.top = `${Math.max(4, y)}px`;
      this.focus();
    });

    this.disposables.add(listen(document, 'pointerdown', (e) => {
      if (!e.composedPath().includes(this)) this.close();
    }, {capture: true}));
    this.disposables.add(listen(window, 'blur', () => this.close()));
    this.disposables.add(listen(window, 'resize', () => this.close()));
    this.disposables.add(listen(this, 'keydown', (e) => this.onKeyDown(e)));
    this.disposables.add(listen(document, 'keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      }
    }, {capture: true}));
  }

  close(): void {
    if (this.hidden) return;
    this.hidden = true;
    this.disposables.dispose();
    this.shadowRoot?.replaceChildren();
    const cb = this.onCloseCallback;
    this.onCloseCallback = null;
    cb?.();
  }

  get isOpen(): boolean {
    return !this.hidden;
  }

  private render(): void {
    const root = this.shadowRoot as ShadowRoot;
    root.replaceChildren();
    this.focused = -1;
    this.entries.forEach((entry, index) => {
      if (entry.type === 'separator') {
        root.appendChild(h('div', {class: 'separator', role: 'separator'}));
        return;
      }
      const item = h('div', {
        class: `item${entry.danger ? ' is-danger' : ''}`,
        role: entry.checked !== undefined ? 'menuitemcheckbox' : 'menuitem',
        attrs: {'aria-disabled': entry.disabled ? 'true' : 'false', 'aria-checked': entry.checked === undefined ? null : String(entry.checked), 'data-index': index},
      },
      entry.checked !== undefined ? icon('check', 'fm-icon check') : (entry.icon ? icon(entry.icon) : h('span')),
      h('span', {class: 'fm-truncate', text: entry.label}),
      entry.shortcut ? h('span', {class: 'shortcut', text: entry.shortcut}) : h('span'),
      );
      item.addEventListener('click', () => this.select(index));
      item.addEventListener('pointerenter', () => this.setFocused(index));
      root.appendChild(item);
    });
  }

  private select(index: number): void {
    const entry = this.entries[index];
    if (!entry || entry.type !== 'item' || entry.disabled) return;
    this.close();
    entry.onSelect();
  }

  private setFocused(index: number): void {
    this.focused = index;
    this.shadowRoot?.querySelectorAll('.item').forEach((el) => {
      el.classList.toggle('is-focused', Number((el as HTMLElement).dataset.index) === index);
    });
  }

  private onKeyDown(e: KeyboardEvent): void {
    const selectable = this.entries.map((en, i) => (en.type === 'item' && !en.disabled ? i : -1)).filter((i) => i >= 0);
    if (selectable.length === 0) return;
    const pos = selectable.indexOf(this.focused);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.setFocused(selectable[(pos + 1) % selectable.length] as number);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.setFocused(selectable[(pos - 1 + selectable.length) % selectable.length] as number);
    } else if (e.key === 'Home') {
      e.preventDefault();
      this.setFocused(selectable[0] as number);
    } else if (e.key === 'End') {
      e.preventDefault();
      this.setFocused(selectable[selectable.length - 1] as number);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.focused >= 0) this.select(this.focused);
    }
  }
}

if (!customElements.get('fm-menu')) {
  customElements.define('fm-menu', FmMenu);
}

/** Пункты меню из команд реестра (в порядке групп; между группами — разделители). */
export function menuFromCommands(commands: CommandRegistry, groups: string[]): MenuEntry[] {
  const ctx = commands.context;
  const entries: MenuEntry[] = [];
  for (const group of groups) {
    const items = commands.group(group);
    if (items.length === 0) continue;
    if (entries.length > 0) entries.push({type: 'separator'});
    for (const command of items) {
      const entry: MenuEntry = {
        type: 'item',
        id: command.id,
        label: command.label(ctx),
        disabled: !command.canExecute(ctx),
        danger: command.id === 'delete',
        onSelect: () => void commands.execute(command.id),
      };
      if (command.icon) entry.icon = command.icon;
      if (command.shortcuts?.[0]) entry.shortcut = command.shortcuts[0];
      if (command.isChecked) entry.checked = command.isChecked(ctx);
      entries.push(entry);
    }
  }
  return entries;
}
