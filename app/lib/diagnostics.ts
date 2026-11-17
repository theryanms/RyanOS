import { downloadFile } from "./files";
import { preferencesKey } from "./preferences";
import { STORAGE_KEY } from "./quests";
import { teamStorageKey } from "./trainer";
import { readLocalSnapshot } from "./snapshot";

export const APP_VERSION = "1.2.0";
export const syncRequestEvent = "ryanos-sync-request";
export const logKey = "ryanos-diagnostics-v1";
type LogEntry = { time: string; message: string };

export function recentErrors(): LogEntry[] {
  try {
    const entries = JSON.parse(sessionStorage.getItem(logKey) ?? "[]");
    return Array.isArray(entries) ? entries.slice(-30) : [];
  } catch {
    return [];
  }
}
export function recordError(value: unknown) {
  const message = (value instanceof Error ? value.message : String(value))
    .replace(/https?:\/\/[^\s]+/g, (url) => {
      try {
        const parsed = new URL(url);
        return parsed.origin + parsed.pathname;
      } catch {
        return "[URL]";
      }
    })
    .slice(0, 500);
  try {
    sessionStorage.setItem(
      logKey,
      JSON.stringify(
        [...recentErrors(), { time: new Date().toISOString(), message }].slice(
          -30,
        ),
      ),
    );
  } catch {
    /* Diagnostics must not interrupt recovery. */
  }
}
export function deviceBackup() {
  try {
    downloadFile(
      "ryanos-backup.json",
      JSON.stringify({ version: 1, ...readLocalSnapshot() }, null, 2),
      "application/json",
    );
  } catch {
    const raw = Object.fromEntries(
      [STORAGE_KEY, teamStorageKey, preferencesKey].map((key) => [
        key,
        localStorage.getItem(key),
      ]),
    );
    downloadFile(
      "ryanos-recovery-data.json",
      JSON.stringify({ kind: "ryanos-recovery", raw }, null, 2),
      "application/json",
    );
  }
}
export function storageSummary() {
  return [STORAGE_KEY, teamStorageKey, preferencesKey]
    .map(
      (key) =>
        `${key}: ${new Blob([localStorage.getItem(key) ?? ""]).size.toLocaleString()} bytes`,
    )
    .join("\n");
}
export async function doctor() {
  const checks = [
    `RyanOS ${APP_VERSION}`,
    navigator.onLine ? "Browser network: online" : "Browser network: offline",
  ];
  try {
    const snapshot = readLocalSnapshot();
    checks.push(
      `Device save: valid · ${snapshot.progress.lifetimeXP} XP · ${snapshot.teams.length} teams`,
    );
  } catch (error) {
    checks.push(`Device save needs attention: ${(error as Error).message}`);
  }
  try {
    const key = "ryanos-storage-test";
    localStorage.setItem(key, "ok");
    localStorage.removeItem(key);
    checks.push("Browser storage: writable");
  } catch {
    checks.push("Browser storage: unavailable or full. Download a backup.");
  }
  const start = performance.now();
  try {
    const response = await fetch("/api/health", {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const health = await response.json();
    checks.push(
      `Server: ${response.status} · ${Math.round(performance.now() - start)} ms`,
      `Cloud database: ${health.database}`,
    );
  } catch {
    checks.push("Server: unreachable. Device saves remain available.");
  }
  checks.push(
    `Recent errors: ${recentErrors().length}`,
    "Recovery options: backup, safe, sync, repair, reload. If the whole page freezes, reopen /?safe=1.",
  );
  return checks.join("\n");
}

export function reportDiagnostics() {
  return {
    version: APP_VERSION,
    browser: navigator.userAgent,
    path: window.location.pathname,
    errors: recentErrors().slice(-10),
  };
}
