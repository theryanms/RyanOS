type ModuleCardProps = {
  title: string;
  subtitle: string;
  status: string;
  symbol: string;
  accent: string;
};

export default function ModuleCard({
  title,
  subtitle,
  status,
  symbol,
  accent,
}: ModuleCardProps) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-lg font-black text-black`}
      >
        {symbol}
      </div>

      <h3 className="font-black">{title}</h3>

      <p className="mt-1 text-xs leading-5 text-zinc-400">
        {subtitle}
      </p>

      <p className="mt-3 rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-400">
        {status}
      </p>
    </article>
  );
}