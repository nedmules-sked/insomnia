import React from 'react';

import { useRecentRequestsSwitcher } from '~/ui/context/app/recent-requests-switcher-context';

import { MethodTag } from '../tags/method-tag';

export const RecentRequestsSwitcher: React.FC = () => {
  const { state } = useRecentRequestsSwitcher();

  if (!state.active) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Recent Requests"
      className="fixed left-1/2 top-1/3 z-50 -translate-x-1/2 min-w-[420px] max-w-[640px] rounded-md border border-(--hl-md) bg-(--color-bg) shadow-lg"
    >
      <div className="px-3 py-2 border-b border-(--hl-md) text-sm font-semibold">
        Recent Requests
      </div>
      <ul className="max-h-[60vh] overflow-y-auto py-1">
        {state.snapshot.map((tab, index) => {
          const focused = index === state.cursor;
          return (
            <li
              key={tab.id}
              data-tab-id={tab.id}
              aria-selected={focused}
              className={
                'flex items-center gap-2 px-3 py-1.5 text-sm ' +
                (focused ? 'bg-(--hl-sm)' : '')
              }
            >
              {tab.method ? <MethodTag method={tab.method} /> : null}
              <span className="truncate flex-1">{tab.name}</span>
              <span className="truncate text-xs text-(--hl-lg)">{tab.workspaceName}</span>
            </li>
          );
        })}
      </ul>
      <div className="px-3 py-1.5 border-t border-(--hl-md) text-xs text-(--hl-lg)">
        Tab / Shift+Tab to cycle, release to switch, Esc to cancel
      </div>
    </div>
  );
};
