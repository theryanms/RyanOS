import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";
const load = createRequire(import.meta.url);
const compile = (module, filename) =>
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
load.extensions[".ts"] = compile;
load.extensions[".tsx"] = compile;
const { captureDisplayAudio, stopStream } = load("../app/lib/audio-capture.ts");
const { runAdminCommand } = load("../app/lib/admin-commands.ts");

function mediaStream(withAudio) {
  const tracks = [
    {
      kind: "video",
      readyState: "live",
      stopped: false,
      stop() {
        this.stopped = true;
      },
    },
  ];
  if (withAudio)
    tracks.push({
      kind: "audio",
      readyState: "live",
      stopped: false,
      stop() {
        this.stopped = true;
      },
    });
  return {
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((track) => track.kind === "audio"),
  };
}

test("shared audio requests consent options and releases every track", async () => {
  const stream = mediaStream(true);
  let options;
  const captured = await captureDisplayAudio({
    getDisplayMedia: async (value) => {
      options = value;
      return stream;
    },
  });
  assert.equal(captured, stream);
  assert.equal(options.video, true);
  assert.equal(options.audio, true);
  assert.equal(options.systemAudio, "include");
  assert.equal(
    stream.getTracks().some((track) => track.stopped),
    false,
  );
  stopStream(stream);
  assert.ok(stream.getTracks().every((track) => track.stopped));
});
test("missing audio, unavailable capture, and permission denial are handled", async () => {
  const silent = mediaStream(false);
  await assert.rejects(
    captureDisplayAudio({ getDisplayMedia: async () => silent }),
    /no audio/,
  );
  assert.ok(silent.getTracks().every((track) => track.stopped));
  await assert.rejects(captureDisplayAudio(undefined), /unavailable/);
  const denied = new Error("Permission denied");
  denied.name = "NotAllowedError";
  await assert.rejects(
    captureDisplayAudio({
      getDisplayMedia: async () => {
        throw denied;
      },
    }),
    (error) => error === denied,
  );
});
test("admin namespace refuses non-admins and uses the authorized report endpoint", async () => {
  const originalFetch = globalThis.fetch;
  try {
    let updates = 0;
    globalThis.fetch = async (_url, options) => {
      if (options?.method === "PATCH") updates++;
      return Response.json({ admin: false, reports: [] });
    };
    await assert.rejects(runAdminCommand("reports"), /Admin access required/);
    assert.equal(updates, 0);
    globalThis.fetch = async (_url, options) => {
      if (options?.method === "PATCH") {
        updates++;
        assert.equal(JSON.parse(options.body).status, "resolved");
        return Response.json({ ok: true });
      }
      return Response.json({ admin: true, reports: [] });
    };
    assert.match(await runAdminCommand("help"), /admin reports/);
    assert.equal(await runAdminCommand("reports"), "No reports yet.");
    assert.match(
      await runAdminCommand("resolve 12345678-1234-1234-1234-123456789abc"),
      /marked resolved/,
    );
    assert.equal(updates, 1);
    await assert.rejects(runAdminCommand("reset-xp"), /Use admin reports/);
    assert.equal(updates, 1);
    globalThis.fetch = async () =>
      Response.json({ error: "Admin access required." }, { status: 403 });
    await assert.rejects(runAdminCommand("reports"), /Admin access required/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("settings and reporting are footer controls, with four main modules", () => {
  const React = load("react");
  const { renderToString } = load("react-dom/server");
  const Home = load("../app/page.tsx").default;
  const html = renderToString(React.createElement(Home));
  const navigation = html.match(
    /<nav[^>]*aria-label="Modules"[\s\S]*?<\/nav>/,
  )?.[0];
  assert.ok(navigation);
  assert.ok(!navigation.includes("Settings"));
  assert.ok(!navigation.includes("Report an issue"));
  assert.equal((navigation.match(/aria-pressed=/g) || []).length, 4);
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0];
  assert.ok(footer.includes("Settings"));
  assert.ok(footer.includes("Report an issue"));
  assert.ok(footer.includes("Download backup"));
});
