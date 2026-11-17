import {
  calculate,
  Field,
  Generations,
  Move,
  Pokemon,
  toID,
  type State,
} from "@smogon/calc";
import type { Member } from "./trainer";

export type BattleConditions = {
  hpPercent: number;
  status: NonNullable<State.Pokemon["status"]>;
  teraActive: boolean;
  abilityActive: boolean;
  boosts: { atk: number; def: number; spa: number; spd: number; spe: number };
};

export const defaultConditions: BattleConditions = {
  hpPercent: 100,
  status: "",
  teraActive: false,
  abilityActive: true,
  boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
};

export type DamageRow = {
  move: string;
  range?: string;
  detail: string;
  error?: boolean;
};

function combatant(
  member: Member,
  conditions: BattleConditions,
  champions: boolean,
) {
  const generation = Generations.get(champions ? 0 : 9);
  if (
    champions &&
    (member.statSystem !== "sp" ||
      Object.values(member.evs).some((value) => value > 32) ||
      Object.values(member.evs).reduce((a, b) => a + b, 0) > 66)
  )
    throw Error(
      "Choose a Champions stat-point spread before calculating this matchup.",
    );
  if (!generation.species.get(toID(member.species)))
    throw Error(`${member.species} is unavailable in the ${champions ? "Champions" : "Gen 9"} calculator.`);
  if (member.item && !generation.items.get(toID(member.item)))
    throw Error(`Unknown item “${member.item}” on ${member.species}.`);
  if (member.ability && !generation.abilities.get(toID(member.ability)))
    throw Error(`Unknown ability “${member.ability}” on ${member.species}.`);
  const options: ConstructorParameters<typeof Pokemon>[2] = {
    level: member.level,
    ability: member.ability,
    abilityOn: conditions.abilityActive,
    item: member.item,
    nature: member.nature,
    evs: member.evs,
    ivs: member.ivs,
    boosts: conditions.boosts,
    status: conditions.status,
    gender:
      member.gender === "M" || member.gender === "F"
        ? member.gender
        : undefined,
  };
  if (conditions.teraActive && !champions) {
    const type = generation.types.get(toID(member.tera));
    if (!type) throw Error(`Unknown Tera type “${member.tera}”.`);
    options.teraType = type.name;
  }
  const pokemon = new Pokemon(generation, member.species, options);
  pokemon.originalCurHP = Math.max(
    1,
    Math.floor((pokemon.maxHP() * conditions.hpPercent) / 100),
  );
  return pokemon;
}

export function damageMatchup(
  attacker: Member,
  defender: Member,
  attackingConditions = defaultConditions,
  defendingConditions = defaultConditions,
  field: Partial<State.Field> = {},
): DamageRow[] {
  const champions = attacker.statSystem === "sp";
  const generation = Generations.get(champions ? 0 : 9);
  return attacker.moves.filter(Boolean).map((name) => {
    try {
      const moveData = generation.moves.get(toID(name));
      if (!moveData)
        throw Error(`Unknown move “${name}”. Check the move name in the set.`);
      if (moveData.category === "Status")
        return { move: name, detail: "Status move. No direct damage range." };
      const attackingPokemon = combatant(
        attacker,
        attackingConditions,
        champions,
      );
      const defendingPokemon = combatant(
        defender,
        defendingConditions,
        champions,
      );
      const move = new Move(generation, moveData.name, {
        ability: attacker.ability,
        item: attacker.item,
        species: attacker.species,
      });
      const result = calculate(
        generation,
        attackingPokemon,
        defendingPokemon,
        move,
        new Field(field),
      );
      const [min, max] = result.range();
      const hp = defendingPokemon.maxHP();
      const minPercent = (Math.floor((min / hp) * 1000) / 10).toFixed(1);
      const maxPercent = (Math.floor((max / hp) * 1000) / 10).toFixed(1);
      return {
        move: name,
        range: `${min}–${max} HP (${minPercent}–${maxPercent}%)`,
        detail:
          max === 0
            ? "This move deals no damage under the selected battle conditions."
            : result.desc(),
      };
    } catch (error) {
      return { move: name, detail: (error as Error).message, error: true };
    }
  });
}
