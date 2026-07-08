type XPBarProps = {
  level: number;
  currentXP: number;
  nextLevelXP: number;
};

export default function XPBar({ level, currentXP, nextLevelXP }: XPBarProps) {
  const percentage = Math.min((currentXP / nextLevelXP) * 100, 100);

  return (
    <section className="mb-5 rounded-3xl border border-lime-300/20 bg-lime-300/[0.05] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black">Level {level}</h2>
        <p className="text-sm font-bold text-lime-300">
          {currentXP} / {nextLevelXP} XP
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </section>
  );
}