import {
  battleStats,
  statKeys,
  type Member,
  type Species,
} from "../lib/trainer";
const names = {
  hp: "HP",
  atk: "Attack",
  def: "Defense",
  spa: "Sp. Atk",
  spd: "Sp. Def",
  spe: "Speed",
};
export default function StatEditor({
  member,
  species,
  onChange,
}: {
  member: Member;
  species?: Species;
  onChange: (update: Partial<Member>) => void;
}) {
  const champions = member.statSystem === "sp";
  const total = Object.values(member.evs).reduce((a, b) => a + b, 0);
  const limit = champions ? 66 : 510;
  const stats = species ? battleStats(member, species) : null;
  return (
    <fieldset className="stat-editor">
      <legend>Stat allocation</legend>
      <p className="muted mb-3">
        {champions ? "Stat points" : "EVs"} · {total}/{limit} used ·{" "}
        {limit - total} remaining{champions ? " · Level 50 · fixed IVs" : ""}
      </p>
      <div className="overflow-x-auto">
        <table className="stats-grid">
          <thead>
            <tr>
              <th>Stat</th>
              <th>Base</th>
              <th>{champions ? "Points" : "EV"}</th>
              {!champions && <th>IV</th>}
              <th>Final</th>
            </tr>
          </thead>
          <tbody>
            {statKeys.map((stat) => (
              <tr key={stat} data-stat={stat}>
                <th>{names[stat]}</th>
                <td>{species?.baseStats[stat] ?? "—"}</td>
                <td>
                  <input
                    type="number"
                    aria-label={`${member.species} ${stat} ${champions ? "stat points" : "EV"}`}
                    min={0}
                    max={Math.min(
                      champions ? 32 : 252,
                      limit - total + member.evs[stat],
                    )}
                    value={member.evs[stat]}
                    onChange={(event) =>
                      onChange({
                        evs: {
                          ...member.evs,
                          [stat]: Math.max(
                            0,
                            Math.min(
                              champions ? 32 : 252,
                              limit - total + member.evs[stat],
                              Math.trunc(Number(event.target.value)),
                            ),
                          ),
                        },
                      })
                    }
                  />
                </td>
                {!champions && (
                  <td>
                    <input
                      type="number"
                      aria-label={`${member.species} ${stat} IV`}
                      min={0}
                      max={31}
                      value={member.ivs[stat]}
                      onChange={(event) =>
                        onChange({
                          ivs: {
                            ...member.ivs,
                            [stat]: Math.max(
                              0,
                              Math.min(
                                31,
                                Math.trunc(Number(event.target.value)),
                              ),
                            ),
                          },
                        })
                      }
                    />
                  </td>
                )}
                <td className="final-stat">{stats?.[stat] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}
