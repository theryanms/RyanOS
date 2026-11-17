import { useState } from "react";
import {
  dailyQuestCatalog,
  type RyanOSState,
  type StatType,
} from "../lib/quests";

export default function QuestOptions({
  state,
  onChange,
}: {
  state: RyanOSState;
  onChange: (update: (state: RyanOSState) => RyanOSState) => void;
}) {
  const [title, setTitle] = useState("");
  const [stat, setStat] = useState<StatType>("INT");
  const [xp, setXP] = useState(15);
  const [filter, setFilter] = useState("");
  return (
    <details className="panel mb-5">
      <summary className="cursor-pointer font-bold">
        Quest library & custom quests
      </summary>
      <p className="muted my-3">
        Add optional daily quests before your daily clear. Every quest awards
        its listed XP and stat experience. Undo reverses both.
      </p>
      {state.dailyBonusAwarded ? (
        <p className="text-emerald-300">
          Daily clear earned. More quests unlock tomorrow.
        </p>
      ) : (
        <>
          <label>
            Search the library
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Music, walk, read…"
            />
          </label>
          <div className="my-3 max-h-64 space-y-2 overflow-y-auto">
            {dailyQuestCatalog
              .filter((q) =>
                q.title.toLowerCase().includes(filter.toLowerCase()),
              )
              .map((q) => {
                const added = state.dailyQuests.some(
                  (existing) => existing.title === q.title,
                );
                return (
                  <button
                    className="library-option"
                    key={q.title}
                    disabled={added}
                    onClick={() =>
                      onChange((s) =>
                        s.dailyBonusAwarded ||
                        s.dailyQuests.some(
                          (existing) => existing.title === q.title,
                        )
                          ? s
                          : {
                              ...s,
                              dailyQuests: [
                                ...s.dailyQuests,
                                {
                                  ...q,
                                  id: `custom-${crypto.randomUUID()}`,
                                  completed: false,
                                },
                              ],
                            },
                      )
                    }
                  >
                    {q.title}
                    <span>{added ? "Added" : `+${q.xp} XP · ${q.type}`}</span>
                  </button>
                );
              })}
          </div>
          <form
            className="space-y-3 border-t border-white/10 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              onChange((s) =>
                s.dailyBonusAwarded
                  ? s
                  : {
                      ...s,
                      dailyQuests: [
                        ...s.dailyQuests,
                        {
                          id: `custom-${crypto.randomUUID()}`,
                          title: title.trim(),
                          description: "Personal quest",
                          xp,
                          type: stat,
                          completed: false,
                        },
                      ],
                    },
              );
              setTitle("");
            }}
          >
            <label>
              Custom quest
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What will you accomplish?"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label>
                Stat
                <select
                  value={stat}
                  onChange={(e) => setStat(e.target.value as StatType)}
                >
                  {Object.keys(state.stats).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                XP
                <input
                  type="number"
                  min={5}
                  max={100}
                  required
                  value={xp}
                  onChange={(e) => setXP(Number(e.target.value))}
                />
              </label>
            </div>
            <button className="action">Add quest</button>
          </form>
        </>
      )}
    </details>
  );
}
