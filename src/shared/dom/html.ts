/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

/**
 * Безопасное создание DOM без innerHTML с данными.
 *
 * Правило проекта (SECURITY.md §3): любые пользовательские строки (имена файлов, пути, сообщения
 * сервера) попадают в DOM только через `textContent`/атрибуты. `innerHTML` допустим лишь для
 * статических шаблонов без данных. Хелпер `h()` делает безопасный путь самым коротким.
 */

type Child = Node | string | null | undefined | false;

export interface Props {
  class?: string;
  id?: string;
  text?: string;
  title?: string;
  role?: string;
  tabindex?: number;
  hidden?: boolean;
  disabled?: boolean;
  type?: string;
  value?: string;
  placeholder?: string;
  href?: string;
  /** Произвольные атрибуты (`aria-*`, `data-*`). */
  attrs?: Record<string, string | number | boolean | null | undefined>;
  /** Инлайновые стили. */
  style?: Partial<CSSStyleDeclaration>;
  /** Слушатели `on: {click: fn}` — без автоматической отписки (для короткоживущих элементов). */
  on?: Partial<{[K in keyof HTMLElementEventMap]: (event: HTMLElementEventMap[K]) => void}>;
}

/** Создаёт элемент с атрибутами и детьми; строки становятся текстовыми узлами. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.id) el.id = props.id;
  if (props.title !== undefined) el.title = props.title;
  if (props.role) el.setAttribute('role', props.role);
  if (props.tabindex !== undefined) el.tabIndex = props.tabindex;
  if (props.hidden) el.hidden = true;
  if (props.type && 'type' in el) (el as unknown as {type: string}).type = props.type;
  if (props.value !== undefined && 'value' in el) (el as unknown as {value: string}).value = props.value;
  if (props.placeholder !== undefined && 'placeholder' in el) (el as unknown as {placeholder: string}).placeholder = props.placeholder;
  if (props.href !== undefined && el instanceof HTMLAnchorElement) el.href = props.href;
  if (props.disabled !== undefined && 'disabled' in el) (el as unknown as {disabled: boolean}).disabled = props.disabled;
  if (props.attrs) {
    for (const [name, value] of Object.entries(props.attrs)) {
      if (value === null || value === undefined || value === false) continue;
      el.setAttribute(name, value === true ? '' : String(value));
    }
  }
  if (props.style) Object.assign(el.style, props.style);
  if (props.on) {
    for (const [type, listener] of Object.entries(props.on)) {
      el.addEventListener(type, listener as EventListener);
    }
  }
  if (props.text !== undefined) el.textContent = props.text;
  append(el, children);
  return el;
}

/** Добавляет детей, пропуская пустые значения. */
export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** Заменяет содержимое элемента новыми детьми. */
export function replaceChildren(parent: Element, ...children: Child[]): void {
  parent.replaceChildren();
  append(parent, children);
}

/** Создаёт `<svg>` из строки разметки. Только для ДОВЕРЕННЫХ иконок из кода, не для данных. */
export function svg(markup: string, className?: string): SVGElement {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  const el = template.content.firstElementChild;
  if (!(el instanceof SVGElement)) {
    throw new Error('[svg] ожидалась SVG-разметка');
  }
  if (className) {
    el.setAttribute('class', className);
  }
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('focusable', 'false');
  return el;
}
