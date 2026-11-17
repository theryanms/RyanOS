import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { after, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";

const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, filename) => {
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
};

// Run the route handlers against real Postgres semantics without a cloud account.
const database = new PGlite();
function sql(strings, ...values) {
  const text = strings.reduce(
    (query, fragment, index) => query + (index ? `$${index}` : "") + fragment,
    "",
  );
  return {
    text,
    values,
    then: (resolve, reject) =>
      database
        .query(text, values)
        .then((result) => result.rows)
        .then(resolve, reject),
  };
}
sql.transaction = (queries) =>
  database.transaction(async (transaction) => {
    const results = [];
    for (const query of queries)
      results.push((await transaction.query(query.text, query.values)).rows);
    return results;
  });
const originalLoader = Module._load;
Module._load = function (name, ...args) {
  if (name === "@neondatabase/serverless") return { neon: () => sql };
  return originalLoader.call(this, name, ...args);
};

const route = load("../app/api/account/route.ts");
const { NextRequest } = load("next/server");
const { emptyState } = load("../app/lib/quests.ts");
const { defaultPreferences } = load("../app/lib/preferences.ts");
const {
  snapshotKey,
  syncDecision,
  parseSnapshot,
  writeLocalSnapshot,
  readLocalSnapshot,
} = load("../app/lib/snapshot.ts");
const { hashPassword, verifyPassword, normalizeUsername } = load(
  "../app/lib/server/passwords.ts",
);
const originalDatabaseURL = process.env.DATABASE_URL;
const originalMailKey = process.env.RESEND_API_KEY;
delete process.env.RESEND_API_KEY;
delete process.env.DATABASE_URL;

after(async () => {
  Module._load = originalLoader;
  if (originalDatabaseURL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseURL;
  if (originalMailKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalMailKey;
  await database.close();
});

const snapshot = {
  schemaVersion: 1,
  progress: emptyState,
  teams: [],
  preferences: defaultPreferences,
};
function request(method, data, cookie = "", origin = "http://localhost") {
  return new NextRequest("http://localhost/api/account", {
    method,
    headers: {
      host: "localhost",
      origin,
      cookie,
      "Content-Type": "application/json",
      "x-real-ip": "127.0.0.1",
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}
const cookieFrom = (response) =>
  response.headers.get("set-cookie").split(";")[0];

test("account lifecycle, uniqueness, authentication, isolated saves, and concurrent revisions", async () => {
  const unconfigured = await route.GET(request("GET"));
  assert.deepEqual(await unconfigured.json(), {
    configured: false,
    account: null,
  });
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
  assert.equal((await route.POST(request("POST", []))).status, 400);
  assert.equal(
    (
      await route.POST(
        request("POST", { action: "signin" }, "", "invalid-origin"),
      )
    ).status,
    403,
  );
  const guest = await route.GET(request("GET"));
  assert.equal((await guest.json()).account, null);

  const created = await route.POST(
    request("POST", {
      action: "signup",
      username: "Ryan_Test",
      password: "a-strong-test-password",
      snapshot,
    }),
  );
  assert.equal(
    created.status,
    200,
    JSON.stringify(await created.clone().json()),
  );
  const first = (await created.json()).account;
  const cookie = cookieFrom(created);
  assert.equal(first.username, "ryan_test");
  assert.equal(Object.hasOwn(first, "password_hash"), false);
  assert.match(created.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(created.headers.get("set-cookie"), /SameSite=lax/i);

  const duplicate = await route.POST(
    request("POST", {
      action: "signup",
      username: "RYAN_TEST",
      password: "another-test-password",
      snapshot,
    }),
  );
  assert.equal(duplicate.status, 409);
  const invalidName = await route.POST(
    request("POST", {
      action: "signup",
      username: "not allowed",
      password: "another-test-password",
      snapshot,
    }),
  );
  assert.equal(invalidName.status, 400);
  const invalidSnapshot = await route.POST(
    request("POST", {
      action: "signup",
      username: "invalid_save",
      password: "another-test-password",
      snapshot: {},
    }),
  );
  assert.equal(invalidSnapshot.status, 400);
  assert.equal(
    (
      await database.query(
        "SELECT count(*)::integer AS count FROM ryanos_accounts",
      )
    ).rows[0].count,
    1,
  );

  const signedIn = await route.GET(request("GET", undefined, cookie));
  assert.equal((await signedIn.json()).account.username, "ryan_test");
  assert.equal(
    (await route.PUT(request("PUT", { revision: 1, snapshot }))).status,
    401,
  );
  assert.equal(
    (
      await route.PUT(
        request(
          "PUT",
          { revision: 1, snapshot },
          cookie,
          "https://other.example",
        ),
      )
    ).status,
    403,
  );

  const changed = { ...snapshot, progress: { ...emptyState, lifetimeXP: 42 } };
  const results = await Promise.all([
    route.PUT(request("PUT", { revision: 1, snapshot: changed }, cookie)),
    route.PUT(
      request(
        "PUT",
        {
          revision: 1,
          snapshot: {
            ...changed,
            progress: { ...changed.progress, lifetimeXP: 99 },
          },
        },
        cookie,
      ),
    ),
  ]);
  assert.deepEqual(
    results.map((response) => response.status).sort(),
    [200, 409],
  );
  const conflict = await results
    .find((response) => response.status === 409)
    .json();
  assert.equal(conflict.account.revision, 2);
  const winner = (
    await results.find((response) => response.status === 200).json()
  ).account;
  assert.equal(
    conflict.account.snapshot.progress.lifetimeXP,
    winner.snapshot.progress.lifetimeXP,
  );
  const invalidSave = await route.PUT(
    request(
      "PUT",
      {
        revision: 2,
        snapshot: { ...snapshot, progress: { ...emptyState, lifetimeXP: -1 } },
      },
      cookie,
    ),
  );
  assert.equal(invalidSave.status, 400);

  const wrongPassword = await route.POST(
    request("POST", {
      action: "signin",
      username: "ryan_test",
      password: "wrong-test-password",
    }),
  );
  assert.equal(wrongPassword.status, 401);
  const anotherDevice = await route.POST(
    request("POST", {
      action: "signin",
      username: "RYAN_TEST",
      password: "a-strong-test-password",
    }),
  );
  assert.equal(anotherDevice.status, 200);
  const deviceCookie = cookieFrom(anotherDevice);
  assert.equal(
    (await anotherDevice.json()).account.snapshot.progress.lifetimeXP,
    winner.snapshot.progress.lifetimeXP,
  );

  // A new server module simulates a deployment with the same durable database.
  delete load.cache[load.resolve("../app/lib/server/database.ts")];
  delete load.cache[load.resolve("../app/api/account/route.ts")];
  const redeployedRoute = load("../app/api/account/route.ts");
  const afterDeployment = await redeployedRoute.GET(
    request("GET", undefined, deviceCookie),
  );
  assert.equal(
    (await afterDeployment.json()).account.snapshot.progress.lifetimeXP,
    winner.snapshot.progress.lifetimeXP,
  );

  const secondUser = await route.POST(
    request("POST", {
      action: "signup",
      username: "someone_else",
      password: "a-strong-test-password",
      snapshot,
    }),
  );
  const secondCookie = cookieFrom(secondUser);
  assert.equal(
    (await (await route.GET(request("GET", undefined, secondCookie))).json())
      .account.snapshot.progress.lifetimeXP,
    0,
  );
  assert.equal(
    (await (await route.GET(request("GET", undefined, cookie))).json()).account
      .snapshot.progress.lifetimeXP,
    winner.snapshot.progress.lifetimeXP,
  );

  const signout = await route.POST(
    request("POST", { action: "signout" }, deviceCookie),
  );
  assert.equal(signout.status, 200);
  assert.equal(
    (await (await route.GET(request("GET", undefined, deviceCookie))).json())
      .account,
    null,
  );
  assert.equal(
    (await (await route.GET(request("GET", undefined, cookie))).json()).account
      .username,
    "ryan_test",
  );
  await database.query(
    "UPDATE ryanos_sessions SET expires_at = now() - interval '1 minute'",
  );
  assert.equal(
    (await (await route.GET(request("GET", undefined, cookie))).json()).account,
    null,
  );
});

test("password hashing uses independent salts and checks passwords", async () => {
  assert.equal(normalizeUsername("  Ryan_123  "), "ryan_123");
  assert.throws(() => normalizeUsername("has spaces"));
  const first = await hashPassword("my-long-test-password");
  const second = await hashPassword("my-long-test-password");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("my-long-test-password", first), true);
  assert.equal(await verifyPassword("wrong-test-password", first), false);
  assert.equal(await verifyPassword("my-long-test-password", "invalid"), false);
});

test("sync distinguishes offline edits from conflicts and canonicalizes JSONB ordering", () => {
  const initial = parseSnapshot(snapshot);
  const changed = parseSnapshot({
    ...snapshot,
    progress: { ...emptyState, lifetimeXP: 20 },
  });
  const remote = {
    username: "ryan",
    revision: 2,
    updatedAt: new Date().toISOString(),
    snapshot: changed,
  };
  const metadata = {
    username: "ryan",
    revision: 1,
    baseline: snapshotKey(initial),
  };
  assert.equal(syncDecision(changed, remote, metadata), "synced");
  assert.equal(syncDecision(initial, remote, metadata), "download");
  assert.equal(
    syncDecision(
      changed,
      { ...remote, revision: 1, snapshot: initial },
      metadata,
    ),
    "upload",
  );
  const otherChange = parseSnapshot({
    ...snapshot,
    progress: { ...emptyState, lifetimeXP: 50 },
  });
  assert.equal(syncDecision(otherChange, remote, metadata), "conflict");
  assert.equal(
    syncDecision(otherChange, remote, {
      ...metadata,
      username: "someone_else",
    }),
    "conflict",
  );
  const reordered = {
    preferences: changed.preferences,
    teams: changed.teams,
    progress: Object.fromEntries(Object.entries(changed.progress).reverse()),
    schemaVersion: 1,
  };
  assert.equal(snapshotKey(reordered), snapshotKey(changed));
});

test("local snapshots roll back a partial write", () => {
  const values = new Map();
  let writes = 0;
  let failAt = Infinity;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (++writes === failAt) throw Error("Quota exceeded");
      values.set(key, value);
    },
    removeItem: (key) => values.delete(key),
  };
  writeLocalSnapshot(snapshot);
  const before = readLocalSnapshot();
  failAt = writes + 2;
  assert.throws(() =>
    writeLocalSnapshot({
      ...snapshot,
      progress: { ...emptyState, lifetimeXP: 100 },
    }),
  );
  assert.deepEqual(readLocalSnapshot(), before);
  delete globalThis.localStorage;
});

test("login rate limiting persists across requests", async () => {
  let response;
  for (let attempt = 0; attempt < 16; attempt++)
    response = await route.POST(
      request("POST", {
        action: "signin",
        username: "unknown_person",
        password: "wrong-test-password",
      }),
    );
  assert.equal(response.status, 429);
});

test("reports are durable, retry-safe, and restricted to explicitly configured admins", async () => {
  const reports = load("../app/api/reports/route.ts");
  const created = await route.POST(
    request("POST", {
      action: "signup",
      username: "admin_owner",
      password: "a-strong-test-password",
      snapshot,
    }),
  );
  assert.equal(created.status, 200);
  const cookie = cookieFrom(created);
  const previousAdmins = process.env.ADMIN_USERNAMES;
  process.env.ADMIN_USERNAMES = "admin_owner";
  try {
    const payload = {
      requestId: "12345678-1234-1234-1234-123456789abc",
      category: "bug",
      message: "The visualizer stopped after switching an audio source.",
    };
    const sent = await reports.POST(request("POST", payload));
    assert.equal(sent.status, 200);
    const retry = await reports.POST(request("POST", payload));
    assert.equal(retry.status, 200);
    assert.equal(
      (
        await database.query(
          "SELECT count(*)::integer AS count FROM ryanos_reports",
        )
      ).rows[0].count,
      1,
    );
    const guestInbox = await reports.GET(request("GET"));
    assert.deepEqual(await guestInbox.json(), { admin: false, reports: [] });
    const inbox = await reports.GET(request("GET", undefined, cookie));
    const data = await inbox.json();
    assert.equal(data.admin, true);
    assert.equal(data.reports.length, 1);
    assert.equal(
      (
        await reports.PATCH(
          request("PATCH", { id: payload.requestId, status: "resolved" }),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await reports.PATCH(
          request(
            "PATCH",
            { id: payload.requestId, status: "resolved" },
            cookie,
          ),
        )
      ).status,
      200,
    );
    assert.equal(
      (await (await route.GET(request("GET", undefined, cookie))).json())
        .account.snapshot.progress.lifetimeXP,
      0,
    );
    assert.equal(
      (
        await reports.POST(
          request("POST", {
            ...payload,
            requestId: undefined,
            message: "tiny",
          }),
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await reports.POST(
          request("POST", payload, "", "https://other.example"),
        )
      ).status,
      403,
    );
    const originalFetch = globalThis.fetch;
    const oldTo = process.env.REPORT_EMAIL_TO;
    const oldFrom = process.env.REPORT_EMAIL_FROM;
    try {
      process.env.RESEND_API_KEY = "test-key";
      process.env.REPORT_EMAIL_TO = "owner@example.test";
      process.env.REPORT_EMAIL_FROM = "app@example.test";
      globalThis.fetch = async () => {
        throw Error("Simulated email outage");
      };
      const saved = await reports.POST(
        request("POST", { ...payload, requestId: undefined }),
      );
      assert.equal(saved.status, 200);
      assert.equal((await saved.json()).notification, "failed");
      assert.equal(
        (
          await database.query(
            "SELECT count(*)::integer AS count FROM ryanos_reports",
          )
        ).rows[0].count,
        2,
      );
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.RESEND_API_KEY;
      if (oldTo === undefined) delete process.env.REPORT_EMAIL_TO;
      else process.env.REPORT_EMAIL_TO = oldTo;
      if (oldFrom === undefined) delete process.env.REPORT_EMAIL_FROM;
      else process.env.REPORT_EMAIL_FROM = oldFrom;
    }
  } finally {
    if (previousAdmins === undefined) delete process.env.ADMIN_USERNAMES;
    else process.env.ADMIN_USERNAMES = previousAdmins;
  }
});
