/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {h, type Props} from '@/shared/dom/html';
import {effect} from '@/shared/reactive/signal';
import type {DisposeFn} from '@/shared/lib/Disposable';
import {icon} from '@/ui/icons';
import type {CommandRegistry} from '@/commands/CommandRegistry';

export interface ButtonOptions {
  icon?: string;
  label?: string;
  title?: string;
  variant?: 'ghost' | 'primary' | 'danger' | 'outline';
  iconOnly?: boolean;
  onClick?: (event: MouseEvent) => void;
}

/** Кнопка в стиле проводника (классы из `base`-стилей темы). */
export function button(options: ButtonOptions): HTMLButtonElement {
  const classes = ['fm-btn'];
  if (options.variant && options.variant !== 'ghost') classes.push(`fm-btn--${options.variant}`);
  if (options.iconOnly || (options.icon && !options.label)) classes.push('fm-btn--icon');
  const props: Props = {class: classes.join(' '), type: 'button'};
  if (options.title !== undefined) props.title = options.title;
  if (options.onClick) props.on = {click: options.onClick};
  const el = h('button', props);
  if (options.icon) el.appendChild(icon(options.icon));
  if (options.label && !options.iconOnly) el.appendChild(h('span', {text: options.label}));
  if (options.iconOnly && options.label) el.setAttribute('aria-label', options.label);
  return el;
}

/**
 * Кнопка, привязанная к команде: подпись/иконка из команды, `disabled` и `aria-pressed`
 * обновляются реактивно через `canExecute`/`isChecked`. Возвращает элемент и функцию отписки.
 */
export function commandButton(
  commands: CommandRegistry,
  commandId: string,
  options: {iconOnly?: boolean; label?: string; icon?: string; variant?: ButtonOptions['variant']} = {},
): {el: HTMLButtonElement; dispose: DisposeFn} {
  const command = commands.get(commandId);
  if (!command) throw new Error(`[ui] команда '${commandId}' не найдена`);
  const ctx = commands.context;
  const label = options.label ?? command.label(ctx);
  const shortcut = command.shortcuts?.[0];
  const btnOptions: ButtonOptions = {
    label,
    iconOnly: options.iconOnly ?? true,
    title: shortcut ? `${label} (${shortcut})` : label,
    onClick: () => void commands.execute(commandId),
  };
  const iconName = options.icon ?? command.icon;
  if (iconName) btnOptions.icon = iconName;
  if (options.variant) btnOptions.variant = options.variant;
  const el = button(btnOptions);
  const dispose = effect(() => {
    el.disabled = !command.canExecute(ctx);
    if (command.isChecked) el.setAttribute('aria-pressed', String(command.isChecked(ctx)));
    el.hidden = command.isHidden?.(ctx) ?? false;
  });
  return {el, dispose};
}
