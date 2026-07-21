import type {
  StatTotals,
  StatType,
} from "../lib/quests";

type StatsPanelProps = {
  stats: StatTotals;
  dailyStreak: number;
  weeklyStreak: number;
  dailyRerollsRemaining: number;
};

const statOrder: StatType[] = [
  "STR",
  "INT",
  "CON",
  "WIS",
  "CHA",
  "DEX",
];

const statLabels: Record<StatType, string> = {
  STR: "Strength",
  INT: "Intelligence",
  CON: "Constitution",
  WIS: "Wisdom",
  CHA: "Charisma",
  DEX: "Dexterity",
};

export default function StatsPanel({
  stats,
  dailyStreak,
  weeklyStreak,
  dailyRerollsRemaining,
}: StatsPanelProps) {
  return (
    <section className="mb-5 rounded-3xl border border-cyan-300/20 bg-cyan-300/4 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-black">
            Character Stats
          </h2>

          <p className="text-xs text-cyan-300">
            Lifetime stat experience
          </p>
        </div>

        <span className="rounded-xl bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-300">
          RPG Profile
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {statOrder.map((stat) => (
          <div
            key={stat}
            className="rounded-2xl border border-white/10 bg-black/30 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-cyan-300">
                {stat}
              </span>

              <span className="text-lg font-black text-zinc-100">
                {stats[stat]}
              </span>
            </div>

            <p className="mt-1 text-[10px] text-zinc-500">
              {statLabels[stat]}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-orange-300/20 bg-orange-300/5 p-3 text-center">
          <p className="text-xl font-black text-orange-300">
            🔥 {dailyStreak}
          </p>

          <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Day streak
          </p>
        </div>

        <div className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/5 p-3 text-center">
          <p className="text-xl font-black text-fuchsia-300">
            ⚡ {weeklyStreak}
          </p>

          <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Week streak
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-3 text-center">
          <p className="text-xl font-black text-cyan-300">
            ↻ {dailyRerollsRemaining}
          </p>

          <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">
            Rerolls
          </p>
        </div>
      </div>
    </section>
  );
}