"use client";

import { useState } from "react";
import StatEditor from "./StatEditor";
import { isRegMC, regMCIds } from "../lib/rulesets";
import { Field, type State } from "@smogon/calc";
import {
  damageMatchup,
  defaultConditions,
  type BattleConditions,
  type DamageRow,
} from "../lib/matchups";
import {
  importTeam,
  natures,
  newMember,
  toID,
  teraTypes,
  type Member,
  type Species,
  type Team,
} from "../lib/trainer";

const statusOptions = {
  "": "Healthy",
  brn: "Burned",
  par: "Paralyzed",
  psn: "Poisoned",
  tox: "Badly poisoned",
  slp: "Asleep",
  frz: "Frozen",
};

function ConditionsEditor({
  label,
  conditions,
  onChange,
  champions = false,
}: {
  label: string;
  conditions: BattleConditions;
  onChange: (value: BattleConditions) => void;
  champions?: boolean;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-white/10 p-3">
      <legend className="px-1 font-bold">{label}</legend>
      <div className="grid grid-cols-2 gap-3">
        <label>
          Current HP %
          <input
            type="number"
            min={1}
            max={100}
            value={conditions.hpPercent}
            onChange={(e) =>
              onChange({
                ...conditions,
                hpPercent: Math.max(1, Math.min(100, Number(e.target.value))),
              })
            }
          />
        </label>
        <label>
          Status
          <select
            value={conditions.status}
            onChange={(e) =>
              onChange({
                ...conditions,
                status: e.target.value as BattleConditions["status"],
              })
            }
          >
            {Object.entries(statusOptions).map(([value, text]) => (
              <option value={value} key={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        {!champions && (
          <label className="flex-row items-center">
            <input
              type="checkbox"
              checked={conditions.teraActive}
              onChange={(e) =>
                onChange({ ...conditions, teraActive: e.target.checked })
              }
            />
            Terastallized
          </label>
        )}
        <label className="flex-row items-center">
          <input
            type="checkbox"
            checked={conditions.abilityActive}
            onChange={(e) =>
              onChange({ ...conditions, abilityActive: e.target.checked })
            }
          />
          Conditional ability active
        </label>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(conditions.boosts).map(([stat, value]) => (
          <label key={stat}>
            {stat.toUpperCase()}
            <select
              aria-label={`${label} ${stat} boost`}
              value={value}
              onChange={(e) =>
                onChange({
                  ...conditions,
                  boosts: {
                    ...conditions.boosts,
                    [stat]: Number(e.target.value),
                  },
                })
              }
            >
              {Array.from({ length: 13 }, (_, i) => i - 6).map((boost) => (
                <option value={boost} key={boost}>
                  {boost > 0 ? "+" : ""}
                  {boost}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SideEditor({
  label,
  side,
  onChange,
}: {
  label: string;
  side: State.Side;
  onChange: (side: State.Side) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-white/10 p-3">
      <legend className="px-1 font-bold">{label}</legend>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["isSR", "Stealth Rock"],
            ["isReflect", "Reflect"],
            ["isLightScreen", "Light Screen"],
            ["isAuroraVeil", "Aurora Veil"],
          ] as const
        ).map(([key, text]) => (
          <label className="flex-row items-center" key={key}>
            <input
              type="checkbox"
              checked={Boolean(side[key])}
              onChange={(e) => onChange({ ...side, [key]: e.target.checked })}
            />
            {text}
          </label>
        ))}
      </div>
      <label>
        Spikes layers
        <select
          value={side.spikes ?? 0}
          onChange={(e) =>
            onChange({ ...side, spikes: Number(e.target.value) })
          }
        >
          {[0, 1, 2, 3].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}

function Results({ title, rows }: { title: string; rows: DamageRow[] }) {
  return (
    <section className="space-y-3">
      <h4 className="font-bold text-cyan-200">{title}</h4>
      {!rows.length && (
        <p className="muted">
          Add moves to this Pokémon to calculate its attacks.
        </p>
      )}
      {rows.map((row, index) => (
        <article
          className="rounded-xl border border-white/10 bg-black/25 p-3"
          key={`${row.move}-${index}`}
        >
          <p className="font-bold">{row.move}</p>
          {row.range && (
            <p className="my-1 text-lg text-emerald-200">{row.range}</p>
          )}
          <p
            className={`text-xs leading-relaxed ${row.error ? "text-rose-300" : "text-zinc-400"}`}
          >
            {row.detail}
          </p>
        </article>
      ))}
    </section>
  );
}

export default function MatchupCalculator({
  team,
  dex,
}: {
  team: Team;
  dex: Record<string, Species>;
}) {
  const champions = isRegMC(team);
  const initialOpponent = champions ? dex.incineroar : dex.blissey;
  const [selected, setSelected] = useState(team.members[0]?.id ?? "");
  const [opponent, setOpponent] = useState<Member | null>(() =>
    initialOpponent ? newMember(initialOpponent, champions) : null,
  );
  const [speciesSearch, setSpeciesSearch] = useState(initialOpponent?.name ?? "");
  const [importText, setImportText] = useState("");
  const [imported, setImported] = useState<Member[]>([]);
  const [message, setMessage] = useState("");
  const [ownConditions, setOwnConditions] =
    useState<BattleConditions>(defaultConditions);
  const [opponentConditions, setOpponentConditions] =
    useState<BattleConditions>(defaultConditions);
  const [field, setField] = useState<Partial<State.Field>>({
    gameType: champions ? "Doubles" : "Singles",
    attackerSide: {},
    defenderSide: {},
  });
  const attacker =
    team.members.find((member) => member.id === selected) ?? team.members[0];
  const outgoing =
    attacker && opponent
      ? damageMatchup(
          attacker,
          opponent,
          ownConditions,
          opponentConditions,
          field,
        )
      : [];
  const incoming =
    attacker && opponent
      ? damageMatchup(
          opponent,
          attacker,
          opponentConditions,
          ownConditions,
          new Field(field).swap(),
        )
      : [];
  function updateOpponent(update: Partial<Member>) {
    if (opponent) setOpponent({ ...opponent, ...update });
  }
  function selectOpponent(member: Member) {
    setOpponent(member);
    setSpeciesSearch(member.species);
    setOpponentConditions(defaultConditions);
    setMessage("");
  }

  return (
    <section className="panel space-y-5" aria-label="Damage calculator">
      <div>
        <h3 className="text-xl font-bold">Damage calculator</h3>
        <p className="muted mt-2">
          {champions
            ? "Champions REG M-C calculations · level 50 · stat points · Mega Evolution."
            : "Gen 9 calculations · EVs and IVs."}{" "}
          Powered by the Showdown engine. Import an opponent’s full set for a
          useful comparison. New opponents start with a neutral nature and no
          stat investment.
        </p>
      </div>
      <label>
        Your Pokémon
        <select
          value={attacker?.id ?? ""}
          onChange={(e) => {
            setSelected(e.target.value);
            setOwnConditions(defaultConditions);
          }}
        >
          {team.members.map((member) => (
            <option value={member.id} key={member.id}>
              {member.nickname || member.species} · {member.item || "No item"} ·
              Lv {member.level}
            </option>
          ))}
        </select>
      </label>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const species = dex[toID(speciesSearch)];
          if (!species) {
            setMessage("Choose a recognized species or form.");
            return;
          }
          if (champions && !regMCIds.has(toID(species.name))) {
            setMessage("This species is outside the REG M-C list.");
            return;
          }
          selectOpponent(newMember(species, champions));
        }}
      >
        <label className="flex-1">
          Opponent species
          <input
            list="matchup-species"
            value={speciesSearch}
            onChange={(e) => setSpeciesSearch(e.target.value)}
          />
        </label>
        <button className="action">Use species</button>
      </form>
      <datalist id="matchup-species">
        {Object.values(dex)
          .filter(
            (species) =>
              species.num > 0 &&
              (!champions || regMCIds.has(toID(species.name))),
          )
          .map((species) => (
            <option value={species.name} key={species.name} />
          ))}
      </datalist>
      <details className="rounded-xl border border-white/10 p-3">
        <summary className="cursor-pointer font-bold">
          Import opponent Showdown sets
        </summary>
        <textarea
          aria-label="Opponent Showdown sets"
          className="mt-3 font-mono"
          rows={5}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Paste an opponent set or a full team…"
        />
        <button
          className="action mt-2"
          onClick={() => {
            try {
              const members = importTeam(importText, dex, champions);
              setImported(members);
              selectOpponent(members[0]);
            } catch (error) {
              setMessage((error as Error).message);
            }
          }}
        >
          Import opponent
        </button>
      </details>
      {imported.length > 0 && (
        <label>
          Imported opponent lineup
          <select
            value={
              imported.some((member) => member.id === opponent?.id)
                ? opponent?.id
                : ""
            }
            onChange={(e) => {
              const member = imported.find((m) => m.id === e.target.value);
              if (member) selectOpponent(member);
            }}
          >
            <option value="" disabled>
              Select a set
            </option>
            {imported.map((member) => (
              <option key={member.id} value={member.id}>
                {member.nickname || member.species}
              </option>
            ))}
          </select>
        </label>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {opponent && (
        <details className="rounded-xl border border-white/10 p-3" open>
          <summary className="cursor-pointer font-bold">
            Opponent set · {opponent.species}
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label>
              Level
              <input
                type="number"
                disabled={champions}
                min={1}
                max={100}
                value={opponent.level}
                onChange={(e) =>
                  updateOpponent({
                    level: Math.max(
                      1,
                      Math.min(100, Math.trunc(Number(e.target.value))),
                    ),
                  })
                }
              />
            </label>
            <label>
              Item
              <input
                value={opponent.item}
                onChange={(e) => updateOpponent({ item: e.target.value })}
                placeholder="Leftovers"
              />
            </label>
            <label>
              Ability
              <select
                value={opponent.ability}
                onChange={(e) => updateOpponent({ ability: e.target.value })}
              >
                {Array.from(
                  new Set([
                    opponent.ability,
                    ...Object.values(
                      dex[toID(opponent.species)]?.abilities ?? {},
                    ),
                  ]),
                ).map((ability) => (
                  <option key={ability}>{ability}</option>
                ))}
              </select>
            </label>
            <label>
              Nature
              <select
                value={opponent.nature}
                onChange={(e) => updateOpponent({ nature: e.target.value })}
              >
                {Object.keys(natures).map((nature) => (
                  <option key={nature}>{nature}</option>
                ))}
              </select>
            </label>
            {!champions && (
              <label>
                Tera type
                <select
                  value={opponent.tera}
                  onChange={(e) => updateOpponent({ tera: e.target.value })}
                >
                  {teraTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {opponent.moves.map((move, index) => (
              <label key={index}>
                Opponent move {index + 1}
                <input
                  list="move-list"
                  value={move}
                  onChange={(e) =>
                    updateOpponent({
                      moves: opponent.moves.map((current, i) =>
                        i === index ? e.target.value : current,
                      ),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <StatEditor
            member={opponent}
            species={dex[toID(opponent.species)]}
            onChange={updateOpponent}
          />
        </details>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <ConditionsEditor
          label="Your battle state"
          champions={champions}
          conditions={ownConditions}
          onChange={setOwnConditions}
        />
        <ConditionsEditor
          label="Opponent battle state"
          champions={champions}
          conditions={opponentConditions}
          onChange={setOpponentConditions}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          Battle format
          <select
            value={field.gameType}
            onChange={(e) =>
              setField({
                ...field,
                gameType: e.target.value as State.Field["gameType"],
              })
            }
          >
            <option>Singles</option>
            <option>Doubles</option>
          </select>
        </label>
        <label>
          Weather
          <select
            value={field.weather ?? ""}
            onChange={(e) =>
              setField({
                ...field,
                weather: e.target.value
                  ? (e.target.value as State.Field["weather"])
                  : undefined,
              })
            }
          >
            <option value="">None</option>
            {[
              "Sun",
              "Rain",
              "Sand",
              "Snow",
              "Hail",
              "Harsh Sunshine",
              "Heavy Rain",
              "Strong Winds",
            ].map((weather) => (
              <option key={weather}>{weather}</option>
            ))}
          </select>
        </label>
        <label>
          Terrain
          <select
            value={field.terrain ?? ""}
            onChange={(e) =>
              setField({
                ...field,
                terrain: e.target.value
                  ? (e.target.value as State.Field["terrain"])
                  : undefined,
              })
            }
          >
            <option value="">None</option>
            {["Electric", "Grassy", "Psychic", "Misty"].map((terrain) => (
              <option key={terrain}>{terrain}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <SideEditor
          label="Your side"
          side={field.attackerSide ?? {}}
          onChange={(side) => setField({ ...field, attackerSide: side })}
        />
        <SideEditor
          label="Opponent side"
          side={field.defenderSide ?? {}}
          onChange={(side) => setField({ ...field, defenderSide: side })}
        />
      </div>
      <p className="muted">
        Damage percentages use maximum HP. KO text also uses the current HP and
        field conditions above. Other battle effects retain the engine defaults.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <Results
          title={`${attacker?.species ?? "Your Pokémon"} → ${opponent?.species ?? "Opponent"}`}
          rows={outgoing}
        />
        <Results
          title={`${opponent?.species ?? "Opponent"} → ${attacker?.species ?? "Your Pokémon"}`}
          rows={incoming}
        />
      </div>
      <a
        className="action"
        href="https://calc.pokemonshowdown.com/"
        target="_blank"
        rel="noreferrer"
      >
        Open full Showdown calculator
      </a>
    </section>
  );
}
