export const statKeys = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
export type BattleStat = (typeof statKeys)[number];
export type Spread = Record<BattleStat, number>;
export type Species = {
  name: string;
  num: number;
  types: string[];
  baseStats: Spread;
  abilities: Record<string, string>;
};
export type Move = {
  name: string;
  type: string;
  category: string;
  basePower: number;
  accuracy: number | true;
  pp: number;
  shortDesc?: string;
};
export type Member = {
  id: string;
  species: string;
  nickname: string;
  item: string;
  ability: string;
  nature: string;
  level: number;
  tera: string;
  moves: string[];
  evs: Spread;
  ivs: Spread;
  shiny: boolean;
  gender: string;
};
export type Team = {
  id: string;
  name: string;
  format: string;
  notes: string;
  members: Member[];
};
export const teamStorageKey = "ryanos-teams-v1";
export const toID = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]/g, "");
export const spread = (value: number): Spread => ({
  hp: value,
  atk: value,
  def: value,
  spa: value,
  spd: value,
  spe: value,
});
export const natures: Record<string, [BattleStat, BattleStat] | null> = {
  Hardy: null,
  Lonely: ["atk", "def"],
  Brave: ["atk", "spe"],
  Adamant: ["atk", "spa"],
  Naughty: ["atk", "spd"],
  Bold: ["def", "atk"],
  Docile: null,
  Relaxed: ["def", "spe"],
  Impish: ["def", "spa"],
  Lax: ["def", "spd"],
  Timid: ["spe", "atk"],
  Hasty: ["spe", "def"],
  Serious: null,
  Jolly: ["spe", "spa"],
  Naive: ["spe", "spd"],
  Modest: ["spa", "atk"],
  Mild: ["spa", "def"],
  Quiet: ["spa", "spe"],
  Bashful: null,
  Rash: ["spa", "spd"],
  Calm: ["spd", "atk"],
  Gentle: ["spd", "def"],
  Sassy: ["spd", "spe"],
  Careful: ["spd", "spa"],
  Quirky: null,
};
export function newMember(species: Species): Member {
  return {
    id: crypto.randomUUID(),
    species: species.name,
    nickname: "",
    item: "",
    ability: species.abilities["0"],
    nature: "Hardy",
    level: 100,
    tera: species.types[0],
    moves: ["", "", "", ""],
    evs: spread(0),
    ivs: spread(31),
    shiny: false,
    gender: "",
  };
}
export function battleStats(member: Member, species: Species): Spread {
  const result = spread(0);
  for (const stat of statKeys) {
    const base = Math.floor(
      ((2 * species.baseStats[stat] +
        member.ivs[stat] +
        Math.floor(member.evs[stat] / 4)) *
        member.level) /
        100,
    );
    const nature = natures[member.nature];
    const modifier =
      nature?.[0] === stat ? 1.1 : nature?.[1] === stat ? 0.9 : 1;
    result[stat] =
      stat === "hp"
        ? species.name === "Shedinja"
          ? 1
          : base + member.level + 10
        : Math.floor((base + 5) * modifier);
  }
  return result;
}

// Each row describes an attacking type against defending types.
const chart: Record<string, [string[], string[], string[]]> = {
  Normal: [[], ["Rock", "Steel"], ["Ghost"]],
  Fire: [
    ["Grass", "Ice", "Bug", "Steel"],
    ["Fire", "Water", "Rock", "Dragon"],
    [],
  ],
  Water: [["Fire", "Ground", "Rock"], ["Water", "Grass", "Dragon"], []],
  Electric: [["Water", "Flying"], ["Electric", "Grass", "Dragon"], ["Ground"]],
  Grass: [
    ["Water", "Ground", "Rock"],
    ["Fire", "Grass", "Poison", "Flying", "Bug", "Dragon", "Steel"],
    [],
  ],
  Ice: [
    ["Grass", "Ground", "Flying", "Dragon"],
    ["Fire", "Water", "Ice", "Steel"],
    [],
  ],
  Fighting: [
    ["Normal", "Ice", "Rock", "Dark", "Steel"],
    ["Poison", "Flying", "Psychic", "Bug", "Fairy"],
    ["Ghost"],
  ],
  Poison: [
    ["Grass", "Fairy"],
    ["Poison", "Ground", "Rock", "Ghost"],
    ["Steel"],
  ],
  Ground: [
    ["Fire", "Electric", "Poison", "Rock", "Steel"],
    ["Grass", "Bug"],
    ["Flying"],
  ],
  Flying: [["Grass", "Fighting", "Bug"], ["Electric", "Rock", "Steel"], []],
  Psychic: [["Fighting", "Poison"], ["Psychic", "Steel"], ["Dark"]],
  Bug: [
    ["Grass", "Psychic", "Dark"],
    ["Fire", "Fighting", "Poison", "Flying", "Ghost", "Steel", "Fairy"],
    [],
  ],
  Rock: [["Fire", "Ice", "Flying", "Bug"], ["Fighting", "Ground", "Steel"], []],
  Ghost: [["Psychic", "Ghost"], ["Dark"], ["Normal"]],
  Dragon: [["Dragon"], ["Steel"], ["Fairy"]],
  Dark: [["Psychic", "Ghost"], ["Fighting", "Dark", "Fairy"], []],
  Steel: [["Ice", "Rock", "Fairy"], ["Fire", "Water", "Electric", "Steel"], []],
  Fairy: [["Fighting", "Dragon", "Dark"], ["Fire", "Poison", "Steel"], []],
};
export const types = Object.keys(chart);
export const teraTypes = [...types, "Stellar"];

export function teamSuggestions(team: Team, dex: Record<string, Species>) {
  const suggestions: string[] = [];
  if (!team.members.length) return suggestions;
  for (const member of team.members) {
    if (member.moves.filter(Boolean).length < 4)
      suggestions.push(`${member.species} has an open move slot.`);
    if (!Object.values(member.evs).some(Boolean))
      suggestions.push(`Assign EVs to ${member.species} before battling.`);
  }
  for (const type of types) {
    const weak = team.members.filter(
      (member) =>
        effectiveness(type, dex[toID(member.species)]?.types ?? []) > 1,
    ).length;
    const resistant = team.members.some(
      (member) =>
        effectiveness(type, dex[toID(member.species)]?.types ?? []) < 1,
    );
    if (weak >= 3 && !resistant)
      suggestions.push(
        `${weak} Pokémon are weak to ${type} with no type resistance. Consider a switch-in for this matchup.`,
      );
  }
  if (
    new Set(team.members.map((member) => toID(member.species))).size <
    team.members.length
  )
    suggestions.push(
      "Duplicate species selected. Check your league’s Species Clause.",
    );
  if (team.members.length < 6)
    suggestions.push(`${6 - team.members.length} lineup slots remain open.`);
  if (!suggestions.length)
    suggestions.push(
      "All six sets have moves and EVs. Validate the export in Showdown for your league format.",
    );
  return suggestions;
}

export function parseTeams(value: unknown): Team[] {
  if (!Array.isArray(value)) throw Error("Invalid team collection.");
  for (const team of value) {
    if (
      !team ||
      ![team.id, team.name, team.format, team.notes].every(
        (field) => typeof field === "string",
      ) ||
      !Array.isArray(team.members) ||
      team.members.length > 6
    )
      throw Error("Invalid saved team.");
    for (const member of team.members) {
      if (
        !member ||
        ![
          member.id,
          member.species,
          member.nickname,
          member.item,
          member.ability,
          member.nature,
          member.tera,
          member.gender,
        ].every((field) => typeof field === "string") ||
        !Object.hasOwn(natures, member.nature) ||
        !teraTypes.includes(member.tera) ||
        !["", "M", "F"].includes(member.gender) ||
        typeof member.shiny !== "boolean" ||
        !Number.isInteger(member.level) ||
        member.level < 1 ||
        member.level > 100 ||
        !Array.isArray(member.moves) ||
        member.moves.length !== 4 ||
        !member.moves.every((move: unknown) => typeof move === "string")
      )
        throw Error("Invalid saved Pokémon.");
      if (
        statKeys.some(
          (stat) =>
            !Number.isInteger(member.evs?.[stat]) ||
            member.evs[stat] < 0 ||
            member.evs[stat] > 252 ||
            !Number.isInteger(member.ivs?.[stat]) ||
            member.ivs[stat] < 0 ||
            member.ivs[stat] > 31,
        ) ||
        statKeys.reduce((sum, stat) => sum + member.evs[stat], 0) > 510
      )
        throw Error("Invalid saved stat spread.");
    }
  }
  return value;
}

export function effectiveness(attack: string, defending: string[]) {
  const row = chart[attack];
  if (!row) return 1;
  return defending.reduce(
    (value, type) =>
      value *
      (row[2].includes(type)
        ? 0
        : row[0].includes(type)
          ? 2
          : row[1].includes(type)
            ? 0.5
            : 1),
    1,
  );
}
const labels: Record<BattleStat, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};
export function exportTeam(team: Team) {
  return team.members
    .map((m) =>
      [
        `${m.nickname ? `${m.nickname} (${m.species})` : m.species}${m.gender ? ` (${m.gender})` : ""}${m.item ? ` @ ${m.item}` : ""}`,
        `Ability: ${m.ability}`,
        `Level: ${m.level}`,
        ...(m.shiny ? ["Shiny: Yes"] : []),
        `Tera Type: ${m.tera}`,
        `EVs: ${
          statKeys
            .filter((s) => m.evs[s])
            .map((s) => `${m.evs[s]} ${labels[s]}`)
            .join(" / ") || "0 HP"
        }`,
        `${m.nature} Nature`,
        `IVs: ${statKeys.map((s) => `${m.ivs[s]} ${labels[s]}`).join(" / ")}`,
        ...m.moves.filter(Boolean).map((move) => `- ${move}`),
      ].join("\n"),
    )
    .join("\n\n");
}
export function importTeam(
  text: string,
  dex: Record<string, Species>,
): Member[] {
  const blocks = text
    .trim()
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((b) => b.split("\n").filter((l) => !l.startsWith("===")))
    .filter((b) => b.length);
  if (!blocks.length || blocks.length > 6)
    throw new Error("Import between one and six Pokémon per team.");
  return blocks.map((lines) => {
    const [firstLine, item = ""] = lines[0].split(" @ ");
    let header = firstLine;
    const gender = header.match(/ \(([MF])\)$/)?.[1] ?? "";
    header = header.replace(/ \([MF]\)$/, "");
    const named = header.match(/^(.*) \(([^)]+)\)$/);
    const species = dex[toID(named?.[2] ?? header)];
    if (!species) throw new Error(`Unknown Pokémon: ${named?.[2] ?? header}`);
    const member = {
      ...newMember(species),
      nickname: named?.[1] ?? "",
      item,
      gender,
    };
    const moves: string[] = [];
    for (const raw of lines.slice(1)) {
      const line = raw.trim();
      if (line.startsWith("-")) moves.push(line.replace(/^-\s*/, ""));
      else if (line.startsWith("Ability: ")) member.ability = line.slice(9);
      else if (line.startsWith("Tera Type: ")) member.tera = line.slice(11);
      else if (line.startsWith("Level: ")) member.level = Number(line.slice(7));
      else if (line === "Shiny: Yes") member.shiny = true;
      else if (line.endsWith(" Nature")) member.nature = line.slice(0, -7);
      else if (/^(EVs|IVs):/.test(line)) {
        const target = line.startsWith("EVs") ? member.evs : member.ivs;
        for (const part of line.slice(5).split("/")) {
          const match = part
            .trim()
            .match(/^(\d+)\s+(HP|Atk|Def|SpA|SpD|Spe)$/i);
          if (!match) throw new Error(`Invalid stat spread: ${line}`);
          target[match[2].toLowerCase() as BattleStat] = Number(match[1]);
        }
      }
    }
    if (
      moves.length > 4 ||
      member.level < 1 ||
      member.level > 100 ||
      !Number.isInteger(member.level) ||
      !(member.nature in natures) ||
      !teraTypes.includes(member.tera) ||
      statKeys.some((s) => member.evs[s] > 252 || member.ivs[s] > 31) ||
      Object.values(member.evs).reduce((a, b) => a + b, 0) > 510
    )
      throw new Error(
        `Check moves, level, nature, Tera type, EVs, and IVs for ${member.species}.`,
      );
    member.moves = Array.from({ length: 4 }, (_, i) => moves[i] ?? "");
    return member;
  });
}
