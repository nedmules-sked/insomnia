import { describe, expect, it } from 'vitest';

import type { BaseTab } from '~/ui/components/tabs/tab';

import {
  buildSnapshot,
  initialState,
  reducer,
  selectCommittedTabId,
  type SwitcherState,
} from './recent-requests-switcher-state';

const tab = (id: string, type: BaseTab['type'] = 'request'): BaseTab => ({
  id,
  type,
  name: id,
  url: `/r/${id}`,
  organizationId: 'o',
  projectId: 'p',
  workspaceId: 'w',
  projectName: 'p',
  workspaceName: 'w',
});

describe('buildSnapshot', () => {
  it('puts active tab first, then history, filtered to request type', () => {
    const tabList = [tab('a'), tab('b'), tab('c'), tab('runner', 'runner'), tab('d')];
    const tabHistory = ['c', 'runner', 'b', 'gone'];
    const snap = buildSnapshot('a', tabList, tabHistory);
    expect(snap.map(t => t.id)).toEqual(['a', 'c', 'b']);
  });

  it('returns history-only when active tab is not a request', () => {
    const tabList = [tab('runner', 'runner'), tab('a'), tab('b')];
    const tabHistory = ['a', 'b'];
    const snap = buildSnapshot('runner', tabList, tabHistory);
    expect(snap.map(t => t.id)).toEqual(['a', 'b']);
  });

  it('returns empty when no request tabs exist', () => {
    const tabList = [tab('runner', 'runner')];
    const snap = buildSnapshot('runner', tabList, []);
    expect(snap).toEqual([]);
  });

  it('drops history ids that no longer exist in tabList', () => {
    const tabList = [tab('a'), tab('b')];
    const tabHistory = ['ghost', 'b'];
    const snap = buildSnapshot('a', tabList, tabHistory);
    expect(snap.map(t => t.id)).toEqual(['a', 'b']);
  });
});

describe('reducer', () => {
  const tabs = [tab('a'), tab('b'), tab('c')];
  const beginState = reducer(initialState, {
    type: 'BEGIN',
    direction: 'next',
    activeTabId: 'a',
    tabList: tabs,
    tabHistory: ['b', 'c'],
  });

  it('BEGIN snapshots [active, ...history] and starts cursor at 1 for next', () => {
    expect(beginState.active).toBe(true);
    expect(beginState.snapshot.map(t => t.id)).toEqual(['a', 'b', 'c']);
    expect(beginState.cursor).toBe(1);
  });

  it('BEGIN starts cursor at last index for prev direction', () => {
    const state = reducer(initialState, {
      type: 'BEGIN',
      direction: 'prev',
      activeTabId: 'a',
      tabList: tabs,
      tabHistory: ['b', 'c'],
    });
    expect(state.cursor).toBe(2);
  });

  it('BEGIN with fewer than 2 request tabs stays inactive', () => {
    const state = reducer(initialState, {
      type: 'BEGIN',
      direction: 'next',
      activeTabId: 'a',
      tabList: [tab('a')],
      tabHistory: [],
    });
    expect(state.active).toBe(false);
  });

  it('STEP next wraps from end to start', () => {
    let s = beginState;
    s = reducer(s, { type: 'STEP', direction: 'next' });
    s = reducer(s, { type: 'STEP', direction: 'next' });
    expect(s.cursor).toBe(0);
    s = reducer(s, { type: 'STEP', direction: 'next' });
    expect(s.cursor).toBe(1);
  });

  it('STEP prev wraps from start to end', () => {
    let s = { ...beginState, cursor: 0 };
    s = reducer(s, { type: 'STEP', direction: 'prev' });
    expect(s.cursor).toBe(2);
  });

  it('STEP is a no-op when inactive', () => {
    const s = reducer(initialState, { type: 'STEP', direction: 'next' });
    expect(s).toBe(initialState);
  });

  it('CANCEL returns to inactive', () => {
    const s = reducer(beginState, { type: 'CANCEL' });
    expect(s.active).toBe(false);
    expect(s.snapshot).toEqual([]);
  });

  it('COMMIT returns to inactive (caller reads selectCommittedTabId before dispatching)', () => {
    const s = reducer(beginState, { type: 'COMMIT' });
    expect(s.active).toBe(false);
  });

  it('TAB_REMOVED drops the id and clamps the cursor', () => {
    let s = { ...beginState, cursor: 2 };
    s = reducer(s, { type: 'TAB_REMOVED', tabId: 'c' });
    expect(s.snapshot.map(t => t.id)).toEqual(['a', 'b']);
    expect(s.cursor).toBe(1);
  });

  it('TAB_REMOVED that empties the snapshot deactivates', () => {
    let s = beginState;
    s = reducer(s, { type: 'TAB_REMOVED', tabId: 'a' });
    s = reducer(s, { type: 'TAB_REMOVED', tabId: 'b' });
    s = reducer(s, { type: 'TAB_REMOVED', tabId: 'c' });
    expect(s.active).toBe(false);
  });
});

describe('selectCommittedTabId', () => {
  it('returns undefined when inactive', () => {
    expect(selectCommittedTabId(initialState)).toBeUndefined();
  });

  it('returns the tab id at the cursor when active', () => {
    const s: SwitcherState = {
      active: true,
      cursor: 1,
      snapshot: [tab('a'), tab('b')],
    };
    expect(selectCommittedTabId(s)).toBe('b');
  });
});
