"use client";

import { useEffect, useState } from "react";
import XPBar from "./components/XPBar";
import ModuleCard from "./components/ModuleCard";
import {
  calculateLevel,
  currentLevelXP,
  xpForNextLevel,
  xpForCurrentLevel,
} from "./lib/leveling";

type StatType = "INT" | "CON" | "STR" | "CHA" | "WIS" | "DEX";

type Quest = {
  id: string;
  title: string;
  description: string;
  xp: number;
  type: StatType;
  completed: boolean;
};

type WeeklyFocus =
  | "Coding"
  | "Music"
  | "Fitness"
  | "Pokémon"
  | "Spanish"
  | "Career"
  | "Reading"
  | "Organization";

type RyanOSState = {
  lifetimeXP: number;
  dailyDate: string;
  dailyQuests: Quest[];
  weekKey: string;
  weeklyFocus: WeeklyFocus | null;
  weeklyQuests: Quest[];
};

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

const STORAGE_KEY = "ryanos-state-v1";

const weeklyFocusOptions: WeeklyFocus[] = [
  "Coding",
  "Music",
  "Fitness",
  "Pokémon",
  "Spanish",
  "Career",
  "Reading",
  "Organization",
];

const dailyQuestPools: Quest[][] = [
  [
    {
      id: "",
      title: "Clean one small area",
      description: "Spend at least 10 minutes improving your space.",
      xp: 10,
      type: "CON",
      completed: false,
    },
    {
      id: "",
      title: "Complete a five-minute reset",
      description: "Put away clutter and reset one room.",
      xp: 10,
      type: "CON",
      completed: false,
    },
    {
      id: "",
      title: "Handle one maintenance task",
      description: "Finish one small chore you have been avoiding.",
      xp: 15,
      type: "CON",
      completed: false,
    },
  ],
  [
    {
      id: "",
      title: "Walk for 20 minutes",
      description: "Get outside or walk somewhere indoors.",
      xp: 15,
      type: "STR",
      completed: false,
    },
    {
      id: "",
      title: "Stretch for 10 minutes",
      description: "Complete a short full-body mobility session.",
      xp: 10,
      type: "DEX",
      completed: false,
    },
    {
      id: "",
      title: "Complete a short workout",
      description: "Do at least 15 minutes of intentional exercise.",
      xp: 20,
      type: "STR",
      completed: false,
    },
  ],
  [
    {
      id: "",
      title: "Read for 15 minutes",
      description: "Read a book, article, or educational material.",
      xp: 10,
      type: "INT",
      completed: false,
    },
    {
      id: "",
      title: "Learn something new",
      description: "Spend 15 minutes studying a useful topic.",
      xp: 15,
      type: "INT",
      completed: false,
    },
    {
      id: "",
      title: "Practice a skill",
      description: "Spend at least 15 minutes practicing deliberately.",
      xp: 15,
      type: "WIS",
      completed: false,
    },
  ],
  [
    {
      id: "",
      title: "Plan tomorrow",
      description: "Choose your most important task for tomorrow.",
      xp: 10,
      type: "WIS",
      completed: false,
    },
    {
      id: "",
      title: "Message someone you care about",
      description: "Reach out and have a genuine interaction.",
      xp: 10,
      type: "CHA",
      completed: false,
    },
    {
      id: "",
      title: "Spend 20 minutes on a hobby",
      description: "Make intentional time for something you enjoy.",
      xp: 15,
      type: "WIS",
      completed: false,
    },
  ],
];

const weeklyQuestPools: Record<WeeklyFocus, Omit<Quest, "id" | "completed">[]> = {
  Coding: [
    {
      title: "Complete a focused coding session",
      description: "Code without distractions for at least one hour.",
      xp: 50,
      type: "INT",
    },
    {
      title: "Finish one RyanOS feature",
      description: "Build, test, and deploy one complete feature.",
      xp: 80,
      type: "INT",
    },
    {
      title: "Review and clean up your code",
      description: "Improve naming, structure, or documentation.",
      xp: 40,
      type: "WIS",
    },
    {
      title: "Learn one development concept",
      description: "Study and apply one new technical concept.",
      xp: 45,
      type: "INT",
    },
  ],

  Music: [
    {
      title: "Build an eight-bar loop",
      description: "Create drums, bass, and one musical element.",
      xp: 50,
      type: "DEX",
    },
    {
      title: "Design one new sound",
      description: "Create and save a synth, bass, or effect preset.",
      xp: 45,
      type: "DEX",
    },
    {
      title: "Arrange one minute of music",
      description: "Turn an idea into a structured section.",
      xp: 70,
      type: "INT",
    },
    {
      title: "Export and review a draft",
      description: "Listen away from the project and take notes.",
      xp: 40,
      type: "WIS",
    },
  ],

  Fitness: [
    {
      title: "Complete a full workout",
      description: "Finish one intentional strength or cardio session.",
      xp: 60,
      type: "STR",
    },
    {
      title: "Complete three active days",
      description: "Move intentionally on three separate days.",
      xp: 90,
      type: "CON",
    },
    {
      title: "Prepare one healthy meal",
      description: "Cook a balanced meal instead of ordering food.",
      xp: 45,
      type: "CON",
    },
    {
      title: "Complete a mobility session",
      description: "Spend at least 20 minutes stretching or mobilizing.",
      xp: 40,
      type: "DEX",
    },
  ],

  Pokémon: [
    {
      title: "Build or improve one team",
      description: "Create a team or make meaningful set changes.",
      xp: 60,
      type: "INT",
    },
    {
      title: "Review one battle",
      description: "Identify mistakes, strong plays, and adjustments.",
      xp: 40,
      type: "WIS",
    },
    {
      title: "Practice five games",
      description: "Play five intentional practice games.",
      xp: 75,
      type: "INT",
    },
    {
      title: "Research one matchup",
      description: "Create a game plan for one difficult opponent.",
      xp: 50,
      type: "WIS",
    },
  ],

  Spanish: [
    {
      title: "Complete one Spanish lesson",
      description: "Finish a structured language-learning lesson.",
      xp: 45,
      type: "INT",
    },
    {
      title: "Practice listening for 20 minutes",
      description: "Listen actively without relying fully on subtitles.",
      xp: 50,
      type: "WIS",
    },
    {
      title: "Speak Spanish out loud",
      description: "Practice speaking for at least 15 minutes.",
      xp: 55,
      type: "CHA",
    },
    {
      title: "Review 30 vocabulary words",
      description: "Study and test yourself on useful vocabulary.",
      xp: 40,
      type: "INT",
    },
  ],

  Career: [
    {
      title: "Apply to one strong-fit job",
      description: "Submit a thoughtful and tailored application.",
      xp: 70,
      type: "CHA",
    },
    {
      title: "Improve one portfolio project",
      description: "Add a useful feature, documentation, or polish.",
      xp: 60,
      type: "INT",
    },
    {
      title: "Improve one résumé section",
      description: "Strengthen one section with clearer results.",
      xp: 45,
      type: "CHA",
    },
    {
      title: "Complete one networking action",
      description: "Message, follow up with, or meet someone.",
      xp: 50,
      type: "CHA",
    },
  ],

  Reading: [
    {
      title: "Read for one hour",
      description: "Complete one uninterrupted hour of reading.",
      xp: 50,
      type: "INT",
    },
    {
      title: "Finish one chapter",
      description: "Complete and reflect on one full chapter.",
      xp: 40,
      type: "INT",
    },
    {
      title: "Write down five useful ideas",
      description: "Capture ideas or lessons from your reading.",
      xp: 45,
      type: "WIS",
    },
    {
      title: "Read on three separate days",
      description: "Build consistency across the week.",
      xp: 75,
      type: "WIS",
    },
  ],

  Organization: [
    {
      title: "Deep-clean one area",
      description: "Fully clean and organize one defined space.",
      xp: 60,
      type: "CON",
    },
    {
      title: "Remove ten unnecessary items",
      description: "Donate, recycle, or discard unused clutter.",
      xp: 45,
      type: "WIS",
    },
    {
      title: "Organize one digital space",
      description: "Clean up files, email, photos, or applications.",
      xp: 50,
      type: "INT",
    },
    {
      title: "Complete one delayed responsibility",
      description: "Finish something that has been hanging over you.",
      xp: 70,
      type: "CON",
    },
  ],
};

const emptyState: RyanOSState = {
  lifetimeXP: 0,
  dailyDate: "",
  dailyQuests: [],
  weekKey: "",
  weeklyFocus: null,
  weeklyQuests: [],
};

function getDateKey() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function getWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);

  return [
    monday.getFullYear(),
    String(monday.getMonth() + 1).padStart(2, "0"),
    String(monday.getDate()).padStart(2, "0"),
  ].join("-");
}

function hashText(text: string) {
  let hash = 0;

  for (let index = 0; index < text.length; index++) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function createDailyQuests(dateKey: string): Quest[] {
  return dailyQuestPools.map((pool, poolIndex) => {
    const selectedIndex =
      hashText(`${dateKey}-${poolIndex}`) % pool.length;

    const selectedQuest = pool[selectedIndex];

    return {
      ...selectedQuest,
      id: `daily-${dateKey}-${poolIndex}`,
      completed: false,
    };
  });
}

function createWeeklyQuests(
  focus: WeeklyFocus,
  weekKey: string
): Quest[] {
  return weeklyQuestPools[focus].map((quest, index) => ({
    ...quest,
    id: `weekly-${weekKey}-${focus}-${index}`,
    completed: false,
  }));
}

function refreshQuestPeriods(state: RyanOSState): RyanOSState {
  const today = getDateKey();
  const currentWeek = getWeekKey();

  let refreshedState = { ...state };

  if (state.dailyDate !== today) {
    refreshedState = {
      ...refreshedState,
      dailyDate: today,
      dailyQuests: createDailyQuests(today),
    };
  }

  if (state.weekKey !== currentWeek) {
    refreshedState = {
      ...refreshedState,
      weekKey: currentWeek,
      weeklyFocus: null,
      weeklyQuests: [],
    };
  }

  return refreshedState;
}

export default function Home() {
  const [appState, setAppState] = useState<RyanOSState>(emptyState);
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);

      if (savedState) {
        const parsedState = JSON.parse(savedState) as RyanOSState;
        setAppState(refreshQuestPeriods(parsedState));
      } else {
        setAppState(refreshQuestPeriods(emptyState));
      }
    } catch (error) {
      console.error("Could not load RyanOS progress:", error);
      setAppState(refreshQuestPeriods(emptyState));
    } finally {
      setHasLoadedSavedData(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedData) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState, hasLoadedSavedData]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      setAppState((currentState) =>
        refreshQuestPeriods(currentState)
      );
    }, 60000);

    return () => window.clearInterval(refreshTimer);
  }, []);

  const level = calculateLevel(appState.lifetimeXP);
  const xpIntoLevel = currentLevelXP(appState.lifetimeXP);

  const xpNeededThisLevel =
    xpForNextLevel(level) - xpForCurrentLevel(level);

  const dailyCompleted = appState.dailyQuests.filter(
    (quest) => quest.completed
  ).length;

  const weeklyCompleted = appState.weeklyQuests.filter(
    (quest) => quest.completed
  ).length;

  function toggleQuest(
    questId: string,
    questGroup: "daily" | "weekly"
  ) {
    setAppState((currentState) => {
      const questList =
        questGroup === "daily"
          ? currentState.dailyQuests
          : currentState.weeklyQuests;

      const selectedQuest = questList.find(
        (quest) => quest.id === questId
      );

      if (!selectedQuest) {
        return currentState;
      }

      const xpChange = selectedQuest.completed
        ? -selectedQuest.xp
        : selectedQuest.xp;

      const updatedQuests = questList.map((quest) =>
        quest.id === questId
          ? { ...quest, completed: !quest.completed }
          : quest
      );

      return {
        ...currentState,
        lifetimeXP: Math.max(
          0,
          currentState.lifetimeXP + xpChange
        ),
        ...(questGroup === "daily"
          ? { dailyQuests: updatedQuests }
          : { weeklyQuests: updatedQuests }),
      };
    });
  }

  function selectWeeklyFocus(focus: WeeklyFocus) {
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
    if (weeklyCompleted > 0) {
      return;
    }

    setAppState((currentState) => ({
      ...currentState,
      weeklyFocus: null,
      weeklyQuests: [],
    }));
  }

  function renderQuest(
    quest: Quest,
    questGroup: "daily" | "weekly"
  ) {
    return (
      <button
        key={quest.id}
        type="button"
        onClick={() => toggleQuest(quest.id, questGroup)}
        className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
          quest.completed
            ? "border-emerald-500 bg-emerald-500/20"
            : "border-white/10 bg-black/30"
        }`}
      >
        <div className="min-w-0 pr-3">
          <p
            className={`text-sm font-bold ${
              quest.completed
                ? "text-zinc-400 line-through"
                : "text-zinc-100"
            }`}
          >
            {quest.completed ? "✅ " : "⬜ "}
            {quest.title}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {quest.description}
          </p>

          <p className="mt-1 text-xs font-bold text-lime-300">
            {quest.type} quest
          </p>
        </div>

        <p className="shrink-0 rounded-xl bg-emerald-400/10 px-3 py-1 text-sm font-black text-emerald-300">
          +{quest.xp} XP
        </p>
      </button>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#07070f] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.18),_transparent_35%)]" />

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
              <p className="text-xs text-emerald-200">LVL</p>

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
            <h2 className="text-lg font-black">Active Modules</h2>

            <p className="text-xs uppercase tracking-widest text-zinc-500">
              v0.3
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

        <section className="mb-5 rounded-3xl border border-lime-300/20 bg-lime-300/[0.05] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-black">Daily Maintenance</h2>

              <p className="text-xs text-lime-300">
                {dailyCompleted}/{appState.dailyQuests.length} completed
              </p>
            </div>

            <span className="rounded-xl bg-lime-300/10 px-2 py-1 text-xs font-bold text-lime-300">
              Resets daily
            </span>
          </div>

          <div className="space-y-3">
            {appState.dailyQuests.map((quest) =>
              renderQuest(quest, "daily")
            )}
          </div>
        </section>

        <section className="mb-5 rounded-3xl border border-fuchsia-300/20 bg-fuchsia-300/[0.05] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-black">Weekly Focus</h2>

              {appState.weeklyFocus && (
                <p className="text-xs text-fuchsia-300">
                  {appState.weeklyFocus} · {weeklyCompleted}/
                  {appState.weeklyQuests.length} completed
                </p>
              )}
            </div>

            {appState.weeklyFocus && weeklyCompleted === 0 && (
              <button
                type="button"
                onClick={changeWeeklyFocus}
                className="rounded-xl border border-fuchsia-300/20 px-3 py-1 text-xs font-bold text-fuchsia-300 transition active:scale-95"
              >
                Change
              </button>
            )}
          </div>

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
              {appState.weeklyQuests.map((quest) =>
                renderQuest(quest, "weekly")
              )}
            </div>
          )}
        </section>

        <section className="mt-auto rounded-3xl border border-green-400/20 bg-black/60 p-4 font-mono shadow-2xl shadow-green-500/10">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-green-300">
            Terminal
          </p>

          <p className="text-sm text-green-300">
            &gt; boot RyanOS_v0.3
            <br />
            &gt; lifetime_xp secured
            <br />
            &gt; daily_quests synchronized
            <br />
            &gt; weekly_focus awaiting orders
          </p>
        </section>
      </section>
    </main>
  );
}