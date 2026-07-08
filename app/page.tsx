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

const quests = [
  { title: "Code for 30 minutes", xp: 25, type: "INT" },
  { title: "Clean one area", xp: 15, type: "CON" },
  { title: "Go for a walk", xp: 20, type: "STR" },
];

export default function Home() {
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
            </div>

            <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-right">
              <p className="text-xs text-emerald-200">LVL</p>
              <p className="text-2xl font-black text-emerald-300">01</p>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-400">XP to next level</span>
            <span className="font-bold text-emerald-300">70 / 100</span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full w-[70%] rounded-full bg-gradient-to-r from-emerald-400 to-lime-300" />
          </div>
        </header>

        <section className="mb-5">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-black">Active Modules</h2>
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              v0.1
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {modules.map((module) => (
              <article
                key={module.name}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl"
              >
                <div
                  className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${module.accent} text-lg font-black text-black`}
                >
                  {module.symbol}
                </div>

                <h3 className="font-black">{module.name}</h3>
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  {module.subtitle}
                </p>

                <p className="mt-3 rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-400">
                  {module.status}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-5 rounded-3xl border border-lime-300/20 bg-lime-300/[0.05] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-black">Today&apos;s Quests</h2>
            <span className="text-xs text-lime-300">3 available</span>
          </div>

          <div className="space-y-3">
            {quests.map((quest) => (
              <div
                key={quest.title}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-3"
              >
                <div>
                  <p className="text-sm font-bold">{quest.title}</p>
                  <p className="text-xs text-zinc-500">{quest.type} quest</p>
                </div>

                <p className="rounded-xl bg-emerald-400/10 px-3 py-1 text-sm font-black text-emerald-300">
                  +{quest.xp} XP
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-auto rounded-3xl border border-green-400/20 bg-black/60 p-4 font-mono shadow-2xl shadow-green-500/10">
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-green-300">
            Terminal
          </p>
          <p className="text-sm text-green-300">
            &gt; boot RyanOS_v0.1
            <br />
            &gt; load quest_log
            <br />
            &gt; trainer_hub standing by
            <br />
            &gt; visualizer awaiting signal
          </p>
        </section>
      </section>
    </main>
  );
}