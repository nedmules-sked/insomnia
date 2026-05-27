import React, {
  createContext,
  type FC,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import { useParams } from 'react-router';

import uiEventBus from '~/ui/event-bus';

import { useInsomniaTabContext } from './insomnia-tab-context';
import {
  initialState,
  reducer,
  selectCommittedTabId,
  type SwitcherState,
} from './recent-requests-switcher-state';

interface ContextValue {
  state: SwitcherState;
  beginSwitch: (direction: 'next' | 'prev') => void;
  stepSwitch: (direction: 'next' | 'prev') => void;
  commit: () => void;
  cancel: () => void;
}

const RecentRequestsSwitcherContext = createContext<ContextValue>({
  state: initialState,
  beginSwitch: () => {},
  stepSwitch: () => {},
  commit: () => {},
  cancel: () => {},
});

export const RecentRequestsSwitcherProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { organizationId } = useParams<{ organizationId: string }>();
  const { currentOrgTabs, appTabsRef, changeActiveTab } = useInsomniaTabContext();

  const stateRef = useRef(state);
  stateRef.current = state;

  const beginSwitch = useCallback(
    (direction: 'next' | 'prev') => {
      const orgTabs = appTabsRef?.current?.[organizationId ?? ''];
      if (!orgTabs?.activeTabId) {
        return;
      }
      dispatch({
        type: 'BEGIN',
        direction,
        activeTabId: orgTabs.activeTabId,
        tabList: orgTabs.tabList,
        tabHistory: orgTabs.tabHistory ?? [],
      });
    },
    [appTabsRef, organizationId],
  );

  const stepSwitch = useCallback((direction: 'next' | 'prev') => {
    dispatch({ type: 'STEP', direction });
  }, []);

  const cancel = useCallback(() => {
    dispatch({ type: 'CANCEL' });
  }, []);

  const commit = useCallback(() => {
    const targetId = selectCommittedTabId(stateRef.current);
    dispatch({ type: 'COMMIT' });
    if (targetId && targetId !== currentOrgTabs.activeTabId) {
      changeActiveTab(targetId, { navigate: true });
    }
  }, [changeActiveTab, currentOrgTabs.activeTabId]);

  useEffect(() => {
    dispatch({ type: 'CANCEL' });
  }, [organizationId]);

  useEffect(() => {
    const handler = (_org: string, payload: string | string[]) => {
      const ids =
        payload === 'all'
          ? stateRef.current.snapshot.map(t => t.id)
          : Array.isArray(payload)
            ? payload
            : [payload];
      for (const id of ids) {
        dispatch({ type: 'TAB_REMOVED', tabId: id });
      }
    };
    uiEventBus.on('CLOSE_TAB', handler);
    return () => {
      uiEventBus.off('CLOSE_TAB', handler);
    };
  }, []);

  useEffect(() => {
    if (!state.active) {
      return;
    }
    const onKeyup = (event: KeyboardEvent) => {
      const modifierStillHeld = event.ctrlKey || event.shiftKey || event.metaKey || event.altKey;
      if (!modifierStillHeld) {
        commit();
      }
    };
    document.body.addEventListener('keyup', onKeyup);
    return () => {
      document.body.removeEventListener('keyup', onKeyup);
    };
  }, [state.active, commit]);

  return (
    <RecentRequestsSwitcherContext.Provider
      value={{ state, beginSwitch, stepSwitch, commit, cancel }}
    >
      {children}
    </RecentRequestsSwitcherContext.Provider>
  );
};

export const useRecentRequestsSwitcher = () => useContext(RecentRequestsSwitcherContext);
