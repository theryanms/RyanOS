import {
  emptyState,
  migrateState,
  STORAGE_KEY,
  type RyanOSState,
} from "./quests";
import { parseTeams, teamStorageKey, type Team } from "./trainer";
import {
  defaultPreferences,
  parsePreferences,
  preferencesKey,
  type Preferences,
} from "./preferences";

export type SaveSnapshot = {
  schemaVersion: 1;
  progress: RyanOSState;
  teams: Team[];
  preferences: Preferences;
};
export type CloudSave = {
  username: string;
  revision: number;
  updatedAt: string;
  snapshot: SaveSnapshot;
};
export const syncMetadataKey = "ryanos-sync-v1";
export type SyncMetadata = {
  username: string;
  revision: number;
  baseline: string;
};

export function parseSnapshot(value: unknown): SaveSnapshot {
  if (!value || typeof value !== "object") throw Error("Invalid save data.");
  const data = value as Partial<SaveSnapshot>;
  if (
    data.schemaVersion !== 1 ||
    !data.progress ||
    !Array.isArray(data.teams) ||
    data.teams.length > 100
  )
    throw Error("Unsupported save format.");
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 1_000_000)
    throw Error(
      "This save is too large. Export a backup and reduce the number of teams or notes.",
    );
  return {
    schemaVersion: 1,
    progress: migrateState(data.progress),
    teams: parseTeams(data.teams),
    preferences: parsePreferences(data.preferences),
  };
}

export function readLocalSnapshot(): SaveSnapshot {
  return parseSnapshot({
    schemaVersion: 1,
    progress: JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(emptyState),
    ),
    teams: JSON.parse(localStorage.getItem(teamStorageKey) ?? "[]"),
    preferences: JSON.parse(
      localStorage.getItem(preferencesKey) ??
        JSON.stringify(defaultPreferences),
    ),
  });
}

export function writeLocalSnapshot(snapshot: SaveSnapshot) {
  const entries = [
    [STORAGE_KEY, JSON.stringify(snapshot.progress)],
    [teamStorageKey, JSON.stringify(snapshot.teams)],
    [preferencesKey, JSON.stringify(snapshot.preferences)],
  ];
  const previous = entries.map(
    ([key]) => [key, localStorage.getItem(key)] as const,
  );
  try {
    for (const [key, value] of entries) localStorage.setItem(key, value);
  } catch (error) {
    for (const [key] of entries) localStorage.removeItem(key);
    for (const [key, value] of previous)
      if (value !== null) localStorage.setItem(key, value);
    throw error;
  }
}

export function snapshotKey(snapshot: SaveSnapshot) {
  return JSON.stringify(snapshot, (_key, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
        )
      : value,
  );
}

export function readSyncMetadata(): SyncMetadata | null {
  try {
    const data = JSON.parse(localStorage.getItem(syncMetadataKey) ?? "null");
    return data &&
      typeof data.username === "string" &&
      Number.isSafeInteger(data.revision) &&
      typeof data.baseline === "string"
      ? data
      : null;
  } catch {
    return null;
  }
}

export function syncDecision(
  local: SaveSnapshot,
  remote: CloudSave,
  metadata: SyncMetadata | null,
) {
  const localKey = snapshotKey(local);
  if (localKey === snapshotKey(remote.snapshot)) return "synced";
  if (metadata?.username !== remote.username) return "conflict";
  if (localKey === metadata.baseline) return "download";
  if (metadata.revision === remote.revision) return "upload";
  return "conflict";
}
