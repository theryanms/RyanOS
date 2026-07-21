export type StatType =
  | "INT"
  | "CON"
  | "STR"
  | "CHA"
  | "WIS"
  | "DEX";

export type WeeklyFocus =
  | "Coding"
  | "Music"
  | "Fitness"
  | "Pokémon"
  | "Spanish"
  | "Career"
  | "Reading"
  | "Organization";

export type QuestGroup = "daily" | "weekly";

export type Quest = {
  id: string;
  title: string;
  description: string;
  xp: number;
  type: StatType;
  completed: boolean;

  // These help RyanOS reroll a daily quest from the correct category.
  poolIndex?: number;
  templateIndex?: number;
};

export type QuestTemplate = Omit<
  Quest,
  "id" | "completed" | "poolIndex" | "templateIndex"
>;

export type StatTotals = Record<StatType, number>;

export type QuestHistoryEntry = {
  id: string;
  questId: string;
  title: string;
  xp: number;
  type: StatType;
  period: QuestGroup;
  completedAt: string;
};

export type RyanOSState = {
  lifetimeXP: number;
  stats: StatTotals;

  dailyDate: string;
  dailyQuests: Quest[];
  dailyStreak: number;
  lastCompletedDailyDate: string;
  dailyBonusAwarded: boolean;
  dailyRerollsRemaining: number;

  weekKey: string;
  weeklyFocus: WeeklyFocus | null;
  weeklyQuests: Quest[];
  weeklyStreak: number;
  lastCompletedWeek: string;
  weeklyBonusAwarded: boolean;

  questHistory: QuestHistoryEntry[];
};

export const STORAGE_KEY = "ryanos-state-v1";

export const DAILY_COMPLETION_BONUS = 50;
export const WEEKLY_COMPLETION_BONUS = 150;
export const DAILY_REROLLS = 1;
export const MAX_HISTORY_ENTRIES = 250;

export const weeklyFocusOptions: WeeklyFocus[] = [
  "Coding",
  "Music",
  "Fitness",
  "Pokémon",
  "Spanish",
  "Career",
  "Reading",
  "Organization",
];

export const emptyStats: StatTotals = {
  STR: 0,
  INT: 0,
  CON: 0,
  WIS: 0,
  CHA: 0,
  DEX: 0,
};

export const emptyState: RyanOSState = {
  lifetimeXP: 0,
  stats: emptyStats,

  dailyDate: "",
  dailyQuests: [],
  dailyStreak: 0,
  lastCompletedDailyDate: "",
  dailyBonusAwarded: false,
  dailyRerollsRemaining: DAILY_REROLLS,

  weekKey: "",
  weeklyFocus: null,
  weeklyQuests: [],
  weeklyStreak: 0,
  lastCompletedWeek: "",
  weeklyBonusAwarded: false,

  questHistory: [],
};

/*
Each inner array represents one daily category.

RyanOS generates one quest from each category:

0. Personal maintenance
1. Physical health
2. Learning and growth
3. Social and mental wellness
4. Hobbies and personal progress
*/

const dailyQuestPools: QuestTemplate[][] = [
  [
    {
      title: "Clean one small area",
      description: "Spend at least 10 minutes improving your space.",
      xp: 10,
      type: "CON",
    },
    {
      title: "Complete a five-minute reset",
      description: "Put away clutter and reset one room.",
      xp: 10,
      type: "CON",
    },
    {
      title: "Handle one maintenance task",
      description: "Finish one small chore you have been avoiding.",
      xp: 15,
      type: "CON",
    },
    {
      title: "Wash the dishes",
      description: "Clear the sink or load and run the dishwasher.",
      xp: 10,
      type: "CON",
    },
    {
      title: "Complete one load of laundry",
      description: "Wash, dry, fold, or put away one load.",
      xp: 15,
      type: "CON",
    },
    {
      title: "Clear one cluttered surface",
      description: "Fully clear and wipe down one surface.",
      xp: 10,
      type: "CON",
    },
    {
      title: "Take out trash or recycling",
      description: "Remove any full trash or recycling containers.",
      xp: 10,
      type: "STR",
    },
    {
      title: "Prepare for tomorrow",
      description: "Set out anything you will need tomorrow.",
      xp: 10,
      type: "WIS",
    },
  ],

  [
    {
      title: "Walk for 20 minutes",
      description: "Get outside or walk somewhere indoors.",
      xp: 15,
      type: "STR",
    },
    {
      title: "Stretch for 10 minutes",
      description: "Complete a short full-body mobility session.",
      xp: 10,
      type: "DEX",
    },
    {
      title: "Complete a short workout",
      description: "Do at least 15 minutes of intentional exercise.",
      xp: 20,
      type: "STR",
    },
    {
      title: "Drink an extra glass of water",
      description: "Pause and intentionally hydrate.",
      xp: 5,
      type: "CON",
    },
    {
      title: "Prepare one balanced meal",
      description: "Eat something with protein, plants, and substance.",
      xp: 15,
      type: "CON",
    },
    {
      title: "Take a movement break",
      description: "Move away from your screen for at least 10 minutes.",
      xp: 10,
      type: "DEX",
    },
    {
      title: "Go outside for fresh air",
      description: "Spend at least 15 minutes outside.",
      xp: 10,
      type: "CON",
    },
    {
      title: "Complete a bodyweight circuit",
      description: "Do a short circuit of simple bodyweight exercises.",
      xp: 20,
      type: "STR",
    },
  ],

  [
    {
      title: "Read for 15 minutes",
      description: "Read a book, article, or educational material.",
      xp: 10,
      type: "INT",
    },
    {
      title: "Learn something new",
      description: "Spend 15 minutes studying a useful topic.",
      xp: 15,
      type: "INT",
    },
    {
      title: "Practice a skill",
      description: "Spend at least 15 minutes practicing deliberately.",
      xp: 15,
      type: "WIS",
    },
    {
      title: "Watch one educational lesson",
      description: "Watch and take notes on something useful.",
      xp: 15,
      type: "INT",
    },
    {
      title: "Write down three things you learned",
      description: "Reflect on recent lessons or experiences.",
      xp: 10,
      type: "WIS",
    },
    {
      title: "Solve one problem without assistance",
      description: "Attempt a challenge before looking up the answer.",
      xp: 15,
      type: "INT",
    },
    {
      title: "Review old notes",
      description: "Spend 15 minutes reviewing something you studied.",
      xp: 10,
      type: "INT",
    },
    {
      title: "Practice a language",
      description: "Spend at least 15 minutes on vocabulary or listening.",
      xp: 15,
      type: "CHA",
    },
  ],

  [
    {
      title: "Plan tomorrow",
      description: "Choose your most important task for tomorrow.",
      xp: 10,
      type: "WIS",
    },
    {
      title: "Message someone you care about",
      description: "Reach out and have a genuine interaction.",
      xp: 10,
      type: "CHA",
    },
    {
      title: "Take a quiet break",
      description: "Spend 10 minutes without a screen or distraction.",
      xp: 10,
      type: "WIS",
    },
    {
      title: "Write down three good things",
      description: "Record three positive parts of your day.",
      xp: 10,
      type: "WIS",
    },
    {
      title: "Check in with a friend",
      description: "Ask someone how they are genuinely doing.",
      xp: 15,
      type: "CHA",
    },
    {
      title: "Complete a short mindfulness session",
      description: "Breathe, meditate, or sit quietly for 10 minutes.",
      xp: 10,
      type: "WIS",
    },
    {
      title: "Do something kind",
      description: "Complete one thoughtful action for another person.",
      xp: 15,
      type: "CHA",
    },
    {
      title: "Write down tomorrow's priorities",
      description: "Choose no more than three important tasks.",
      xp: 10,
      type: "WIS",
    },
  ],

  [
    {
      title: "Spend 20 minutes on a hobby",
      description: "Make intentional time for something you enjoy.",
      xp: 15,
      type: "WIS",
    },
    {
      title: "Make progress on a personal project",
      description: "Complete one small, visible project step.",
      xp: 20,
      type: "INT",
    },
    {
      title: "Create something",
      description: "Make music, write, draw, build, or design something.",
      xp: 20,
      type: "DEX",
    },
    {
      title: "Practice instead of only consuming",
      description: "Actively practice a hobby for at least 20 minutes.",
      xp: 20,
      type: "DEX",
    },
    {
      title: "Finish one small unfinished task",
      description: "Close out something that is nearly complete.",
      xp: 20,
      type: "CON",
    },
    {
      title: "Try one new idea",
      description: "Experiment with something outside your normal routine.",
      xp: 15,
      type: "WIS",
    },
    {
      title: "Organize your next hobby session",
      description: "Prepare files, tools, notes, or materials.",
      xp: 10,
      type: "INT",
    },
    {
      title: "Share something you made",
      description: "Show your progress to a friend or community.",
      xp: 15,
      type: "CHA",
    },
  ],
];

const weeklyQuestPools: Record<WeeklyFocus, QuestTemplate[]> = {
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

export function getDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getWeekKey(date = new Date()) {
  const monday = new Date(date);
  const day = monday.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  monday.setDate(monday.getDate() - daysSinceMonday);

  return getDateKey(monday);
}

function getPreviousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() - 1);

  return getDateKey(date);
}

function getPreviousWeekKey(weekKey: string) {
  const [year, month, day] = weekKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() - 7);

  return getDateKey(date);
}

function hashText(text: string) {
  let hash = 0;

  for (let index = 0; index < text.length; index++) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function createDailyQuests(dateKey: string): Quest[] {
  return dailyQuestPools.map((pool, poolIndex) => {
    const templateIndex =
      hashText(`${dateKey}-${poolIndex}`) % pool.length;

    return {
      ...pool[templateIndex],
      id: `daily-${dateKey}-${poolIndex}`,
      completed: false,
      poolIndex,
      templateIndex,
    };
  });
}

export function createWeeklyQuests(
  focus: WeeklyFocus,
  weekKey: string
): Quest[] {
  return weeklyQuestPools[focus].map((quest, index) => ({
    ...quest,
    id: `weekly-${weekKey}-${focus}-${index}`,
    completed: false,
  }));
}

function getStatsFromCompletedQuests(quests: Quest[]) {
  const stats = { ...emptyStats };

  for (const quest of quests) {
    if (quest.completed) {
      stats[quest.type] += quest.xp;
    }
  }

  return stats;
}

export function migrateState(
  savedState: Partial<RyanOSState>
): RyanOSState {
  const savedDailyQuests = Array.isArray(savedState.dailyQuests)
    ? savedState.dailyQuests
    : [];

  const savedWeeklyQuests = Array.isArray(savedState.weeklyQuests)
    ? savedState.weeklyQuests
    : [];

  const reconstructedStats = getStatsFromCompletedQuests([
    ...savedDailyQuests,
    ...savedWeeklyQuests,
  ]);

  return {
    ...emptyState,
    ...savedState,

    stats: savedState.stats
      ? {
          ...emptyStats,
          ...savedState.stats,
        }
      : reconstructedStats,

    dailyQuests: savedDailyQuests,
    weeklyQuests: savedWeeklyQuests,

    dailyStreak: savedState.dailyStreak ?? 0,
    lastCompletedDailyDate:
      savedState.lastCompletedDailyDate ?? "",
    dailyBonusAwarded:
      savedState.dailyBonusAwarded ?? false,
    dailyRerollsRemaining:
      savedState.dailyRerollsRemaining ?? DAILY_REROLLS,

    weeklyStreak: savedState.weeklyStreak ?? 0,
    lastCompletedWeek: savedState.lastCompletedWeek ?? "",
    weeklyBonusAwarded:
      savedState.weeklyBonusAwarded ?? false,

    questHistory: Array.isArray(savedState.questHistory)
      ? savedState.questHistory
      : [],
  };
}

export function refreshQuestPeriods(
  state: RyanOSState
): RyanOSState {
  const today = getDateKey();
  const currentWeek = getWeekKey();

  let refreshedState = { ...state };

  if (state.dailyDate !== today) {
    const previousDay = getPreviousDateKey(today);

    const shouldResetDailyStreak =
      state.lastCompletedDailyDate !== previousDay &&
      state.lastCompletedDailyDate !== today;

    refreshedState = {
      ...refreshedState,
      dailyDate: today,
      dailyQuests: createDailyQuests(today),
      dailyBonusAwarded: false,
      dailyRerollsRemaining: DAILY_REROLLS,
      dailyStreak: shouldResetDailyStreak
        ? 0
        : state.dailyStreak,
    };
  }

  if (state.weekKey !== currentWeek) {
    const previousWeek = getPreviousWeekKey(currentWeek);

    const shouldResetWeeklyStreak =
      state.lastCompletedWeek !== previousWeek &&
      state.lastCompletedWeek !== currentWeek;

    refreshedState = {
      ...refreshedState,
      weekKey: currentWeek,
      weeklyFocus: null,
      weeklyQuests: [],
      weeklyBonusAwarded: false,
      weeklyStreak: shouldResetWeeklyStreak
        ? 0
        : state.weeklyStreak,
    };
  }

  return refreshedState;
}

function updateStreak(
  currentStreak: number,
  lastCompletedPeriod: string,
  currentPeriod: string,
  previousPeriod: string
) {
  if (lastCompletedPeriod === currentPeriod) {
    return currentStreak;
  }

  if (lastCompletedPeriod === previousPeriod) {
    return currentStreak + 1;
  }

  return 1;
}

function addHistoryEntry(
  history: QuestHistoryEntry[],
  quest: Quest,
  period: QuestGroup
) {
  const existingEntry = history.some(
    (entry) => entry.questId === quest.id
  );

  if (existingEntry) {
    return history;
  }

  const newEntry: QuestHistoryEntry = {
    id: `${quest.id}-${Date.now()}`,
    questId: quest.id,
    title: quest.title,
    xp: quest.xp,
    type: quest.type,
    period,
    completedAt: new Date().toISOString(),
  };

  return [...history, newEntry].slice(-MAX_HISTORY_ENTRIES);
}

function removeHistoryEntry(
  history: QuestHistoryEntry[],
  questId: string
) {
  return history.filter((entry) => entry.questId !== questId);
}

function rollbackDailyCompletion(
  state: RyanOSState
): Pick<
  RyanOSState,
  | "dailyStreak"
  | "lastCompletedDailyDate"
  | "dailyBonusAwarded"
> {
  const previousDay = getPreviousDateKey(
    state.dailyDate
  );

  return {
    dailyStreak: Math.max(
      0,
      state.dailyStreak - 1
    ),

    lastCompletedDailyDate:
      state.dailyStreak > 1
        ? previousDay
        : "",

    dailyBonusAwarded: false,
  };
}

function rollbackWeeklyCompletion(
  state: RyanOSState
): Pick<
  RyanOSState,
  | "weeklyStreak"
  | "lastCompletedWeek"
  | "weeklyBonusAwarded"
> {
  const previousWeek = getPreviousWeekKey(
    state.weekKey
  );

  return {
    weeklyStreak: Math.max(
      0,
      state.weeklyStreak - 1
    ),

    lastCompletedWeek:
      state.weeklyStreak > 1
        ? previousWeek
        : "",

    weeklyBonusAwarded: false,
  };
}

export function toggleQuestInState(
  state: RyanOSState,
  questId: string,
  group: QuestGroup
): RyanOSState {
  const questList =
    group === "daily"
      ? state.dailyQuests
      : state.weeklyQuests;

  const selectedQuest = questList.find(
    (quest) => quest.id === questId
  );

  if (!selectedQuest) {
    return state;
  }

  const isNowCompleted =
    !selectedQuest.completed;

  const updatedQuests = questList.map(
    (quest) =>
      quest.id === questId
        ? {
            ...quest,
            completed: isNowCompleted,
          }
        : quest
  );

  const xpChange = isNowCompleted
    ? selectedQuest.xp
    : -selectedQuest.xp;

  const updatedStats = {
    ...state.stats,

    [selectedQuest.type]: Math.max(
      0,
      state.stats[selectedQuest.type] +
        xpChange
    ),
  };

  const updatedHistory = isNowCompleted
    ? addHistoryEntry(
        state.questHistory,
        selectedQuest,
        group
      )
    : removeHistoryEntry(
        state.questHistory,
        selectedQuest.id
      );

  let updatedState: RyanOSState = {
    ...state,

    lifetimeXP: Math.max(
      0,
      state.lifetimeXP + xpChange
    ),

    stats: updatedStats,
    questHistory: updatedHistory,

    ...(group === "daily"
      ? {
          dailyQuests: updatedQuests,
        }
      : {
          weeklyQuests: updatedQuests,
        }),
  };

  const allQuestsCompleted =
    updatedQuests.length > 0 &&
    updatedQuests.every(
      (quest) => quest.completed
    );

  /*
  Remove a previously earned daily bonus if
  the user unchecks a daily quest.
  */
  if (
    group === "daily" &&
    !allQuestsCompleted &&
    state.dailyBonusAwarded
  ) {
    updatedState = {
      ...updatedState,

      lifetimeXP: Math.max(
        0,
        updatedState.lifetimeXP -
          DAILY_COMPLETION_BONUS
      ),

      ...rollbackDailyCompletion(state),
    };
  }

  /*
  Remove a previously earned weekly bonus if
  the user unchecks a weekly quest.
  */
  if (
    group === "weekly" &&
    !allQuestsCompleted &&
    state.weeklyBonusAwarded
  ) {
    updatedState = {
      ...updatedState,

      lifetimeXP: Math.max(
        0,
        updatedState.lifetimeXP -
          WEEKLY_COMPLETION_BONUS
      ),

      ...rollbackWeeklyCompletion(state),
    };
  }

  /*
  Award the daily completion bonus when every
  daily quest becomes complete.
  */
  if (
    group === "daily" &&
    allQuestsCompleted &&
    !updatedState.dailyBonusAwarded
  ) {
    const previousDay =
      getPreviousDateKey(
        updatedState.dailyDate
      );

    updatedState = {
      ...updatedState,

      lifetimeXP:
        updatedState.lifetimeXP +
        DAILY_COMPLETION_BONUS,

      dailyBonusAwarded: true,

      dailyStreak: updateStreak(
        updatedState.dailyStreak,
        updatedState.lastCompletedDailyDate,
        updatedState.dailyDate,
        previousDay
      ),

      lastCompletedDailyDate:
        updatedState.dailyDate,
    };
  }

  /*
  Award the weekly completion bonus when every
  weekly quest becomes complete.
  */
  if (
    group === "weekly" &&
    allQuestsCompleted &&
    !updatedState.weeklyBonusAwarded
  ) {
    const previousWeek =
      getPreviousWeekKey(
        updatedState.weekKey
      );

    updatedState = {
      ...updatedState,

      lifetimeXP:
        updatedState.lifetimeXP +
        WEEKLY_COMPLETION_BONUS,

      weeklyBonusAwarded: true,

      weeklyStreak: updateStreak(
        updatedState.weeklyStreak,
        updatedState.lastCompletedWeek,
        updatedState.weekKey,
        previousWeek
      ),

      lastCompletedWeek:
        updatedState.weekKey,
    };
  }

  return updatedState;
}

export function rerollDailyQuest(
  state: RyanOSState,
  questId: string
): RyanOSState {
  if (state.dailyRerollsRemaining <= 0) {
    return state;
  }

  const questIndex = state.dailyQuests.findIndex(
    (quest) => quest.id === questId
  );

  if (questIndex === -1) {
    return state;
  }

  const currentQuest = state.dailyQuests[questIndex];

  if (currentQuest.completed) {
    return state;
  }

  const poolIndex =
    currentQuest.poolIndex ?? questIndex;

  const pool = dailyQuestPools[poolIndex];

  if (!pool || pool.length <= 1) {
    return state;
  }

  const currentTemplateIndex =
    currentQuest.templateIndex ??
    pool.findIndex(
      (template) =>
        template.title === currentQuest.title
    );

  let newTemplateIndex =
    hashText(
      `${state.dailyDate}-${poolIndex}-reroll-${state.dailyRerollsRemaining}`
    ) % pool.length;

  if (newTemplateIndex === currentTemplateIndex) {
    newTemplateIndex =
      (newTemplateIndex + 1) % pool.length;
  }

  const newQuest: Quest = {
    ...pool[newTemplateIndex],
    id: `daily-${state.dailyDate}-${poolIndex}-rerolled`,
    completed: false,
    poolIndex,
    templateIndex: newTemplateIndex,
  };

  const updatedDailyQuests = [...state.dailyQuests];
  updatedDailyQuests[questIndex] = newQuest;

  return {
    ...state,
    dailyQuests: updatedDailyQuests,
    dailyRerollsRemaining:
      state.dailyRerollsRemaining - 1,
  };
}