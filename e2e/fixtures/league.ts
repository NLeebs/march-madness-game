import type { getYears } from "@/application/useCases";
import type { ConferenceMap } from "@/models";
import { POWER_CONFERENCE_LIST } from "@/src/constants";
import { buildLeague } from "@/tests/factories/league.factory";

export const E2E_YEARS: Awaited<ReturnType<typeof getYears>> = [
  { id: "e2e-year-older", year: 2024 },
  { id: "e2e-year-latest", year: 2025 },
];

const LOGO = "/team-logos/acc/DukeLogo.png";

function withLogos(teamStats: ConferenceMap): ConferenceMap {
  const out: ConferenceMap = {};
  for (const [conference, teams] of Object.entries(teamStats)) {
    out[conference] = {};
    for (const [name, stats] of Object.entries(teams)) {
      out[conference][name] = { ...stats, logo: LOGO };
    }
  }
  return out;
}

/**
 * RegularSeason renders the real power-conference keys and crashes if one is
 * missing, so conf02.. are renamed to them. conf01 stays a non-power conference.
 */
function withPowerConferenceNames(teamStats: ConferenceMap): ConferenceMap {
  const out: ConferenceMap = {};
  const powerNames = [...POWER_CONFERENCE_LIST];
  for (const [conference, teams] of Object.entries(teamStats)) {
    const index = Number(conference.replace("conf", "")) - 2;
    out[index >= 0 && index < powerNames.length ? powerNames[index] : conference] = teams;
  }
  return out;
}

/** Latest year: the whole league. Older year: the same league without conf01. */
export function e2eTeamStats(yearId: string): ConferenceMap {
  const league = withPowerConferenceNames(withLogos(buildLeague().teamStats));
  if (yearId === "e2e-year-older") {
    delete league.conf01;
  }
  return league;
}
