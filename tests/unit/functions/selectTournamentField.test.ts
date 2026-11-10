import { describe, it, expect } from "vitest";
import { selectTournamentField } from "@/src/functions";
import { NUMBER_OF_AT_LARGE_TEAMS } from "@/src/constants";
import { buildLeague } from "@/tests/factories";
import { buildRecords } from "@/tests/game/helpers/runGame";

const league = buildLeague();
const confArrs = league.conferenceArrays;
const confs = Object.keys(confArrs);
const N = confs.length;
const allTeams = confs.flatMap((c) => confArrs[c]);
const firstOf = (c: string) => confArrs[c][0];
const champions = confs.map(firstOf);
const idx = (t: string) => allTeams.indexOf(t);
const nonChampions = allTeams.filter((t) => !champions.includes(t));
const K = NUMBER_OF_AT_LARGE_TEAMS;

// First team of each conference wins 20, the rest 10; score falls with league index.
const baseRecords = () =>
  buildRecords(league, (team, i) => ({
    wins: champions.includes(team) ? 20 : 10,
    score: 1000 - i,
  }));

describe("selectTournamentField", () => {
  it("picks each conference's most-wins team, in conference-key order", () => {
    const r = selectTournamentField(baseRecords(), confArrs);
    expect(r.conferenceChampions).toEqual(champions);
  });

  it("breaks conference title ties by highest selection score", () => {
    const [c1, c2, c3] = confs;
    const t1 = confArrs[c1];
    const t2 = confArrs[c2];
    const t3 = confArrs[c3];
    const records = buildRecords(league, (team, i) => {
      const score = 1000 - i;
      if (t1.includes(team))
        return { wins: t1.indexOf(team) < 2 ? 20 : 10, score: team === t1[1] ? 5000 : score };
      if (t2.includes(team))
        return { wins: t2.indexOf(team) < 3 ? 20 : 10, score: team === t2[2] ? 5000 : score };
      if (t3.includes(team))
        return { wins: 12, score: team === t3[3] ? 5000 : score };
      return { wins: champions.includes(team) ? 20 : 10, score };
    });
    const { conferenceChampions } = selectTournamentField(records, confArrs);
    expect(conferenceChampions.slice(0, 3)).toEqual([t1[1], t2[2], t3[3]]);
    expect(conferenceChampions.slice(3)).toEqual(champions.slice(3));
  });

  it("sends the 4 lowest-scoring champions to the 16-seed play-ins, lowest first", () => {
    const r = selectTournamentField(baseRecords(), confArrs);
    expect(r.sixteenSeedPlayins).toEqual([
      champions[N - 1],
      champions[N - 2],
      champions[N - 3],
      champions[N - 4],
    ]);
  });

  it("takes the top non-champions as at-large, last 4 to the 11-seed play-ins", () => {
    const r = selectTournamentField(baseRecords(), confArrs);
    const atLarge = nonChampions.slice(0, K);
    expect(r.elevenSeedPlayins).toEqual(atLarge.slice(-4));
  });

  it("builds a 60-team field sorted by score with 68 distinct teams in all", () => {
    const r = selectTournamentField(baseRecords(), confArrs);
    const atLarge = nonChampions.slice(0, K);
    const expectedField = [
      ...champions.slice(0, N - 4),
      ...atLarge.slice(0, atLarge.length - 4),
    ].sort((a, b) => idx(a) - idx(b));
    expect(r.field).toEqual(expectedField);
    expect(r.field).toHaveLength(60);
    const all = [...r.field, ...r.sixteenSeedPlayins, ...r.elevenSeedPlayins];
    expect(new Set(all).size).toBe(68);
  });

  it("resolves selection-score ties by Object.keys(records) order", () => {
    const records = buildRecords(league, (team) => ({
      wins: champions.includes(team) ? 20 : 10,
      score: champions.includes(team) ? 800 : 500,
    }));
    const r = selectTournamentField(records, confArrs);
    expect(r.sixteenSeedPlayins).toEqual([
      champions[N - 1],
      champions[N - 2],
      champions[N - 3],
      champions[N - 4],
    ]);
    const atLarge = nonChampions.slice(0, 68 - N);
    expect(r.elevenSeedPlayins).toEqual(atLarge.slice(-4));
    expect(r.field).toEqual([
      ...champions.slice(0, N - 4),
      ...atLarge.slice(0, 68 - N - 4),
    ]);
  });

  it("picks a sole-top-wins non-first champion and orders by score, not league order", () => {
    const t1 = confArrs[confs[0]];
    const sole = t1[5];
    const champs = [sole, ...champions.slice(1)];
    const lowMid = champions[10];
    const [late1, late2, late3] = [allTeams[359], allTeams[358], allTeams[357]];
    const m = allTeams.filter(
      (t) => !champs.includes(t) && t !== t1[0] && ![late1, late2, late3].includes(t),
    );
    const special: Record<string, number> = {
      [sole]: 100,
      [lowMid]: 200,
      [t1[0]]: 1,
      [late1]: 5000,
      [late2]: 4900,
      [late3]: 1000 - idx(m[K - 4]) - 0.5,
    };
    const records = buildRecords(league, (team, i) => ({
      wins: champs.includes(team) ? 20 : 10,
      score: team in special ? special[team] : 1000 - i,
    }));
    const r = selectTournamentField(records, confArrs);
    expect(r.conferenceChampions).toEqual(champs);
    const sixteen = [sole, lowMid, champions[N - 1], champions[N - 2]];
    expect(r.sixteenSeedPlayins).toEqual(sixteen);
    expect(r.elevenSeedPlayins).toEqual([m[K - 6], m[K - 5], m[K - 4], late3]);
    const restChamps = champs.filter((t) => !sixteen.includes(t));
    const others = [...restChamps, ...m.slice(0, K - 6)].sort((a, b) => idx(a) - idx(b));
    expect(r.field).toEqual([late1, late2, ...others]);
  });

  it("does not mutate its inputs", () => {
    const records = baseRecords();
    const recordsCopy = JSON.parse(JSON.stringify(records));
    const confCopy = JSON.parse(JSON.stringify(confArrs));
    selectTournamentField(records, confArrs);
    expect(records).toEqual(recordsCopy);
    expect(Object.keys(records)).toEqual(Object.keys(recordsCopy));
    expect(confArrs).toEqual(confCopy);
  });
});
