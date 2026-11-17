export const themes = {
  midnight: { name: "Midnight", color: "#6ee7b7", hue: 165 },
  ocean: { name: "Ocean", color: "#67e8f9", hue: 190 },
  nebula: { name: "Nebula", color: "#d8b4fe", hue: 275 },
  forest: { name: "Forest", color: "#bef264", hue: 100 },
  ember: { name: "Ember", color: "#fdba74", hue: 25 },
} as const;

export const visualizerModes = {
  pulse: "Pulse",
  spectrum: "Spectrum",
  waveform: "Waveform",
  orbit: "Orbit",
  ripple: "Ripple",
} as const;

export type Preferences = {
  theme: keyof typeof themes;
  visualizer: keyof typeof visualizerModes;
  sensitivity: number;
};

export const preferencesKey = "ryanos-preferences-v1";
export const localChangeEvent = "ryanos-local-change";
export const defaultPreferences: Preferences = {
  theme: "midnight",
  visualizer: "pulse",
  sensitivity: 1.5,
};

export function parsePreferences(value: unknown): Preferences {
  const data = (
    value && typeof value === "object" ? value : {}
  ) as Partial<Preferences>;
  return {
    theme:
      data.theme && Object.hasOwn(themes, data.theme)
        ? data.theme
        : defaultPreferences.theme,
    visualizer:
      data.visualizer && Object.hasOwn(visualizerModes, data.visualizer)
        ? data.visualizer
        : defaultPreferences.visualizer,
    sensitivity:
      typeof data.sensitivity === "number" && Number.isFinite(data.sensitivity)
        ? Math.max(0.5, Math.min(3, data.sensitivity))
        : defaultPreferences.sensitivity,
  };
}

export function notifyLocalChange() {
  window.dispatchEvent(new Event(localChangeEvent));
}
