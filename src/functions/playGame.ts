import {
  SOS_MULTIPLIER,
  NUMBER_OF_TEAMS,
  PERCENT_FOULS_THAT_SHOOT_FT,
} from "@/src/constants";
import { GameResult } from "@/types";
import { TeamStats } from "@/models";

// One team's possession inputs and running game state. `reboundPercentage` is
// this side's rebound chance when it is DEFENDING a missed shot.
interface Side {
  turnoverRate: number;
  twoPointAttemptRatio: number;
  causeFoulPercentage: number;
  twoPointPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  reboundPercentage: number;
  score: number;
  fouls: number; // fouls committed by this side
}

// "switch" = possession changes, "keep" = same team shoots again,
// "replay" = floor foul: the possession does not count (poss -= 1).
type PossessionOutcome = "switch" | "keep" | "replay";

// Returns true if the last free throw was missed.
const shootFreeThrows = (
  shooter: Side,
  numberOfShots: number,
  rng: () => number
): boolean => {
  let missedLastFT = false;
  for (let FT = 1; FT <= numberOfShots; FT++) {
    if (shooter.freeThrowPercentage >= rng()) {
      shooter.score++;
      missedLastFT = false;
    } else missedLastFT = true;
  }
  return missedLastFT;
};

const playPossession = (
  offense: Side,
  defense: Side,
  rng: () => number
): PossessionOutcome => {
  // Chance of turnover
  if (offense.turnoverRate >= rng()) return "switch";

  // Was 2 or 3
  const potentialPoints = offense.twoPointAttemptRatio >= rng() ? 2 : 3;

  // Check if a foul on defense and free throws awarded
  if (offense.causeFoulPercentage >= rng()) {
    defense.fouls++;
    // Shooting Foul
    if (PERCENT_FOULS_THAT_SHOOT_FT >= rng()) {
      const missedLastFT = shootFreeThrows(offense, potentialPoints, rng);
      if (missedLastFT) {
        return defense.reboundPercentage >= rng() ? "switch" : "keep";
      }
      return "switch";
    }
    // Check for Bonus
    else if (defense.fouls >= 7 && defense.fouls < 10) {
      if (offense.freeThrowPercentage >= rng()) {
        offense.score++;
        if (offense.freeThrowPercentage >= rng()) {
          offense.score++;
          return "switch";
        }
      }
      return defense.reboundPercentage >= rng() ? "switch" : "keep";
    }
    // Check for double bonus
    else if (defense.fouls >= 10) {
      const missedLastFT = shootFreeThrows(offense, 2, rng);
      if (missedLastFT) {
        return defense.reboundPercentage >= rng() ? "switch" : "keep";
      }
      return "switch";
    }
    // Normal Foul on the floor
    return "replay";
  }

  // Chance of Scoring
  const shotPercentage =
    potentialPoints === 2
      ? offense.twoPointPercentage
      : offense.threePointPercentage;
  if (shotPercentage >= rng()) {
    offense.score += potentialPoints;
    return "switch";
  }
  return defense.reboundPercentage >= rng() ? "switch" : "keep";
};

export const playGame = (
  team1Stats: TeamStats,
  team2Stats: TeamStats,
  rng: () => number = Math.random
): GameResult => {
  // Functions
  const determineBiasedStat = (
    favoredStat: number,
    underdogStat: number,
    isBetter: string,
    roundToInteger?: boolean
  ) => {
    let statAdvantage =
      (Math.abs(favoredStat - underdogStat) / 2) * scheduleStrengthAdvantage;
    if (
      (favoredStat < underdogStat && isBetter === "sync") ||
      isBetter === "lower limit"
    ) {
      statAdvantage *= -1;
    }

    const biasStat = (favoredStat + underdogStat) / 2 + statAdvantage;

    if (roundToInteger) return Math.round(biasStat);
    return biasStat;
  };

  const determineBiasedReboundStats = (
    defenseRebound: number,
    offenseRebound: number,
    isDefenseFavorded: boolean
  ) => {
    if (defenseRebound + offenseRebound < 1) return defenseRebound;

    const reboundOverlapMid = Math.abs(defenseRebound + offenseRebound - 1) / 2;
    let reboundAdvantage = reboundOverlapMid * scheduleStrengthAdvantage;
    if (!isDefenseFavorded) reboundAdvantage *= -1;

    return defenseRebound - reboundOverlapMid + reboundAdvantage;
  };

  //// FAVORED TEAM ////
  // Determine which team has the advantage
  let teamFavored = team1Stats;
  let teamUnderdog = team2Stats;
  if (+team1Stats.rpi > +team2Stats.rpi) {
    teamFavored = team2Stats;
    teamUnderdog = team1Stats;
  }

  //// STRENGTH OF SCHEDULE ////
  // Strength of Schedule Adjustment
  // Adjusts weight of stats in a team's direction
  const team1SOS = +team1Stats["schedule-strength"];
  const team2SOS = +team2Stats["schedule-strength"];

  // Determine by how much a team has the advantage
  const scheduleStrengthAdvantage =
    (Math.abs(team1SOS - team2SOS) / NUMBER_OF_TEAMS) * SOS_MULTIPLIER;

  //// POSSESSIONS ////
  const teamFavoredPossessions = +teamFavored.possessions;
  const teamUnderdogPossessions = +teamUnderdog.possessions;

  const halftime = determineBiasedStat(
    teamFavoredPossessions,
    teamUnderdogPossessions,
    "sync",
    true
  );
  const possessions = halftime * 2;

  //// TURNOVER PERCENTAGES ////
  const teamFavoredTurnoverRate =
    +teamUnderdog["stats-defense"]["cause-turnover-percentage"];
  const teamUnderdogTurnoverRate =
    +teamFavored["stats-defense"]["cause-turnover-percentage"];

  //// FOUL PERCENTAGES ////
  const teamFavoredCauseFoulPercentage = determineBiasedStat(
    teamFavored["stats-offensive"]["draw-foul-percentage"],
    teamUnderdog["stats-defense"]["commit-foul-percentage"],
    "upper limit"
  );
  const teamUnderdogCauseFoulPercentage = determineBiasedStat(
    teamFavored["stats-defense"]["commit-foul-percentage"],
    teamUnderdog["stats-offensive"]["draw-foul-percentage"],
    "lower limit"
  );

  //// SHOOTING PERCENTAGES ////
  // Shot Ratios
  const teamFavoredTwoPointAttemptRatio =
    teamFavored["stats-offensive"]["two-point-attempt-percentage"];
  const teamUnderdogTwoPointAttemptRatio =
    teamUnderdog["stats-offensive"]["two-point-attempt-percentage"];

  // Two Point Percentage
  const teamFavoredTwoPointPercentage = determineBiasedStat(
    teamFavored["stats-offensive"]["two-point-percentage"],
    teamUnderdog["stats-defense"]["opp-two-point-percentage"],
    "upper limit"
  );
  const teamUnderdogTwoPointPercentage = determineBiasedStat(
    teamFavored["stats-defense"]["opp-two-point-percentage"],
    teamUnderdog["stats-offensive"]["two-point-percentage"],
    "sync"
  );

  // Three Point Percentage
  const teamFavoredThreePointPercentage = determineBiasedStat(
    teamFavored["stats-offensive"]["three-point-percentage"],
    teamUnderdog["stats-defense"]["opp-three-point-percentage"],
    "upper limit"
  );
  const teamUnderdogThreePointPercentage = determineBiasedStat(
    teamFavored["stats-defense"]["opp-three-point-percentage"],
    teamUnderdog["stats-offensive"]["three-point-percentage"],
    "sync"
  );

  // Free Throw Percentage
  const teamFavoredFreeThrowPercentage =
    teamFavored["stats-offensive"]["free-throw-percentage"];
  const teamUnderdogFreeThrowPercentage =
    teamUnderdog["stats-offensive"]["free-throw-percentage"];

  //// REBOUNDS ////
  const teamFavoredReboundPercentage = determineBiasedReboundStats(
    teamFavored["stats-defense"]["defensive-rebound-percentage"],
    teamUnderdog["stats-offensive"]["offensive-rebound-percentage"],
    true
  );
  const teamUnderdogReboundPercentage = determineBiasedReboundStats(
    teamUnderdog["stats-defense"]["defensive-rebound-percentage"],
    teamFavored["stats-offensive"]["offensive-rebound-percentage"],
    false
  );

  //// GAME TIME ////
  const favored: Side = {
    turnoverRate: teamFavoredTurnoverRate,
    twoPointAttemptRatio: teamFavoredTwoPointAttemptRatio,
    causeFoulPercentage: teamFavoredCauseFoulPercentage,
    twoPointPercentage: teamFavoredTwoPointPercentage,
    threePointPercentage: teamFavoredThreePointPercentage,
    freeThrowPercentage: teamFavoredFreeThrowPercentage,
    reboundPercentage: teamFavoredReboundPercentage,
    score: 0,
    fouls: 0,
  };
  const underdog: Side = {
    turnoverRate: teamUnderdogTurnoverRate,
    twoPointAttemptRatio: teamUnderdogTwoPointAttemptRatio,
    causeFoulPercentage: teamUnderdogCauseFoulPercentage,
    twoPointPercentage: teamUnderdogTwoPointPercentage,
    threePointPercentage: teamUnderdogThreePointPercentage,
    freeThrowPercentage: teamUnderdogFreeThrowPercentage,
    reboundPercentage: teamUnderdogReboundPercentage,
    score: 0,
    fouls: 0,
  };
  let secondHalf = false;

  // The Tipoff
  const tip = rng();
  let favoredHasPossession: boolean;
  if (tip < 0.5) favoredHasPossession = true;
  else favoredHasPossession = false;

  //// The Game
  for (let poss = 1; poss <= possessions; poss++) {
    // Halftime Logic
    if (poss === halftime && secondHalf === false) {
      secondHalf = true;
      favored.fouls = 0;
      underdog.fouls = 0;
    }

    const outcome = favoredHasPossession
      ? playPossession(favored, underdog, rng)
      : playPossession(underdog, favored, rng);
    if (outcome === "replay") poss -= 1;
    else if (outcome === "switch") favoredHasPossession = !favoredHasPossession;
  }

  // Buzzer Beater!
  while (favored.score === underdog.score) {
    const offense = favoredHasPossession ? favored : underdog;
    if (offense.threePointPercentage >= rng()) {
      offense.score += 1;
      favoredHasPossession = !favoredHasPossession;
    }
  }

  // Return game result object
  return {
    favoredTeam: teamFavored.name,
    favoredScore: favored.score,
    favoredRPI: +teamFavored.rpi,
    underdogTeam: teamUnderdog.name,
    underdogScore: underdog.score,
    underdogRPI: +teamUnderdog.rpi,
  };
};
