import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SETTINGS, detectLanguage, withDefaults, type Settings } from "../game/settings";

/**
 * Device-wide preferences. Stored under their own key rather than inside the save, so a New
 * Game — which wipes the save — leaves language, controls and pacing exactly as they were.
 */

const SETTINGS_KEY = "melita-settings";
const SETTINGS_VERSION = 1;

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
}

function deviceLocale(): string | undefined {
  return typeof navigator !== "undefined" ? navigator.language : undefined;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      language: detectLanguage(deviceLocale()),
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      resetSettings: () => set({ ...DEFAULT_SETTINGS, language: detectLanguage(deviceLocale()) }),
    }),
    {
      name: SETTINGS_KEY,
      version: SETTINGS_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        const { set: _set, resetSettings: _reset, ...settings } = state;
        return settings;
      },
      // Nothing stored yet (first launch): keep the initial state, which already carries the
      // detected language and any controls inherited from the old save. Otherwise an option
      // added after the player last saved simply takes its default.
      merge: (persisted, current) =>
        persisted ? { ...current, ...withDefaults(persisted as Partial<Settings>) } : current,
    }
  )
);

/** Snapshot of the current settings outside React — for callbacks that fire later. */
export function currentSettings(): Settings {
  const { set: _set, resetSettings: _reset, ...settings } = useSettings.getState();
  return settings;
}
