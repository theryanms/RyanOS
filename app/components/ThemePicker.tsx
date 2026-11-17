import { themes, type Preferences } from "../lib/preferences";

export default function ThemePicker({
  preferences,
  onChange,
}: {
  preferences: Preferences;
  onChange: (value: Preferences) => void;
}) {
  return (
    <fieldset
      className="flex flex-wrap items-center gap-2"
      aria-label="App theme"
    >
      <legend className="mb-2 text-xs text-zinc-400">Choose your theme</legend>
      {Object.entries(themes).map(([id, theme]) => (
        <button
          type="button"
          className={`tab ${preferences.theme === id ? "selected" : ""}`}
          aria-pressed={preferences.theme === id}
          key={id}
          onClick={() =>
            onChange({
              ...preferences,
              theme: id as Preferences["theme"],
              customAccent: null,
              customBackground: null,
            })
          }
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: theme.color }}
          />
          {theme.name}
        </button>
      ))}
    </fieldset>
  );
}
