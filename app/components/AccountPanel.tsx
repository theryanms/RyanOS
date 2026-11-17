"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { downloadFile } from "../lib/files";
import { localChangeEvent } from "../lib/preferences";
import { syncRequestEvent } from "../lib/diagnostics";
import {
  parseSnapshot,
  readLocalSnapshot,
  readSyncMetadata,
  snapshotKey,
  syncDecision,
  syncMetadataKey,
  type CloudSave,
  type SaveSnapshot,
} from "../lib/snapshot";

function parseAccount(value: unknown): CloudSave {
  if (!value || typeof value !== "object")
    throw Error("Invalid account response.");
  const data = value as CloudSave;
  if (
    typeof data.username !== "string" ||
    !Number.isSafeInteger(data.revision) ||
    typeof data.updatedAt !== "string"
  )
    throw Error("Invalid account response.");
  return { ...data, snapshot: parseSnapshot(data.snapshot) };
}

export default function AccountPanel({
  onApply,
}: {
  onApply: (snapshot: SaveSnapshot) => void;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [account, setAccount] = useState<CloudSave | null>(null);
  const [conflict, setConflict] = useState<CloudSave | null>(null);
  const [status, setStatus] = useState("Checking cloud saving…");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const cloud = useRef<CloudSave | null>(null);
  const baseline = useRef("");
  const blocked = useRef(true);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncAction = useRef<(force?: boolean) => Promise<void>>(async () => {});

  function remember(record: CloudSave) {
    cloud.current = record;
    baseline.current = snapshotKey(record.snapshot);
    localStorage.setItem(
      syncMetadataKey,
      JSON.stringify({
        username: record.username,
        revision: record.revision,
        baseline: baseline.current,
      }),
    );
    setAccount(record);
    setWelcome(false);
  }

  const acceptCloud = useCallback(
    (record: CloudSave, collapse = false) => {
      blocked.current = true;
      try {
        onApply(record.snapshot);
        remember(record);
        blocked.current = false;
        setConflict(null);
        if (collapse) setExpanded(false);
        setStatus("Synced across devices.");
      } catch (error) {
        cloud.current = record;
        setAccount(record);
        setConflict(record);
        setStatus((error as Error).message);
      }
    },
    [onApply],
  );

  const save = useCallback(async (force = false) => {
    const current = cloud.current;
    if (!current || (blocked.current && !force) || inFlight.current) return;
    const token = generation.current;
    let followUp = false;
    inFlight.current = true;
    setBusy(true);
    try {
      const snapshot = readLocalSnapshot();
      if (!force && snapshotKey(snapshot) === baseline.current) {
        setStatus("Synced across devices.");
        return;
      }
      setStatus("Saving to your account…");
      const body = JSON.stringify({ revision: current.revision, snapshot });
      const response = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: new Blob([body]).size < 60_000,
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!mounted.current || token !== generation.current) return;
      if (response.status === 409) {
        const latest = parseAccount(data.account);
        if (snapshotKey(latest.snapshot) === snapshotKey(readLocalSnapshot())) {
          remember(latest);
          blocked.current = false;
          setConflict(null);
          if (force) setExpanded(false);
          setStatus("Synced across devices.");
          return;
        }
        cloud.current = latest;
        blocked.current = true;
        setAccount(latest);
        setConflict(latest);
        setStatus("Another device has changes. Choose a save below.");
        return;
      }
      if (response.status === 401) {
        blocked.current = true;
        cloud.current = null;
        setAccount(null);
        throw Error("Your session expired. Sign in to resume saving.");
      }
      if (!response.ok)
        throw Error(data.error ?? "Could not save. Try again when connected.");
      remember(parseAccount(data.account));
      blocked.current = false;
      setConflict(null);
      if (force) setExpanded(false);
      followUp = snapshotKey(readLocalSnapshot()) !== baseline.current;
      setStatus(
        followUp ? "New changes waiting to sync…" : "Synced across devices.",
      );
    } catch (error) {
      if (mounted.current && token === generation.current)
        setStatus(
          `${(error as Error).message} Device changes are kept for retry.`,
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
      if (followUp && mounted.current)
        syncTimer.current = setTimeout(() => void syncAction.current(), 750);
    }
  }, []);
  useEffect(() => {
    syncAction.current = save;
  }, [save]);

  useEffect(() => {
    mounted.current = true;
    async function refresh() {
      if (inFlight.current || conflict || document.visibilityState === "hidden")
        return;
      const token = generation.current;
      inFlight.current = true;
      setBusy(true);
      try {
        const response = await fetch("/api/account", {
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        const data = await response.json();
        if (!mounted.current || token !== generation.current) return;
        if (!response.ok)
          throw Error(data.error ?? "Cloud saving is temporarily unavailable.");
        setConfigured(data.configured);
        if (!data.account) {
          blocked.current = true;
          cloud.current = null;
          setAccount(null);
          if (
            data.configured &&
            localStorage.getItem("ryanos-guest-mode") !== "1"
          ) {
            setWelcome(true);
            setExpanded(true);
          }
          setStatus(
            data.configured
              ? "Sign in to save across devices."
              : "Cloud saving is waiting for the site owner to connect storage.",
          );
          return;
        }
        const record = parseAccount(data.account);
        const local = readLocalSnapshot();
        const metadata =
          cloud.current?.username === record.username
            ? {
                username: record.username,
                revision: cloud.current.revision,
                baseline: baseline.current,
              }
            : readSyncMetadata();
        const decision = syncDecision(local, record, metadata);
        if (decision === "synced") {
          remember(record);
          blocked.current = false;
          setStatus("Synced across devices.");
        } else if (decision === "download") acceptCloud(record);
        else if (decision === "upload" && metadata) {
          cloud.current = record;
          baseline.current = metadata.baseline;
          blocked.current = false;
          setAccount(record);
          syncTimer.current = setTimeout(() => void syncAction.current(), 0);
        } else {
          cloud.current = record;
          blocked.current = true;
          setAccount(record);
          setConflict(record);
          setStatus("Choose your account save or this device’s progress.");
        }
      } catch (error) {
        if (mounted.current && token === generation.current)
          setStatus(
            `${(error as Error).message} Progress remains on this device.`,
          );
      } finally {
        inFlight.current = false;
        if (mounted.current) setBusy(false);
      }
    }
    function changed() {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      if (!blocked.current && cloud.current) {
        setStatus("Changes waiting to sync…");
        syncTimer.current = setTimeout(() => void syncAction.current(), 750);
      }
    }
    function visibilityChanged() {
      if (document.visibilityState === "hidden") void syncAction.current();
      else void refresh();
    }
    function syncRequested() {
      void syncAction.current();
      void refresh();
    }
    void refresh();
    const interval = setInterval(() => {
      if (!blocked.current && cloud.current) void syncAction.current();
      void refresh();
    }, 30000);
    window.addEventListener(localChangeEvent, changed);
    window.addEventListener(syncRequestEvent, syncRequested);
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      mounted.current = false;
      clearInterval(interval);
      if (syncTimer.current) clearTimeout(syncTimer.current);
      window.removeEventListener(localChangeEvent, changed);
      window.removeEventListener(syncRequestEvent, syncRequested);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [acceptCloud, conflict]);

  async function authenticate() {
    if (inFlight.current) return;
    if (mode === "signup" && password !== confirmation) {
      setStatus("The passwords do not match.");
      return;
    }
    generation.current++;
    inFlight.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          username,
          password,
          snapshot: mode === "signup" ? readLocalSnapshot() : undefined,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? "Sign in failed.");
      const record = parseAccount(data.account);
      setPassword("");
      setConfirmation("");
      if (mode === "signup") {
        remember(record);
        setExpanded(false);
        blocked.current = false;
        setStatus("Account created. Your device progress is saved.");
      } else {
        cloud.current = record;
        setAccount(record);
        blocked.current = true;
        setConflict(record);
        setStatus("Choose the save you want to continue with.");
      }
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function signOut() {
    if (inFlight.current) return;
    await save();
    if (inFlight.current) return;
    generation.current++;
    inFlight.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signout" }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw Error("Sign out failed. Please retry.");
      cloud.current = null;
      blocked.current = true;
      setAccount(null);
      localStorage.setItem("ryanos-guest-mode", "1");
      setConflict(null);
      setStatus("Signed out. Your device copy is kept.");
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <details
      className={`panel account-bar mb-4 ${account ? "signed-in" : ""}`}
      open={expanded || Boolean(conflict)}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="cursor-pointer font-bold">
        {account ? `Account · ${account.username}` : "Account & cloud saves"}
        <span className="muted ml-3">{status}</span>
      </summary>
      <p className="mt-3 text-sm" role="status">
        {status}
      </p>
      {!account && (
        <div className="my-4 flex flex-wrap items-center gap-3">
          <p className="muted">
            {welcome
              ? "Welcome to RyanOS. Sign in for cross-device saves, or continue with a device save."
              : "Guest progress saves in this browser."}
          </p>
          <button
            className="action"
            onClick={() => {
              localStorage.setItem("ryanos-guest-mode", "1");
              setWelcome(false);
              setExpanded(false);
            }}
          >
            Continue as guest · stop this prompt
          </button>
        </div>
      )}
      {account ? (
        <>
          <p className="muted mt-2">
            Quests, XP, teams, theme, and visualizer preferences save to this
            username.
          </p>
          {conflict && (
            <div className="notice mt-3 space-y-3">
              <p>
                Account save · {conflict.snapshot.progress.lifetimeXP} XP ·{" "}
                {conflict.snapshot.teams.length} teams ·{" "}
                {new Date(conflict.updatedAt).toLocaleString()}
              </p>
              <p>
                Selecting a copy replaces the other copy. You can download both
                before choosing.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="action"
                  disabled={busy}
                  onClick={() => acceptCloud(conflict, true)}
                >
                  Load account save
                </button>
                <button
                  className="action"
                  disabled={busy}
                  onClick={() => void save(true)}
                >
                  Use this device’s progress
                </button>
                <button
                  className="action"
                  onClick={() =>
                    downloadFile(
                      "ryanos-cloud-backup.json",
                      JSON.stringify(
                        { version: 1, ...conflict.snapshot },
                        null,
                        2,
                      ),
                      "application/json",
                    )
                  }
                >
                  Download account copy
                </button>
                <button
                  className="action"
                  onClick={() => {
                    try {
                      downloadFile(
                        "ryanos-device-backup.json",
                        JSON.stringify(
                          { version: 1, ...readLocalSnapshot() },
                          null,
                          2,
                        ),
                        "application/json",
                      );
                    } catch (error) {
                      setStatus((error as Error).message);
                    }
                  }}
                >
                  Download device copy
                </button>
              </div>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              className="action"
              disabled={busy || Boolean(conflict)}
              onClick={() => void save()}
            >
              Sync now
            </button>
            <button
              className="action"
              disabled={busy}
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        </>
      ) : (
        configured && (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void authenticate();
            }}
          >
            <div className="flex gap-2">
              <button
                type="button"
                className={`tab ${mode === "signin" ? "selected" : ""}`}
                onClick={() => setMode("signin")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`tab ${mode === "signup" ? "selected" : ""}`}
                onClick={() => setMode("signup")}
              >
                Create account
              </button>
            </div>
            <p className="muted">
              Usernames are unique, ignoring capitalization.{" "}
              {mode === "signup"
                ? "Creating an account uploads this device’s current progress and teams."
                : "Use the same account on your other devices."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Username
                <input
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  minLength={3}
                  maxLength={24}
                  pattern="[A-Za-z0-9_]{3,24}"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  minLength={10}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </div>
            {mode === "signup" && (
              <label>
                Confirm password
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </label>
            )}
            <button className="action" disabled={busy}>
              {busy
                ? "Working…"
                : mode === "signup"
                  ? "Create account & save progress"
                  : "Sign in"}
            </button>
          </form>
        )
      )}
    </details>
  );
}
