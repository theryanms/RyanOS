"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ModuleCard from "./components/ModuleCard";
import QuestCard from "./components/QuestCard";
import StatsPanel from "./components/StatsPanel";
import XPBar from "./components/XPBar";
import TrainerHub from "./components/TrainerHub";
import Visualizer from "./components/Visualizer";
import TerminalPanel from "./components/TerminalPanel";
import QuestOptions from "./components/QuestOptions";
import ThemePicker from "./components/ThemePicker";
import AccountPanel from "./components/AccountPanel";
import {
  defaultPreferences,
  notifyLocalChange,
  parsePreferences,
  preferencesKey,
  type Preferences,
} from "./lib/preferences";
import {
  parseSnapshot,
  writeLocalSnapshot,
  type SaveSnapshot,
} from "./lib/snapshot";
import { downloadFile } from "./lib/files";
import {
  teamStorageKey,
  importTeam,
  exportTeam,
  parseTeams,
  type Team,
  type Species,
} from "./lib/trainer";
import {
  calculateLevel,
  currentLevelXP,
  xpForCurrentLevel,
  xpForNextLevel,
} from "./lib/leveling";
import {
  createWeeklyQuests,
  DAILY_COMPLETION_BONUS,
  emptyState,
  migrateState,
  QuestGroup,
  refreshQuestPeriods,
  rerollDailyQuest,
  RyanOSState,
  STORAGE_KEY,
  toggleQuestInState,
  WEEKLY_COMPLETION_BONUS,
  WeeklyFocus,
  weeklyFocusOptions,
} from "./lib/quests";

const modules = [
  {
    name: "Quest Log",
    subtitle: "Pixel RPG Life Tracker",
    status: "Primary System",
    accent: "from-emerald-400 to-lime-300",
    symbol: "⚔",
  },
  {
    name: "Trainer Hub",
    subtitle: "Pokémon Draft Dashboard",
    status: "Ready",
    accent: "from-red-400 to-yellow-300",
    symbol: "◉",
  },
  {
    name: "Visualizer",
    subtitle: "Laser + Space Music Mode",
    status: "Ready",
    accent: "from-fuchsia-400 to-cyan-300",
    symbol: "▰",
  },
  {
    name: "Terminal",
    subtitle: "Commands + Focus Tools",
    status: "Online",
    accent: "from-green-400 to-teal-300",
    symbol: ">_",
  },
];

export default function Home() {
  const [activeModule, setActiveModule] = useState("quests");
  const [storageMessage, setStorageMessage] = useState("");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [trainerEpoch, setTrainerEpoch] = useState(0);
  const progressReadFailed = useRef(false);
  const [appState, setAppState] = useState<RyanOSState>(emptyState);

  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);

  useEffect(() => {
    try {
      // Browser preferences are loaded alongside saved progress after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreferences(
        parsePreferences(
          JSON.parse(localStorage.getItem(preferencesKey) ?? "null"),
        ),
      );
    } catch {
      setPreferences(defaultPreferences);
    }
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);

      if (savedState) {
        const parsedState = JSON.parse(savedState) as Partial<RyanOSState>;

        const migratedState = migrateState(parsedState);

        // Hydrate browser-only saved progress after the initial render.
        setAppState(refreshQuestPeriods(migratedState));
      } else {
        setAppState(refreshQuestPeriods(emptyState));
      }
    } catch (error) {
      progressReadFailed.current = true;
      console.error("Could not load RyanOS progress:", error);

      setAppState(refreshQuestPeriods(emptyState));
      setStorageMessage(
        "Saved progress could not be loaded. Export a backup before making changes.",
      );
    } finally {
      setHasLoadedSavedData(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedData) {
      return;
    }
    if (progressReadFailed.current) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      notifyLocalChange();
    } catch (error) {
      console.error("Could not save RyanOS progress:", error);
      // Report a storage failure while keeping in-memory progress available.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStorageMessage(
        "Saving failed. Download a backup before closing RyanOS.",
      );
    }
  }, [appState, hasLoadedSavedData, storageMessage]);

  useEffect(() => {
    function changed(event: StorageEvent) {
      try {
        if (event.key === STORAGE_KEY && event.newValue)
          setAppState(
            refreshQuestPeriods(migrateState(JSON.parse(event.newValue))),
          );
        if (event.key === preferencesKey)
          setPreferences(
            parsePreferences(JSON.parse(event.newValue ?? "null")),
          );
        if (event.key === teamStorageKey) setTrainerEpoch((value) => value + 1);
      } catch {
        setStorageMessage(
          "Another tab changed saved data, but it could not be loaded. Download a backup before restoring.",
        );
      }
    }
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);

  const changePreferences = useCallback((value: Preferences) => {
    const next = parsePreferences(value);
    setPreferences(next);
    try {
      localStorage.setItem(preferencesKey, JSON.stringify(next));
      notifyLocalChange();
    } catch {
      setStorageMessage("Preferences could not be saved on this device.");
    }
  }, []);

  const applySnapshot = useCallback((value: SaveSnapshot) => {
    const snapshot = parseSnapshot(value);
    writeLocalSnapshot(snapshot);
    progressReadFailed.current = false;
    setAppState(refreshQuestPeriods(snapshot.progress));
    setPreferences(snapshot.preferences);
    setTrainerEpoch((epoch) => epoch + 1);
    setStorageMessage("");
    notifyLocalChange();
  }, []);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      setAppState((currentState) => refreshQuestPeriods(currentState));
    }, 60000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, []);

  const level = calculateLevel(appState.lifetimeXP);

  const xpIntoLevel = currentLevelXP(appState.lifetimeXP);

  const xpNeededThisLevel = xpForNextLevel(level) - xpForCurrentLevel(level);

  const dailyCompleted = appState.dailyQuests.filter(
    (quest) => quest.completed,
  ).length;

  const weeklyCompleted = appState.weeklyQuests.filter(
    (quest) => quest.completed,
  ).length;

  const recentHistory = [...appState.questHistory].reverse().slice(0, 5);

  function toggleQuest(questId: string, group: QuestGroup) {
    setAppState((currentState) =>
      toggleQuestInState(currentState, questId, group),
    );
  }

  function handleReroll(questId: string) {
    setAppState((currentState) => rerollDailyQuest(currentState, questId));
  }

  function selectWeeklyFocus(focus: WeeklyFocus) {
    setAppState((currentState) => {
      const refreshed = refreshQuestPeriods(currentState);
      if (
        refreshed.weeklyBonusAwarded ||
        refreshed.weeklyQuests.some((q) => q.completed)
      )
        return refreshed;
      return {
        ...refreshed,
        weeklyFocus: focus,
        weeklyQuests: createWeeklyQuests(focus, refreshed.weekKey),
      };
    });
  }

  function backup() {
    const rawTeams = localStorage.getItem(teamStorageKey);
    let teams = [];
    try {
      teams = JSON.parse(rawTeams ?? "[]");
    } catch {
      /* Preserve unreadable storage in the backup for recovery. */
    }
    downloadFile(
      `ryanos-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(
        {
          version: 1,
          progress: appState,
          teams,
          rawTeams,
          rawProgress: localStorage.getItem(STORAGE_KEY),
          preferences,
        },
        null,
        2,
      ),
      "application/json",
    );
  }

  async function restore(file: File) {
    try {
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !data.progress || !Array.isArray(data.teams))
        throw Error("Choose a RyanOS backup file.");
      const progress = migrateState(data.progress);
      if (
        !Number.isFinite(progress.lifetimeXP) ||
        progress.lifetimeXP < 0 ||
        !Array.isArray(data.progress.dailyQuests) ||
        !Array.isArray(data.progress.weeklyQuests)
      )
        throw Error("Backup progress is invalid.");
      const response = await fetch("/data/pokedex.json");
      if (!response.ok)
        throw Error("Could not load species data to validate this backup.");
      const dex: Record<string, Species> = await response.json();
      const restoredTeams: Team[] = parseTeams(data.teams).map((t: Team) => {
        if (
          typeof t.name !== "string" ||
          typeof t.format !== "string" ||
          typeof t.notes !== "string" ||
          !Array.isArray(t.members) ||
          t.members.length > 6
        )
          throw Error("Backup contains an invalid team.");
        return {
          ...t,
          id: crypto.randomUUID(),
          members: t.members.length ? importTeam(exportTeam(t), dex) : [],
        };
      });
      if (
        !window.confirm(
          "Replace progress and teams with this backup? Download a current backup first if you need it.",
        )
      )
        return;
      writeLocalSnapshot({
        schemaVersion: 1,
        progress,
        teams: restoredTeams,
        preferences: parsePreferences(data.preferences),
      });
      window.location.reload();
    } catch (error) {
      setStorageMessage(`Restore failed. ${(error as Error).message}`);
    }
  }

  function runAppCommand(command: string, argument: string) {
    const numbered = [
      ...appState.dailyQuests.map((q) => ({
        quest: q,
        group: "daily" as QuestGroup,
      })),
      ...appState.weeklyQuests.map((q) => ({
        quest: q,
        group: "weekly" as QuestGroup,
      })),
    ];
    if (command === "stats")
      return `Level ${level} · ${appState.lifetimeXP} XP\nDaily streak ${appState.dailyStreak} · Weekly streak ${appState.weeklyStreak}\n${Object.entries(
        appState.stats,
      )
        .map(([key, value]) => `${key} ${value}`)
        .join(" · ")}`;
    if (command === "quests")
      return numbered
        .map(
          ({ quest, group }, i) =>
            `${i + 1}. [${quest.completed ? "x" : " "}] ${quest.title} · ${group} · ${quest.xp} XP`,
        )
        .join("\n");
    if (["done", "undo", "reroll"].includes(command)) {
      const index = Number(argument);
      const entry = numbered[index - 1];
      if (!Number.isInteger(index) || !entry)
        throw Error("Use a quest number from the quests command.");
      if (command === "reroll") {
        if (
          entry.group !== "daily" ||
          entry.quest.completed ||
          appState.dailyRerollsRemaining < 1 ||
          entry.quest.id.startsWith("custom-")
        )
          throw Error(
            "Choose an incomplete generated daily quest with a reroll remaining.",
          );
        handleReroll(entry.quest.id);
        return "Daily quest rerolled. Run quests to see the replacement.";
      }
      if (entry.quest.completed === (command === "done"))
        return "Quest already has that status.";
      toggleQuest(entry.quest.id, entry.group);
      return `${entry.quest.title} ${command === "done" ? "completed" : "reopened"}. XP updated.`;
    }
    if (command === "focus") {
      const focus = weeklyFocusOptions.find(
        (f) => f.toLowerCase() === argument.toLowerCase(),
      );
      if (!focus) throw Error(`Choose ${weeklyFocusOptions.join(", ")}.`);
      if (weeklyCompleted || appState.weeklyBonusAwarded)
        throw Error("Weekly focus is locked once a weekly quest is completed.");
      selectWeeklyFocus(focus);
      return `${focus} weekly quests selected.`;
    }
    if (command === "open") {
      if (!["quests", "trainer", "visualizer", "terminal"].includes(argument))
        throw Error("Choose quests, trainer, visualizer, or terminal.");
      setActiveModule(argument);
      return `Opened ${argument}.`;
    }
    if (command === "backup") {
      backup();
      return "Backup download started.";
    }
    return `Unknown command: ${command}. Type help.`;
  }

  function changeWeeklyFocus() {
    if (weeklyCompleted > 0 || appState.weeklyBonusAwarded) {
      return;
    }

    setAppState((currentState) => ({
      ...currentState,
      weeklyFocus: null,
      weeklyQuests: [],
    }));
  }

  return (
    <main
      data-theme={preferences.theme}
      className="app-shell min-h-screen overflow-hidden text-zinc-100"
    >
      <div className="theme-ambient pointer-events-none fixed inset-0" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6">
        <header className="app-header mb-6 rounded-3xl border p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
                RyanOS
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Command Hub
              </h1>

              <p className="mt-1 text-xs text-zinc-500">
                {appState.lifetimeXP} lifetime XP
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-right">
              <p className="text-xs text-emerald-200">LVL</p>

              <p className="text-2xl font-black text-emerald-300">
                {String(level).padStart(2, "0")}
              </p>
            </div>
          </div>

          <XPBar currentXP={xpIntoLevel} nextLevelXP={xpNeededThisLevel} />
          <div className="mt-5 border-t border-white/10 pt-4">
            <ThemePicker
              preferences={preferences}
              onChange={changePreferences}
            />
          </div>
        </header>

        {hasLoadedSavedData && <AccountPanel onApply={applySnapshot} />}

        <section className="mb-5">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-black">Active Modules</h2>

            <p className="text-xs uppercase tracking-widest text-zinc-500">
              v1.0
            </p>
          </div>

          <nav
            aria-label="Modules"
            className="grid grid-cols-2 gap-3 md:grid-cols-4"
          >
            {modules.map((item, index) => (
              <button
                type="button"
                aria-pressed={
                  activeModule ===
                  ["quests", "trainer", "visualizer", "terminal"][index]
                }
                className={`rounded-3xl text-left transition hover:bg-white/5 ${activeModule === ["quests", "trainer", "visualizer", "terminal"][index] ? "ring-2 ring-emerald-300/60" : ""}`}
                key={item.name}
                onClick={() =>
                  setActiveModule(
                    ["quests", "trainer", "visualizer", "terminal"][index],
                  )
                }
              >
                <ModuleCard
                  key={item.name}
                  title={item.name}
                  subtitle={item.subtitle}
                  status={item.status}
                  symbol={item.symbol}
                  accent={item.accent}
                />
              </button>
            ))}
          </nav>
        </section>

        {storageMessage && (
          <p className="notice mb-4" role="alert">
            {storageMessage}
          </p>
        )}
        {!hasLoadedSavedData && <p role="status">Loading your progress…</p>}
        <div hidden={activeModule !== "quests" || !hasLoadedSavedData}>
          <QuestOptions
            state={appState}
            onChange={(update) =>
              setAppState((s) => update(refreshQuestPeriods(s)))
            }
          />

          <StatsPanel
            stats={appState.stats}
            dailyStreak={appState.dailyStreak}
            weeklyStreak={appState.weeklyStreak}
            dailyRerollsRemaining={appState.dailyRerollsRemaining}
          />

          <section className="mb-5 rounded-3xl border border-lime-300/20 bg-lime-300/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-black">Daily Maintenance</h2>

                <p className="text-xs text-lime-300">
                  {dailyCompleted}/{appState.dailyQuests.length} completed
                </p>
              </div>

              <div className="text-right">
                <span className="rounded-xl bg-lime-300/10 px-2 py-1 text-xs font-bold text-lime-300">
                  Resets daily
                </span>

                <p className="mt-2 text-[10px] text-zinc-500">
                  Full clear: +{DAILY_COMPLETION_BONUS} XP
                </p>
              </div>
            </div>

            {appState.dailyBonusAwarded && (
              <div className="mb-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-center">
                <p className="text-sm font-black text-emerald-300">
                  Daily clear complete
                </p>

                <p className="mt-1 text-xs text-zinc-400">
                  +{DAILY_COMPLETION_BONUS} bonus XP awarded
                </p>
              </div>
            )}

            <div className="space-y-3">
              {appState.dailyQuests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  group="daily"
                  canReroll={appState.dailyRerollsRemaining > 0}
                  onToggle={() => toggleQuest(quest.id, "daily")}
                  onReroll={() => handleReroll(quest.id)}
                />
              ))}
            </div>
          </section>

          <section className="mb-5 rounded-3xl border border-fuchsia-300/20 bg-fuchsia-300/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-black">Weekly Focus</h2>

                {appState.weeklyFocus ? (
                  <p className="text-xs text-fuchsia-300">
                    {appState.weeklyFocus} · {weeklyCompleted}/
                    {appState.weeklyQuests.length} completed
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Choose this week&apos;s mission
                  </p>
                )}
              </div>

              <div className="text-right">
                {appState.weeklyFocus &&
                  weeklyCompleted === 0 &&
                  !appState.weeklyBonusAwarded && (
                    <button
                      type="button"
                      onClick={changeWeeklyFocus}
                      className="rounded-xl border border-fuchsia-300/20 px-3 py-1 text-xs font-bold text-fuchsia-300 transition active:scale-95"
                    >
                      Change
                    </button>
                  )}

                <p className="mt-2 text-[10px] text-zinc-500">
                  Full clear: +{WEEKLY_COMPLETION_BONUS} XP
                </p>
              </div>
            </div>

            {appState.weeklyBonusAwarded && (
              <div className="mb-3 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 p-3 text-center">
                <p className="text-sm font-black text-fuchsia-300">
                  Weekly focus complete
                </p>

                <p className="mt-1 text-xs text-zinc-400">
                  +{WEEKLY_COMPLETION_BONUS} bonus XP awarded
                </p>
              </div>
            )}

            {!appState.weeklyFocus ? (
              <div>
                <p className="mb-3 text-sm text-zinc-400">
                  What do you want to focus on this week?
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {weeklyFocusOptions.map((focus) => (
                    <button
                      key={focus}
                      type="button"
                      onClick={() => selectWeeklyFocus(focus)}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-bold transition hover:border-fuchsia-300/40 hover:bg-fuchsia-300/10 active:scale-95"
                    >
                      {focus}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {appState.weeklyQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    group="weekly"
                    onToggle={() => toggleQuest(quest.id, "weekly")}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="mb-5 rounded-3xl border border-blue-300/20 bg-blue-300/4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-black">Recent Activity</h2>

                <p className="text-xs text-blue-300">Latest completed quests</p>
              </div>

              <span className="rounded-xl bg-blue-300/10 px-2 py-1 text-xs font-bold text-blue-300">
                {appState.questHistory.length}
              </span>
            </div>

            {recentHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-center">
                <p className="text-sm text-zinc-500">
                  Complete a quest to begin your activity log.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-zinc-200">
                        {entry.title}
                      </p>

                      <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
                        {entry.type} · {entry.period}
                      </p>
                    </div>

                    <span className="shrink-0 text-sm font-black text-blue-300">
                      +{entry.xp} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
        <div hidden={activeModule !== "trainer"}>
          <TrainerHub key={trainerEpoch} />
        </div>
        {activeModule === "visualizer" && (
          <Visualizer preferences={preferences} onChange={changePreferences} />
        )}
        <div hidden={activeModule !== "terminal"}>
          <TerminalPanel runAppCommand={runAppCommand} />
        </div>
        <footer className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 py-4 text-xs text-zinc-400">
          <span className="mr-auto">RyanOS · Device saves + account sync</span>
          <button
            className="action"
            onClick={() => {
              try {
                backup();
                setStorageMessage("Backup downloaded.");
              } catch {
                setStorageMessage(
                  "Backup failed. Browser storage could not be read.",
                );
              }
            }}
          >
            Download backup
          </button>
          <label className="action cursor-pointer">
            Restore backup
            <input
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void restore(file);
                e.target.value = "";
              }}
            />
          </label>
        </footer>
      </section>
    </main>
  );
}
