import eligibility from "../../public/data/reg-m-c.json";
import {
  statKeys,
  toID,
  spread,
  type Member,
  type Species,
  type Team,
} from "./trainer";
export const regMCIds = new Set(eligibility.ids);
export function isRegMC(team: Team) {
  return team.ruleset === "reg-m-c";
}
export function rulesetIssues(team: Team, dex: Record<string, Species>) {
  if (!isRegMC(team)) return [];
  const issues: string[] = [];
  if (team.members.length !== 6)
    issues.push(
      "REG M-C uses a six-Pokémon roster, with four selected for each battle.",
    );
  const species = new Set<number>();
  const items = new Set<string>();
  for (const member of team.members) {
    const entry = dex[toID(member.species)];
    if (!regMCIds.has(toID(member.species)))
      issues.push(`${member.species} is outside the REG M-C species list.`);
    if (entry && species.has(entry.num))
      issues.push(
        `Species Clause: ${entry.baseSpecies ?? entry.name} appears more than once.`,
      );
    if (entry) species.add(entry.num);
    const item = toID(member.item);
    if (item && items.has(item))
      issues.push(
        `Item Clause: ${member.item} is held by more than one Pokémon.`,
      );
    if (item) items.add(item);
    if (
      member.statSystem !== "sp" ||
      statKeys.some((stat) => member.evs[stat] > 32) ||
      Object.values(member.evs).reduce((a, b) => a + b, 0) > 66
    )
      issues.push(
        `${member.species} needs a Champions stat-point spread (32 per stat, 66 total).`,
      );
  }
  return issues;
}
export function changeStatSystem(member: Member, champions: boolean): Member {
  const alreadyChampions = member.statSystem === "sp";
  if (champions === alreadyChampions)
    return champions ? { ...member, level: 50 } : member;
  const evs = spread(0);
  for (const stat of statKeys)
    evs[stat] = champions
      ? Math.min(32, Math.ceil(member.evs[stat] / 8))
      : Math.max(0, member.evs[stat] * 8 - 4);
  const limit = champions ? 66 : 510;
  let total = Object.values(evs).reduce((a, b) => a + b, 0);
  for (const stat of [...statKeys].reverse()) {
    const remove = Math.min(evs[stat], Math.max(0, total - limit));
    evs[stat] -= remove;
    total -= remove;
  }
  return {
    ...member,
    statSystem: champions ? "sp" : "ev",
    evs,
    ivs: champions ? spread(31) : member.ivs,
    level: champions ? 50 : member.level,
  };
}
