import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";
const load = createRequire(import.meta.url);
load.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const quests = load("../app/lib/quests.ts");
const trainer = load("../app/lib/trainer.ts");
const rules = load("../app/lib/rulesets.ts");
const { damageMatchup } = load("../app/lib/matchups.ts");
const { calcStat } = load("@smogon/calc");
const dex = JSON.parse(
  readFileSync(new URL("../public/data/pokedex.json", import.meta.url), "utf8"),
);

test("daily boards balance all six stats with seven days of non-repeating templates", () => {
  const seen = Object.fromEntries(
    Object.keys(quests.emptyStats).map((stat) => [stat, new Set()]),
  );
  for (let day = 17; day <= 23; day++) {
    const daily = quests.createDailyQuests(`2026-11-${day}`);
    assert.equal(daily.length, 6);
    assert.equal(new Set(daily.map((quest) => quest.type)).size, 6);
    assert.equal(
      daily.reduce((sum, quest) => sum + quest.xp, 0),
      90,
    );
    for (const quest of daily) {
      assert.equal(quest.xp, 15);
      assert.ok(!seen[quest.type].has(quest.title));
      seen[quest.type].add(quest.title);
    }
  }
});
test("rerolls preserve the stat and XP, and completion can be undone without farming bonuses", () => {
  let state = quests.refreshQuestPeriods(quests.emptyState);
  const original = state.dailyQuests[0];
  state = quests.rerollDailyQuest(state, original.id);
  assert.equal(state.dailyQuests[0].type, original.type);
  assert.equal(state.dailyQuests[0].xp, 15);
  assert.notEqual(state.dailyQuests[0].title, original.title);
  for (const quest of state.dailyQuests)
    state = quests.toggleQuestInState(state, quest.id, "daily");
  assert.equal(state.lifetimeXP, 140);
  assert.deepEqual(Object.values(state.stats), [15, 15, 15, 15, 15, 15]);
  const id = state.dailyQuests[0].id;
  state = quests.toggleQuestInState(state, id, "daily");
  assert.equal(state.lifetimeXP, 75);
  state = quests.toggleQuestInState(state, id, "daily");
  assert.equal(state.lifetimeXP, 140);
  assert.equal(state.dailyStreak, 1);
});
test("REG M-C uses sourced eligibility, Champions stats, and compatible import/export", () => {
  assert.ok(rules.regMCIds.has("pikachu"));
  assert.ok(rules.regMCIds.has("raichu"));
  assert.ok(!rules.regMCIds.has("bulbasaur"));
  assert.ok(!rules.regMCIds.has("mewtwo"));
  const member = trainer.newMember(dex.garchomp, true);
  member.evs = { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 };
  member.nature = "Jolly";
  member.moves = ["Earthquake", "Dragon Claw", "Protect", ""];
  const stats = trainer.battleStats(member, dex.garchomp);
  for (const stat of trainer.statKeys)
    assert.equal(
      stats[stat],
      calcStat(
        0,
        stat,
        dex.garchomp.baseStats[stat],
        31,
        member.evs[stat],
        50,
        member.nature,
      ),
    );
  const team = {
    id: "test",
    name: "Season",
    notes: "",
    format: "VGC 2026 REG M-C",
    ruleset: "reg-m-c",
    members: [member],
  };
  const imported = trainer.importTeam(trainer.exportTeam(team), dex, true)[0];
  assert.equal(imported.statSystem, "sp");
  assert.deepEqual(imported.evs, member.evs);
  assert.equal(imported.level, 50);
  assert.throws(() => trainer.importTeam("Garchomp\nEVs: 33 Atk", dex, true));
  assert.throws(() =>
    trainer.importTeam("Garchomp\nEVs: 32 Atk / 32 Spe / 3 HP", dex, true),
  );
  const opponent = trainer.newMember(dex.incineroar, true);
  const result = damageMatchup(member, opponent);
  assert.ok(result[0].range, JSON.stringify(result));
  const duplicate = { ...team, members: [member, { ...member, id: "second" }] };
  assert.ok(
    rules
      .rulesetIssues(duplicate, dex)
      .some((issue) => issue.includes("Species Clause")),
  );
});
