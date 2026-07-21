import type {
  Quest,
  QuestGroup,
} from "../lib/quests";

type QuestCardProps = {
  quest: Quest;
  group: QuestGroup;
  canReroll?: boolean;
  onToggle: () => void;
  onReroll?: () => void;
};

export default function QuestCard({
  quest,
  group,
  canReroll = false,
  onToggle,
  onReroll,
}: QuestCardProps) {
  return (
    <article
      className={`rounded-2xl border p-3 transition ${
        quest.completed
          ? "border-emerald-500 bg-emerald-500/20"
          : "border-white/10 bg-black/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left transition active:scale-[0.99]"
        >
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

          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {quest.description}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-lime-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-lime-300">
              {quest.type}
            </span>

            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              {group}
            </span>
          </div>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-xl bg-emerald-400/10 px-3 py-1 text-sm font-black text-emerald-300">
            +{quest.xp} XP
          </span>

          {group === "daily" &&
            !quest.completed &&
            canReroll &&
            onReroll && (
              <button
                type="button"
                onClick={onReroll}
                className="rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-300/10 active:scale-95"
              >
                ↻ Reroll
              </button>
            )}
        </div>
      </div>
    </article>
  );
}