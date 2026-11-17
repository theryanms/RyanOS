import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";

const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
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
  return { context, operations };
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
  assert.equal(Object.keys(themes).length, 5);
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
    assert.ok(themePicker.includes(theme.name));
  const account = renderToString(
    React.createElement(AccountPanel, { onApply() {} }),
  );
  assert.ok(account.includes("Account &amp; cloud saves"));
});
