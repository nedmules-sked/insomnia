import type { BaseTab } from '~/ui/components/tabs/tab';

export interface SwitcherState {
  active: boolean;
  cursor: number;
  snapshot: BaseTab[];
}

export type SwitcherEvent =
  | {
      type: 'BEGIN';
      direction: 'next' | 'prev';
      activeTabId: string;
      tabList: BaseTab[];
      tabHistory: string[];
    }
  | { type: 'STEP'; direction: 'next' | 'prev' }
  | { type: 'COMMIT' }
  | { type: 'CANCEL' }
  | { type: 'TAB_REMOVED'; tabId: string };

export const initialState: SwitcherState = {
  active: false,
  cursor: 0,
  snapshot: [],
};

export function buildSnapshot(
  activeTabId: string,
  tabList: BaseTab[],
  tabHistory: string[],
): BaseTab[] {
  const byId = new Map<string, BaseTab>();
  for (const t of tabList) {
    if (t.type === 'request') {
      byId.set(t.id, t);
    }
  }
  const active = byId.get(activeTabId);
  const history: BaseTab[] = [];
  const seen = new Set<string>(active ? [active.id] : []);
  for (const id of tabHistory) {
    if (seen.has(id)) {
      continue;
    }
    const t = byId.get(id);
    if (t) {
      history.push(t);
      seen.add(id);
    }
  }
  return active ? [active, ...history] : history;
}

const wrap = (n: number, length: number): number =>
  length === 0 ? 0 : ((n % length) + length) % length;

export function reducer(state: SwitcherState, event: SwitcherEvent): SwitcherState {
  switch (event.type) {
    case 'BEGIN': {
      const snapshot = buildSnapshot(event.activeTabId, event.tabList, event.tabHistory);
      if (snapshot.length < 2) {
        return state;
      }
      const cursor = event.direction === 'next' ? 1 : snapshot.length - 1;
      return { active: true, cursor, snapshot };
    }
    case 'STEP': {
      if (!state.active) {
        return state;
      }
      const delta = event.direction === 'next' ? 1 : -1;
      return { ...state, cursor: wrap(state.cursor + delta, state.snapshot.length) };
    }
    case 'COMMIT':
    case 'CANCEL': {
      return initialState;
    }
    case 'TAB_REMOVED': {
      if (!state.active) {
        return state;
      }
      const idx = state.snapshot.findIndex(t => t.id === event.tabId);
      if (idx === -1) {
        return state;
      }
      const snapshot = state.snapshot.filter(t => t.id !== event.tabId);
      if (snapshot.length === 0) {
        return initialState;
      }
      const cursor =
        idx <= state.cursor && state.cursor > 0
          ? state.cursor - 1
          : Math.min(state.cursor, snapshot.length - 1);
      return { ...state, snapshot, cursor };
    }
    default: {
      return state;
    }
  }
}

export function selectCommittedTabId(state: SwitcherState): string | undefined {
  if (!state.active) {
    return undefined;
  }
  return state.snapshot[state.cursor]?.id;
}
