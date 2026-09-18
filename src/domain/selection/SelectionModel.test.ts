/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import {describe, expect, it} from 'vitest';
import {click, EMPTY_SELECTION, invert, moveFocus, pressOn, clickRelease, retain, selectAll} from './SelectionModel';

const order = ['a', 'b', 'c', 'd', 'e'];
const ids = (s: {selected: ReadonlySet<string>}) => [...s.selected].sort();

describe('SelectionModel', () => {
  it('одиночный клик выделяет только элемент и ставит якорь', () => {
    const s = click(EMPTY_SELECTION, order, 'b');
    expect(ids(s)).toEqual(['b']);
    expect(s.anchor).toBe('b');
    expect(s.focus).toBe('b');
  });

  it('Ctrl переключает, Shift выделяет диапазон от якоря', () => {
    let s = click(EMPTY_SELECTION, order, 'b');
    s = click(s, order, 'd', {ctrl: true});
    expect(ids(s)).toEqual(['b', 'd']);
    s = click(s, order, 'b', {ctrl: true});
    expect(ids(s)).toEqual(['d']);
    // Ctrl-клик переносит якорь на «b» (как в проводнике), поэтому Shift-диапазон идёт от него.
    expect(s.anchor).toBe('b');
    s = click(s, order, 'a', {shift: true});
    expect(ids(s)).toEqual(['a', 'b']);
    expect(s.anchor).toBe('b');
    // Shift-клик якорь не двигает: следующий диапазон снова от «b».
    s = click(s, order, 'e', {shift: true});
    expect(ids(s)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('Ctrl+Shift добавляет диапазон к существующему', () => {
    let s = click(EMPTY_SELECTION, order, 'a');
    s = click(s, order, 'e', {ctrl: true});
    s = click(s, order, 'c', {ctrl: true, shift: true});
    expect(ids(s)).toEqual(['a', 'c', 'd', 'e']);
  });

  it('press на выделенном не сбрасывает группу; release без drag — сбрасывает', () => {
    let s = selectAll(EMPTY_SELECTION, order);
    s = pressOn(s, order, 'c');
    expect(s.selected.size).toBe(5);
    s = clickRelease(s, 'c');
    expect(ids(s)).toEqual(['c']);
  });

  it('стрелки: без модификаторов — одиночный, Shift — диапазон, Ctrl — только фокус', () => {
    let s = click(EMPTY_SELECTION, order, 'b');
    s = moveFocus(s, order, 1);
    expect(ids(s)).toEqual(['c']);
    s = moveFocus(s, order, 1, {shift: true});
    expect(ids(s)).toEqual(['c', 'd']);
    s = moveFocus(s, order, 1, {ctrl: true});
    expect(ids(s)).toEqual(['c', 'd']);
    expect(s.focus).toBe('e');
    s = moveFocus(s, order, 10);
    expect(ids(s)).toEqual(['e']);
  });

  it('invert и retain', () => {
    let s = click(EMPTY_SELECTION, order, 'a');
    s = invert(s, order);
    expect(ids(s)).toEqual(['b', 'c', 'd', 'e']);
    s = retain(s, ['b', 'c']);
    expect(ids(s)).toEqual(['b', 'c']);
  });
});
