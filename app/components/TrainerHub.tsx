"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  effectiveness,
  exportTeam,
  importTeam,
  natures,
  newMember,
  teamStorageKey,
  teamSuggestions,
  parseTeams,
  toID,
  types,
  teraTypes,
  type Member,
  type Move,
  type Species,
  type Team,
} from "../lib/trainer";
import { downloadFile } from "../lib/files";
import { notifyLocalChange } from "../lib/preferences";
import StatEditor from "./StatEditor";
import {
  changeStatSystem,
  isRegMC,
  regMCIds,
  rulesetIssues,
} from "../lib/rulesets";

const MatchupCalculator = dynamic(() => import("./MatchupCalculator"), {
  loading: () => (
    <p className="notice" role="status">
      Loading damage calculator…
    </p>
  ),
});

export default function TrainerHub() {
  const [dex, setDex] = useState<Record<string, Species>>({});
  const [moves, setMoves] = useState<Record<string, Move>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [dataError, setDataError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/data/pokedex.json").then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      }),
      fetch("/data/moves.json").then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      }),
    ])
      .then(([species, moveData]) => {
        if (active) {
          setDex(species);
          setMoves(moveData);
          setDataError("");
        }
      })
      .catch(() => {
        if (active)
          setDataError(
            "Could not load the bundled Pokédex. Retry to load species and moves.",
          );
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    try {
      const saved = parseTeams(
        JSON.parse(localStorage.getItem(teamStorageKey) ?? "[]"),
      );
      // Browser storage is read after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTeams(saved);
      setSelected(saved[0]?.id ?? "");
      setLoaded(true);
    } catch {
      setMessage(
        "Saved teams could not be read. Export a browser backup before replacing them.",
      );
    }
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(teamStorageKey, JSON.stringify(teams));
      notifyLocalChange();
    } catch {
      /* Keep the current team available for export. */
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(
        "Team save failed. Download the team before closing this page.",
      );
    }
  }, [teams, loaded]);

  const team = teams.find((t) => t.id === selected);
  const champions = team ? isRegMC(team) : false;
  const legalityIssues = team ? rulesetIssues(team, dex) : [];
  const suggestions = team ? teamSuggestions(team, dex) : [];
  const matches = Object.values(dex)
    .filter(
      (p) =>
        p.num > 0 &&
        (!champions || regMCIds.has(toID(p.name))) &&
        toID(p.name).includes(toID(search)),
    )
    .slice(0, 30);
  function updateTeam(update: Partial<Team>) {
    setTeams((current) =>
      current.map((t) => (t.id === selected ? { ...t, ...update } : t)),
    );
  }
  function updateMember(id: string, update: Partial<Member>) {
    if (team)
      updateTeam({
        members: team.members.map((m) =>
          m.id === id ? { ...m, ...update } : m,
        ),
      });
  }
  function createTeam() {
    const created: Team = {
      id: crypto.randomUUID(),
      name: `League team ${teams.length + 1}`,
      format: "Gen 9 Singles",
      notes: "",
      members: [],
    };
    setTeams([...teams, created]);
    setSelected(created.id);
    setMessage("");
  }
  return (
    <section className="space-y-5" aria-label="Trainer Hub">
      <div className="panel">
        <div className="section-heading">
          <div>
            <h2>Trainer Hub</h2>
            <p className="muted">
              Build six-Pokémon lineups for each league matchup.
            </p>
          </div>
          <button className="action" disabled={!loaded} onClick={createTeam}>
            New team
          </button>
        </div>
        <p className="muted mt-3">
          Teams save on this device and sync when you sign in. Use Showdown
          export to take a lineup into battle. Format and season restrictions
          are set by your league.
        </p>
        {dataError && (
          <p role="alert">
            {dataError}{" "}
            <button className="action" onClick={() => setAttempt((n) => n + 1)}>
              Retry
            </button>
          </p>
        )}
        {!Object.keys(dex).length && !dataError && (
          <p role="status">Loading Pokédex…</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {teams.map((t) => (
            <button
              className={`tab ${selected === t.id ? "selected" : ""}`}
              key={t.id}
              onClick={() => {
                setSelected(t.id);
                setText("");
                setMessage("");
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
        {!teams.length && (
          <p className="mt-4 text-zinc-400">
            Create your first team to start building.
          </p>
        )}
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {team && (
        <>
          <div className="panel space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Team name
                <input
                  maxLength={100}
                  value={team.name}
                  onChange={(e) => updateTeam({ name: e.target.value })}
                />
              </label>
              <label>
                Ruleset
                <select
                  value={team.ruleset ?? "custom"}
                  onChange={(event) => {
                    const next = event.target.value === "reg-m-c";
                    updateTeam({
                      ruleset: next ? "reg-m-c" : "custom",
                      format: next ? "VGC 2026 REG M-C" : "Gen 9 Singles",
                      members: team.members.map((member) =>
                        changeStatSystem(member, next),
                      ),
                    });
                    setCalculatorOpen(false);
                    setMessage(
                      "Ruleset updated. Review the converted levels and stat allocations before exporting.",
                    );
                  }}
                >
                  <option value="custom">Custom / Gen 9</option>
                  <option value="reg-m-c">VGC 2026 REG M-C · Champions</option>
                </select>
              </label>
              <label>
                League / season notes
                <input
                  maxLength={100}
                  value={team.format}
                  onChange={(e) => updateTeam({ format: e.target.value })}
                  placeholder="Season 4 · Week 1 · Gen 9"
                />
              </label>
            </div>
            <label>
              Matchup notes & draft roster
              <textarea
                value={team.notes}
                onChange={(e) => updateTeam({ notes: e.target.value })}
                placeholder="Opponent, roster, threats, game plan, league rules…"
                rows={3}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                className="action"
                onClick={() => {
                  const copy = {
                    ...team,
                    id: crypto.randomUUID(),
                    name: `${team.name} copy`,
                    members: team.members.map((m) => ({
                      ...m,
                      id: crypto.randomUUID(),
                    })),
                  };
                  setTeams([...teams, copy]);
                  setSelected(copy.id);
                }}
              >
                Duplicate team
              </button>
              <button
                className="action danger"
                onClick={() => {
                  if (window.confirm(`Delete ${team.name}?`)) {
                    setTeams(teams.filter((t) => t.id !== selected));
                    setSelected(teams.find((t) => t.id !== selected)?.id ?? "");
                  }
                }}
              >
                Delete team
              </button>
            </div>
          </div>
          {champions && (
            <div className="panel space-y-2">
              <h3 className="font-bold">REG M-C rules</h3>
              <p className="muted">
                Champions · level 50 · bring 6, choose 4 · Mega Evolution · 66
                stat points, max 32 per stat · Species and Item Clauses.
              </p>
              <a
                className="muted underline"
                href="https://github.com/smogon/pokemon-showdown/blob/master/data/mods/champions/formats-data.ts"
                target="_blank"
                rel="noreferrer"
              >
                Eligibility list · Showdown snapshot, November 17, 2026
              </a>
              {legalityIssues.map((issue) => (
                <p className="text-sm text-amber-200" key={issue}>
                  {issue}
                </p>
              ))}
            </div>
          )}
          <div className="panel">
            <h3 className="font-bold">Add Pokémon · {team.members.length}/6</h3>
            <label className="mt-3">
              Search species or form
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Garchomp, Rotom-Wash…"
              />
            </label>
            <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
              {matches.map((p) => (
                <button
                  className="library-option"
                  disabled={team.members.length >= 6}
                  key={p.name}
                  onClick={() => {
                    updateTeam({
                      members: [...team.members, newMember(p, champions)],
                    });
                    setSearch("");
                  }}
                >
                  {p.name}
                  <span>{p.types.join(" / ")}</span>
                </button>
              ))}
            </div>
            {search && !matches.length && Object.keys(dex).length > 0 && (
              <p className="muted mt-3">
                No matching species. Try the base name or another form.
              </p>
            )}
          </div>
          <div className="panel">
            <div className="section-heading">
              <div>
                <h3 className="font-bold">Battle matchups</h3>
                <p className="muted">
                  Compare your saved sets against an opponent with Showdown
                  damage calculations.
                </p>
              </div>
              <button
                className="action"
                disabled={!team.members.length || !Object.keys(dex).length}
                aria-expanded={calculatorOpen}
                onClick={() => setCalculatorOpen((open) => !open)}
              >
                {calculatorOpen ? "Close calculator" : "Open calculator"}
              </button>
            </div>
            {!team.members.length && (
              <p className="muted mt-2">
                Add a Pokémon to this lineup to calculate matchups.
              </p>
            )}
          </div>
          {calculatorOpen &&
            team.members.length > 0 &&
            Object.keys(dex).length > 0 && (
              <MatchupCalculator
                key={`${team.id}-${team.ruleset ?? "custom"}`}
                team={team}
                dex={dex}
              />
            )}
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {team.members.map((member) => {
              const species = dex[toID(member.species)];
              return (
                <article
                  className="panel pokemon-card space-y-4"
                  key={member.id}
                >
                  <div className="section-heading">
                    <div>
                      <h3 className="text-xl font-bold">{member.species}</h3>
                      <p className="text-sm text-amber-200">
                        {species?.types.join(" / ")}
                      </p>
                    </div>
                    <button
                      className="action"
                      aria-label={`Remove ${member.species}`}
                      onClick={() =>
                        updateTeam({
                          members: team.members.filter(
                            (m) => m.id !== member.id,
                          ),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      Nickname
                      <input
                        value={member.nickname}
                        maxLength={30}
                        onChange={(e) =>
                          updateMember(member.id, { nickname: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Item
                      <input
                        value={member.item}
                        maxLength={60}
                        onChange={(e) =>
                          updateMember(member.id, { item: e.target.value })
                        }
                        placeholder="Leftovers"
                      />
                    </label>
                    <label>
                      Ability
                      <select
                        value={member.ability}
                        onChange={(e) =>
                          updateMember(member.id, { ability: e.target.value })
                        }
                      >
                        {Array.from(
                          new Set([
                            member.ability,
                            ...Object.values(species?.abilities ?? {}),
                          ]),
                        ).map((a) => (
                          <option key={a}>{a}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Nature
                      <select
                        value={member.nature}
                        onChange={(e) =>
                          updateMember(member.id, { nature: e.target.value })
                        }
                      >
                        {Object.keys(natures).map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Level
                      <input
                        type="number"
                        disabled={champions}
                        min={1}
                        max={100}
                        value={member.level}
                        onChange={(e) =>
                          updateMember(member.id, {
                            level: Math.max(
                              1,
                              Math.min(100, Math.trunc(Number(e.target.value))),
                            ),
                          })
                        }
                      />
                    </label>
                    {!champions && (
                      <label>
                        Tera type
                        <select
                          value={member.tera}
                          onChange={(e) =>
                            updateMember(member.id, { tera: e.target.value })
                          }
                        >
                          {teraTypes.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      Gender
                      <select
                        value={member.gender}
                        onChange={(e) =>
                          updateMember(member.id, { gender: e.target.value })
                        }
                      >
                        <option value="">Unspecified</option>
                        <option>M</option>
                        <option>F</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={member.shiny}
                        onChange={(e) =>
                          updateMember(member.id, { shiny: e.target.checked })
                        }
                      />
                      Shiny
                    </label>
                  </div>
                  <fieldset>
                    <legend className="mb-2 text-sm font-bold">Moves</legend>
                    <div className="grid grid-cols-2 gap-3">
                      {member.moves.map((move, index) => (
                        <label key={index}>
                          Move {index + 1}
                          <input
                            list="move-list"
                            value={move}
                            onChange={(e) =>
                              updateMember(member.id, {
                                moves: member.moves.map((m, i) =>
                                  i === index ? e.target.value : m,
                                ),
                              })
                            }
                          />
                          <span className="muted">
                            {moves[toID(move)]
                              ? `${moves[toID(move)].type} · ${moves[toID(move)].category} · ${moves[toID(move)].basePower} power`
                              : move
                                ? "Custom or unrecognized move"
                                : "Choose a move"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <StatEditor
                    member={member}
                    species={species}
                    onChange={(update) => updateMember(member.id, update)}
                  />
                </article>
              );
            })}
          </div>
          {suggestions.length > 0 && (
            <aside className="panel">
              <h3 className="font-bold">Team suggestions</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-100">
                {suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </aside>
          )}
          {team.members.length > 0 && (
            <div className="panel">
              <h3 className="font-bold">Defensive matchups</h3>
              <p className="muted my-2">
                Base typing, before abilities, items, or Terastallization. Check
                shared weaknesses when choosing your lineup.
              </p>
              <div className="overflow-x-auto">
                <table className="matchup-table">
                  <thead>
                    <tr>
                      <th>Attack</th>
                      {team.members.map((m) => (
                        <th key={m.id}>{m.nickname || m.species}</th>
                      ))}
                      <th>Weak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((t) => (
                      <tr key={t}>
                        <th>{t}</th>
                        {team.members.map((m) => {
                          const value = effectiveness(
                            t,
                            dex[toID(m.species)]?.types ?? [],
                          );
                          return (
                            <td
                              key={m.id}
                              className={
                                value > 1
                                  ? "text-rose-300"
                                  : value < 1
                                    ? "text-emerald-300"
                                    : "text-zinc-500"
                              }
                            >
                              {value}×
                            </td>
                          );
                        })}
                        <td>
                          {
                            team.members.filter(
                              (m) =>
                                effectiveness(
                                  t,
                                  dex[toID(m.species)]?.types ?? [],
                                ) > 1,
                            ).length
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="panel space-y-3">
            <h3 className="font-bold">Showdown import / export</h3>
            <p className="muted">
              Imports replace this lineup after validation. Verify move
              learnsets, items, bans, and draft eligibility against your league
              rules.
            </p>
            <textarea
              aria-label="Showdown team text"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a Showdown team here…"
              className="font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="action"
                disabled={!Object.keys(dex).length || !text.trim()}
                onClick={() => {
                  try {
                    const members = importTeam(text, dex, champions);
                    updateTeam({ members });
                    setMessage(`Imported ${members.length} Pokémon.`);
                  } catch (error) {
                    setMessage((error as Error).message);
                  }
                }}
              >
                Import lineup
              </button>
              <button
                className="action"
                onClick={() => {
                  setText(exportTeam(team));
                  setMessage("Team export is ready in the text box.");
                }}
              >
                Export to text
              </button>
              <button
                className="action"
                disabled={!team.members.length}
                onClick={() =>
                  downloadFile(
                    `${team.name.replace(/[^a-z0-9-]/gi, "_") || "team"}.txt`,
                    exportTeam(team),
                  )
                }
              >
                Download team
              </button>
            </div>
          </div>
        </>
      )}
      <datalist id="move-list">
        {Object.values(moves).map((m) => (
          <option value={m.name} key={m.name}>
            {m.type} · {m.category}
          </option>
        ))}
      </datalist>
      <p className="muted">
        Species and move data from{" "}
        <a
          href="https://github.com/smogon/pokemon-showdown"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Pokémon Showdown
        </a>
        . Pokémon belongs to its respective owners.
      </p>
    </section>
  );
}
