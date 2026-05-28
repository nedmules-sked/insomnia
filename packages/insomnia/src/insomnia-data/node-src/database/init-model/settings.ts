import * as hotkeys from '~/common/hotkeys';
import type { KeyboardShortcut, KeyCombination, PlatformKeyCombinations } from '~/common/settings';
import type { Settings } from '~/insomnia-data';

export function migrate(doc: Settings) {
  try {
    doc = migrateEnsureHotKeys(doc);
    return doc;
  } catch (e) {
    console.log('[db] Error during settings migration', e);
    throw e;
  }
}

/**
 * Ensure map is updated when new hotkeys are added
 */
function migrateEnsureHotKeys(settings: Settings): Settings {
  const defaultHotKeyRegistry = hotkeys.newDefaultRegistry();

  // Remove any hotkeys that are no longer in the default registry
  const hotKeyRegistry = (Object.keys(settings.hotKeyRegistry) as KeyboardShortcut[]).reduce(
    (newHotKeyRegistry, key) => {
      if (key in defaultHotKeyRegistry) {
        newHotKeyRegistry[key] = adoptNewDefaults(
          settings.hotKeyRegistry[key],
          defaultHotKeyRegistry[key],
        );
      }

      return newHotKeyRegistry;
    },
    {} as Settings['hotKeyRegistry'],
  );

  settings.hotKeyRegistry = { ...defaultHotKeyRegistry, ...hotKeyRegistry };
  return settings;
}

// When the default key combinations for a shortcut grow (new platform binding added),
// existing users keep the old shorter list. If the user's list is a strict subset of
// the new defaults — i.e. they haven't customised, they just have an outdated copy —
// upgrade them to the new defaults. Custom bindings (any combo not in the new default)
// are left untouched.
function adoptNewDefaults(
  current: PlatformKeyCombinations,
  fresh: PlatformKeyCombinations,
): PlatformKeyCombinations {
  return {
    macKeys: isSubsetOfDefaults(current.macKeys, fresh.macKeys) ? fresh.macKeys : current.macKeys,
    winLinuxKeys: isSubsetOfDefaults(current.winLinuxKeys, fresh.winLinuxKeys)
      ? fresh.winLinuxKeys
      : current.winLinuxKeys,
  };
}

function isSubsetOfDefaults(userCombos: KeyCombination[], defaultCombos: KeyCombination[]): boolean {
  return userCombos.every(uc => defaultCombos.some(dc => hotkeys.areSameKeyCombinations(uc, dc)));
}
