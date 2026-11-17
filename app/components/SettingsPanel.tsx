import ThemePicker from "./ThemePicker";
import {
  defaultPreferences,
  palettes,
  themeAppearance,
  type Preferences,
} from "../lib/preferences";

export default function SettingsPanel({
  preferences,
  onChange,
}: {
  preferences: Preferences;
  onChange: (value: Preferences) => void;
}) {
  const appearance = themeAppearance(preferences);
  return (
    <section className="space-y-5" aria-label="Settings">
      <div className="panel space-y-5">
        <h2>Appearance</h2>
        <ThemePicker preferences={preferences} onChange={onChange} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            Custom accent
            <input
              type="color"
              value={appearance.accent}
              onChange={(e) =>
                onChange({ ...preferences, customAccent: e.target.value })
              }
            />
          </label>
          <label>
            Custom background
            <input
              type="color"
              value={appearance.background}
              onChange={(e) =>
                onChange({ ...preferences, customBackground: e.target.value })
              }
            />
          </label>
        </div>
        <button
          className="action"
          onClick={() =>
            onChange({
              ...preferences,
              customAccent: null,
              customBackground: null,
            })
          }
        >
          Use preset colors
        </button>
        <p className="muted">
          Light and dark surfaces follow the background color. Preferences sync
          with your account when signed in.
        </p>
      </div>
      <div className="panel space-y-4">
        <h2>Visualizer & motion</h2>
        <label>
          Color palette
          <select
            value={preferences.palette}
            onChange={(e) =>
              onChange({
                ...preferences,
                palette: e.target.value as Preferences["palette"],
              })
            }
          >
            {Object.entries(palettes).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Visual intensity · {preferences.intensity.toFixed(1)}×
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.1}
            value={preferences.intensity}
            onChange={(e) =>
              onChange({ ...preferences, intensity: Number(e.target.value) })
            }
          />
        </label>
        <label className="flex-row items-center">
          <input
            type="checkbox"
            checked={preferences.reducedMotion}
            onChange={(e) =>
              onChange({ ...preferences, reducedMotion: e.target.checked })
            }
          />
          Reduce motion
        </label>
        <label className="flex-row items-center">
          <input
            type="checkbox"
            checked={preferences.effectsEnabled}
            onChange={(e) =>
              onChange({ ...preferences, effectsEnabled: e.target.checked })
            }
          />
          Enable animated effects
        </label>
      </div>
      <div className="panel space-y-3">
        <h2>Quest page</h2>
        {(
          [
            ["showStats", "Character stats"],
            ["showActivity", "Recent activity"],
            ["showQuestLibrary", "Quest library"],
          ] as const
        ).map(([key, label]) => (
          <label className="flex-row items-center" key={key}>
            <input
              type="checkbox"
              checked={preferences[key]}
              onChange={(e) =>
                onChange({ ...preferences, [key]: e.target.checked })
              }
            />
            Show {label.toLowerCase()}
          </label>
        ))}
      </div>
      <div className="panel space-y-3">
        <h2>Recovery</h2>
        <p className="muted">
          Safe mode opens the terminal with animation disabled. Your quests and
          teams stay saved.
        </p>
        <button
          className="action"
          onClick={() => window.location.assign("/?safe=1")}
        >
          Reload in safe mode
        </button>
        <button
          className="action ml-2"
          onClick={() => onChange(defaultPreferences)}
        >
          Reset appearance & preferences
        </button>
        <p className="muted">
          Terminal tools include doctor, logs, storage, safe, sync, repair,
          backup, and reload.
        </p>
      </div>
    </section>
  );
}
