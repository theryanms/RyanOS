type XPBarProps = {
  currentXP: number;
  nextLevelXP: number;
};

export default function XPBar({
  currentXP,
  nextLevelXP,
}: XPBarProps) {
  const percentage = (currentXP / nextLevelXP) * 100;

  return (
    <>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-zinc-400">XP to next level</span>

        <span className="font-bold text-emerald-300">
          {currentXP} / {nextLevelXP}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </>
  );
}