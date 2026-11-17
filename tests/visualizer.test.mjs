import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";
import { createCanvas } from "@napi-rs/canvas";

const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
load.extensions[".tsx"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const { drawVisualizer } = load("../app/lib/visualizer.ts");
const { parsePreferences, themes, visualizerModes } = load(
  "../app/lib/preferences.ts",
);

function canvasRecorder() {
  const operations = [];
  const methods = [
    "fill",
    "fillRect",
    "beginPath",
    "moveTo",
    "lineTo",
    "stroke",
    "arc",
    "ellipse",
  ];
  const context = Object.fromEntries(
    methods.map((method) => [
      method,
      (...args) => {
        assert.ok(
          args.every(
            (value) => typeof value !== "number" || Number.isFinite(value),
          ),
        );
        operations.push([method, ...args]);
      },
    ]),
  );
  context.createRadialGradient = (...args) => {
    operations.push(["gradient", ...args]);
    return { addColorStop() {} };
  };
  return {
    context: new Proxy(context, {
      set(target, key, value) {
        if (
          ["strokeStyle", "fillStyle"].includes(key) &&
          typeof value === "string"
        )
          operations.push([key, value]);
        target[key] = value;
        return true;
      },
    }),
    operations,
  };
}

test("every visualizer responds to audio at phone and desktop widths", () => {
  for (const width of [280, 1024]) {
    for (const mode of Object.keys(visualizerModes)) {
      const silent = canvasRecorder();
      const loud = canvasRecorder();
      const base = {
        width,
        height: 320,
        frequencies: new Uint8Array(128),
        waveform: new Uint8Array(256).fill(128),
        pulse: 0,
        time: 1000,
        reducedMotion: false,
        hue: 190,
        sensitivity: 1.5,
        mode,
      };
      drawVisualizer(silent.context, base);
      drawVisualizer(loud.context, {
        ...base,
        frequencies: new Uint8Array(128).fill(200),
        waveform: new Uint8Array(256).map(
          (_, index) => 128 + Math.round(Math.sin(index) * 100),
        ),
        pulse: 0.8,
      });
      assert.notDeepEqual(
        loud.operations,
        silent.operations,
        `${mode} should react to audio`,
      );
      const reduced = canvasRecorder();
      drawVisualizer(reduced.context, {
        ...base,
        reducedMotion: true,
        frequencies: new Uint8Array(128).fill(255),
      });
      assert.ok(reduced.operations.length > 0);
    }
  }
});

test("preferences handle old saves and invalid values", () => {
  assert.equal(Object.keys(themes).length, 10);
  assert.equal(parsePreferences(null).theme, "midnight");
  assert.equal(
    parsePreferences({ theme: "missing", sensitivity: Infinity }).sensitivity,
    1.5,
  );
  assert.equal(parsePreferences({ sensitivity: 100 }).sensitivity, 3);
  assert.equal(parsePreferences({ sensitivity: -1 }).sensitivity, 0.5);
  for (const theme of Object.keys(themes))
    assert.equal(parsePreferences({ theme }).theme, theme);
});

test("visualizer, theme choices, and account panel render through their normal components", () => {
  const React = load("react");
  const { renderToString } = load("react-dom/server");
  const Visualizer = load("../app/components/Visualizer.tsx").default;
  const ThemePicker = load("../app/components/ThemePicker.tsx").default;
  const AccountPanel = load("../app/components/AccountPanel.tsx").default;
  const props = { preferences: parsePreferences(null), onChange() {} };
  const visualizer = renderToString(React.createElement(Visualizer, props));
  for (const label of Object.values(visualizerModes))
    assert.ok(visualizer.includes(label));
  const themePicker = renderToString(React.createElement(ThemePicker, props));
  for (const theme of Object.values(themes))
    assert.ok(themePicker.includes(theme.name.replaceAll("&", "&amp;")));
  const account = renderToString(
    React.createElement(AccountPanel, { onApply() {} }),
  );
  assert.ok(account.includes("Account &amp; cloud saves"));
});

test("ripple rings expand across frames and stay bounded", () => {
  const { createVisualizerState } = load("../app/lib/visualizer.ts");
  const state = createVisualizerState();
  const recorded = canvasRecorder();
  const base = {
    width: 360,
    height: 420,
    frequencies: new Uint8Array(256).fill(160),
    waveform: new Uint8Array(512).fill(128),
    pulse: 0.5,
    reducedMotion: false,
    hue: 0,
    sensitivity: 1.5,
    mode: "ripple",
    state,
  };
  drawVisualizer(recorded.context, { ...base, time: 0 });
  const first = recorded.operations.find(
    (operation) => operation[0] === "moveTo",
  );
  recorded.operations.length = 0;
  drawVisualizer(recorded.context, { ...base, time: 400 });
  const later = recorded.operations.find(
    (operation) => operation[0] === "moveTo",
  );
  assert.notDeepEqual(first, later);
  for (let time = 800; time <= 20000; time += 400)
    drawVisualizer(recorded.context, { ...base, time });
  assert.ok(state.rings.length > 1 && state.rings.length <= 18);
});

test("all visualizers render full-color canvas images", () => {
  for (const mode of Object.keys(visualizerModes)) {
    const canvas = createCanvas(480, 320);
    const context = canvas.getContext("2d");
    drawVisualizer(context, {
      width: 480,
      height: 320,
      frequencies: new Uint8Array(256).fill(170),
      waveform: Uint8Array.from(
        { length: 512 },
        (_, index) => 128 + Math.sin(index / 13) * 80,
      ),
      pulse: 0.7,
      time: 1500,
      reducedMotion: false,
      hue: 190,
      sensitivity: 1.5,
      mode,
      palette: "rainbow",
    });
    assert.ok(canvas.toBuffer("image/png").length > 1000);
    const pixels = context.getImageData(0, 0, 480, 320).data;
    const colors = new Set();
    for (let i = 0; i < pixels.length; i += 16)
      if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 100)
        colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
    assert.ok(colors.size > 20, `${mode} should show a range of colors`);
  }
});
