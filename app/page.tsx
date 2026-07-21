"use client";

import { useEffect, useState } from "react";
import ModuleCard from "./components/ModuleCard";
import QuestCard from "./components/QuestCard";
import StatsPanel from "./components/StatsPanel";
import XPBar from "./components/XPBar";
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
    status: "Planning",
    accent: "from-red-400 to-yellow-300",
    symbol: "◉",
  },
  {
    name: "Visualizer",
    subtitle: "Laser + Space Music Mode",
    status: "Prototype",
    accent: "from-fuchsia-400 to-cyan-300",
    symbol: "▰",
  },
  {
    name: "Terminal",
    subtitle: "Mostly-Fake Hacker Tools",
    status: "Online",
    accent: "from-green-400 to-teal-300",
    symbol: ">_",
  },
];

export default function Home() {
  const [appState, setAppState] =
    useState<RyanOSState>(emptyState);

  const [hasLoadedSavedData, setHasLoadedSavedData] =
    useState(false);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);

      if (savedState) {
        const parsedState = JSON.parse(
          savedState
        ) as Partial<RyanOSState>;

        const migratedState = migrateState(parsedState);

        setAppState(
          refreshQuestPeriods(migratedState)
        );
      } else {
        setAppState(
          refreshQuestPeriods(emptyState)
        );
      }
    } catch (error) {
      console.error(
        "Could not load RyanOS progress:",
        error
      );

      setAppState(
        refreshQuestPeriods(emptyState)
      );
    } finally {
      setHasLoadedSavedData(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedData) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(appState)
      );
    } catch (error) {
      console.error(
        "Could not save RyanOS progress:",
        error
      );
    }
  }, [appState, hasLoadedSavedData]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      setAppState((currentState) =>
        refreshQuestPeriods(currentState)
      );
    }, 60000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, []);

  const level = calculateLevel(
    appState.lifetimeXP
  );

  const xpIntoLevel = currentLevelXP(
    appState.lifetimeXP
  );

  const xpNeededThisLevel =
    xpForNextLevel(level) -
    xpForCurrentLevel(level);

  const dailyCompleted =
    appState.dailyQuests.filter(
      (quest) => quest.completed
    ).length;

  const weeklyCompleted =
    appState.weeklyQuests.filter(
      (quest) => quest.completed
    ).length;

  const recentHistory = [
    ...appState.questHistory,
  ]
    .reverse()
    .slice(0, 5);

  function toggleQuest(
    questId: string,
    group: QuestGroup
  ) {
    setAppState((currentState) =>
      toggleQuestInState(
        currentState,
        questId,
        group
      )
    );
  }

  function handleReroll(questId: string) {
    setAppState((currentState) =>
      rerollDailyQuest(
        currentState,
        questId
      )
    );
  }

  function selectWeeklyFocus(
    focus: WeeklyFocus
  ) {
    setAppState((currentState) => ({
      ...currentState,
      weeklyFocus: focus,
      weeklyQuests: createWeeklyQuests(
        focus,
        currentState.weekKey
      ),
    }));
  }

  function changeWeeklyFocus() {
    if (
      weeklyCompleted > 0 ||
      appState.weeklyBonusAwarded
    ) {
      return;
    }

    setAppState((currentState) => ({
      ...currentState,
      weeklyFocus: null,
      weeklyQuests: [],
    }));
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#07070f] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_35%)]" />

      <section className="relative mx-auto flex min-h-screen max-w-md flex-col px-5 py-6">
        <header className="mb-6 rounded-3xl border border-emerald-400/30 bg-black/50 p-5 shadow-2xl shadow-emerald-500/10">
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
              <p className="text-xs text-emerald-200">
                LVL
              </p>

              <p className="text-2xl font-black text-emerald-300">
                {String(level).padStart(2, "0")}
              </p>
            </div>
          </div>

          <XPBar
            currentXP={xpIntoLevel}
            nextLevelXP={xpNeededThisLevel}
          />
        </header>

        <section className="mb-5">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-black">
              Active Modules
            </h2>

            <p className="text-xs uppercase tracking-widest text-zinc-500">
              v0.2.5.2
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {modules.map((item) => (
              <ModuleCard
                key={item.name}
                title={item.name}
                subtitle={item.subtitle}
                status={item.status}
                symbol={item.symbol}
                accent={item.accent}
              />
            ))}
          </div>
        </section>

        <StatsPanel
          stats={appState.stats}
          dailyStreak={appState.dailyStreak}
          weeklyStreak={appState.weeklyStreak}
          dailyRerollsRemaining={
            appState.dailyRerollsRemaining
          }
        />

        <section className="mb-5 rounded-3xl border border-lime-300/20 bg-lime-300/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black">
                Daily Maintenance
              </h2>

              <p className="text-xs text-lime-300">
                {dailyCompleted}/
                {appState.dailyQuests.length} completed
              </p>
            </div>

            <div className="text-right">
              <span className="rounded-xl bg-lime-300/10 px-2 py-1 text-xs font-bold text-lime-300">
                Resets daily
              </span>

              <p className="mt-2 text-[10px] text-zinc-500">
                Full clear: +
                {DAILY_COMPLETION_BONUS} XP
              </p>
            </div>
          </div>

          {appState.dailyBonusAwarded && (
            <div className="mb-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-center">
              <p className="text-sm font-black text-emerald-300">
                Daily clear complete
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                +{DAILY_COMPLETION_BONUS} bonus XP
                awarded
              </p>
            </div>
          )}

          <div className="space-y-3">
            {appState.dailyQuests.map(
              (quest) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  group="daily"
                  canReroll={
                    appState.dailyRerollsRemaining >
                    0
                  }
                  onToggle={() =>
                    toggleQuest(
                      quest.id,
                      "daily"
                    )
                  }
                  onReroll={() =>
                    handleReroll(quest.id)
                  }
                />
              )
            )}
          </div>
        </section>

        <section className="mb-5 rounded-3xl border border-fuchsia-300/20 bg-fuchsia-300/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-black">
                Weekly Focus
              </h2>

              {appState.weeklyFocus ? (
                <p className="text-xs text-fuchsia-300">
                  {appState.weeklyFocus} ·{" "}
                  {weeklyCompleted}/
                  {appState.weeklyQuests.length}{" "}
                  completed
                </p>
              ) : (
                <p className="text-xs text-zinc-500">
                  Choose this week's mission
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
                Full clear: +
                {WEEKLY_COMPLETION_BONUS} XP
              </p>
            </div>
          </div>

          {appState.weeklyBonusAwarded && (
            <div className="mb-3 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 p-3 text-center">
              <p className="text-sm font-black text-fuchsia-300">
                Weekly focus complete
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                +{WEEKLY_COMPLETION_BONUS} bonus XP
                awarded
              </p>
            </div>
          )}

          {!appState.weeklyFocus ? (
            <div>
              <p className="mb-3 text-sm text-zinc-400">
                What do you want to focus on this
                week?
              </p>

              <div className="grid grid-cols-2 gap-2">
                {weeklyFocusOptions.map(
                  (focus) => (
                    <button
                      key={focus}
                      type="button"
                      onClick={() =>
                        selectWeeklyFocus(focus)
                      }
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm font-bold transition hover:border-fuchsia-300/40 hover:bg-fuchsia-300/10 active:scale-95"
                    >
                      {focus}
                    </button>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {appState.weeklyQuests.map(
                (quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    group="weekly"
                    onToggle={() =>
                      toggleQuest(
                        quest.id,
                        "weekly"
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <section className="mb-5 rounded-3xl border border-blue-300/20 bg-blue-300/4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-black">
                Recent Activity
              </h2>

              <p className="text-xs text-blue-300">
                Latest completed quests
              </p>
            </div>

            <span className="rounded-xl bg-blue-300/10 px-2 py-1 text-xs font-bold text-blue-300">
              {appState.questHistory.length}
            </span>
          </div>

          {recentHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-center">
              <p className="text-sm text-zinc-500">
                Complete a quest to begin your
                activity log.
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

        <section className="mt-auto rounded-3xl border border-green-400/20 bg-black/60 p-4 font-mono shadow-2xl shadow-green-500/10">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-green-300">
            Terminal
          </p>

          <p className="text-sm text-green-300">
            &gt; boot RyanOS_v0.2.5.2
            <br />
            &gt; character_stats online
            <br />
            &gt; streak_tracking active
            <br />
            &gt; quest_history recording
            <br />
            &gt; daily_reroll available
          </p>
        </section>
      </section>
    </main>
  );
}