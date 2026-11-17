export const themes = {
  midnight: { name: "Midnight", color: "#6ee7b7", hue: 165 },
  ocean: { name: "Ocean", color: "#67e8f9", hue: 190 },
  nebula: { name: "Nebula", color: "#d8b4fe", hue: 275 },
  forest: { name: "Forest", color: "#bef264", hue: 100 },
  ember: { name: "Ember", color: "#fdba74", hue: 25 },
  synthwave: { name: "Synthwave", color: "#ff61d8", hue: 315 },
  terminal: { name: "CRT Terminal", color: "#65ff76", hue: 125 },
  arctic: { name: "Arctic", color: "#0369a1", hue: 200 },
  paper: { name: "Paper & Ink", color: "#4338ca", hue: 245 },
  blossom: { name: "Cherry Blossom", color: "#be185d", hue: 335 },
} as const;

export const themeBackgrounds: Record<keyof typeof themes, string> = {
  midnight: "#07070f",
  ocean: "#03131c",
  nebula: "#130a20",
  forest: "#0b150b",
  ember: "#1b0e09",
  synthwave: "#190b30",
  terminal: "#020c05",
  arctic: "#edf8ff",
  paper: "#f4f1e9",
  blossom: "#fff1f5",
};
export const palettes = {
  aurora: "Aurora",
  fire: "Solar Flare",
  candy: "Neon Candy",
  rainbow: "Full Spectrum",
  ice: "Glacier",
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
  customAccent: string | null;
  customBackground: string | null;
  palette: keyof typeof palettes;
  intensity: number;
  reducedMotion: boolean;
  effectsEnabled: boolean;
  showStats: boolean;
  showActivity: boolean;
  showQuestLibrary: boolean;
};

export const preferencesKey = "ryanos-preferences-v1";
export const localChangeEvent = "ryanos-local-change";
export const defaultPreferences: Preferences = {
  theme: "midnight",
  visualizer: "pulse",
  sensitivity: 1.5,
  customAccent: null,
  customBackground: null,
  palette: "aurora",
  intensity: 1.3,
  reducedMotion: false,
  effectsEnabled: true,
  showStats: true,
  showActivity: true,
  showQuestLibrary: true,
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
    customAccent:
      typeof data.customAccent === "string" &&
      /^#[0-9a-f]{6}$/i.test(data.customAccent)
        ? data.customAccent
        : null,
    customBackground:
      typeof data.customBackground === "string" &&
      /^#[0-9a-f]{6}$/i.test(data.customBackground)
        ? data.customBackground
        : null,
    palette:
      data.palette && Object.hasOwn(palettes, data.palette)
        ? data.palette
        : "aurora",
    intensity:
      typeof data.intensity === "number" && Number.isFinite(data.intensity)
        ? Math.max(0.5, Math.min(2.5, data.intensity))
        : defaultPreferences.intensity,
    reducedMotion: data.reducedMotion === true,
    effectsEnabled: data.effectsEnabled !== false,
    showStats: data.showStats !== false,
    showActivity: data.showActivity !== false,
    showQuestLibrary: data.showQuestLibrary !== false,
  };
}

export function themeAppearance(preferences: Preferences) {
  const background =
    preferences.customBackground ?? themeBackgrounds[preferences.theme];
  const rgb = [1, 3, 5].map((start) =>
    parseInt(background.slice(start, start + 2), 16),
  );
  const light = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 155;
  return {
    background,
    accent: preferences.customAccent ?? themes[preferences.theme].color,
    light,
  };
}

export function notifyLocalChange() {
  window.dispatchEvent(new Event(localChangeEvent));
}
