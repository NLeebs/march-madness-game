import { NUMBER_OF_TEAMS, PERCENT_FOULS_THAT_SHOOT_FT } from "@/constants/CONSTANTS";

export default function playGame(team1Stats, team2Stats) {
    
    // Functions
    const determineBiasedStat = (favoredStat, underdogStat, isBetter, round) => {
        let statAdvantage = (Math.abs(favoredStat - underdogStat) / 2) * scheduleStrengthAdvantage;
        if ((favoredStat < underdogStat && isBetter === "sync") || isBetter === "lower limit") {
            statAdvantage *= -1;
        } 

        const biasStat = (favoredStat + underdogStat) / 2 + statAdvantage;

        if (round) return  Math.round(biasStat);
        return  biasStat;
    }

    const determineBiasedReboundStats = (defenseRebound, offenseRebound, isDefenseFavorded) => {
        if (defenseRebound + offenseRebound < 1) return defenseRebound;
        
        const reboundOverlapMid = Math.abs(defenseRebound + offenseRebound - 1) / 2;
        let reboundAdvantage = reboundOverlapMid * scheduleStrengthAdvantage;
        if (!isDefenseFavorded) reboundAdvantage *= -1;

        return defenseRebound - reboundOverlapMid + reboundAdvantage;
    }
    
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
    const team1SOS = +team1Stats['schedule-strength'];
    const team2SOS = +team2Stats['schedule-strength'];

    // Determine by how much a team has the advantage
    const scheduleStrengthAdvantage = Math.abs(team1SOS - team2SOS)/NUMBER_OF_TEAMS;

    //// POSSESSIONS ////
    const teamFavoredPossessions = +teamFavored.possessions;
    const teamUnderdogPossessions = +teamUnderdog.possessions;

    const halftime = determineBiasedStat(teamFavoredPossessions, teamUnderdogPossessions, "sync", "round");
    const possessions = halftime * 2;
    
    //// TURNOVER PERCENTAGES ////
    const teamFavoredTurnoverRate = +teamUnderdog["stats-defense"]["cause-turnover-percentage"];
    const teamUnderdogTurnoverRate = +teamFavored["stats-defense"]["cause-turnover-percentage"];
    
    //// FOUL PERCENTAGES ////
    const teamFavoredCauseFoulPercentage = determineBiasedStat(teamFavored["stats-offensive"]["draw-foul-percentage"], teamUnderdog["stats-defense"]["commit-foul-percentage"], "upper limit");
    const teamUnderdogCauseFoulPercentage = determineBiasedStat(teamFavored["stats-defense"]["commit-foul-percentage"], teamUnderdog["stats-offensive"]["draw-foul-percentage"], "lower limit");

    //// SHOOTING PERCENTAGES ////
    // Shot Ratios
    const teamFavoredTwoPointAttemptRatio = teamFavored["stats-offensive"]["two-point-attempt-percentage"];
    const teamUnderdogTwoPointAttemptRatio = teamUnderdog["stats-offensive"]["two-point-attempt-percentage"];

    // Two Point Percentage
    const teamFavoredTwoPointPercentage = determineBiasedStat(teamFavored["stats-offensive"]["two-point-percentage"], teamUnderdog["stats-defense"]["opp-two-point-percentage"], "upper limit");
    const teamUnderdogTwoPointPercentage = determineBiasedStat(teamFavored["stats-defense"]["opp-two-point-percentage"], teamUnderdog["stats-offensive"]["two-point-percentage"], "sync");

     // Three Point Percentage
    const teamFavoredThreePointPercentage = determineBiasedStat(teamFavored["stats-offensive"]["three-point-percentage"], teamUnderdog["stats-defense"]["opp-three-point-percentage"], "upper limit");
    const teamUnderdogThreePointPercentage = determineBiasedStat(teamFavored["stats-defense"]["opp-three-point-percentage"], teamUnderdog["stats-offensive"]["three-point-percentage"], "sync");

    // Free Throw Percentage
    const teamFavoredFreeThrowPercentage = teamFavored["stats-offensive"]["free-throw-percentage"];
    const teamUnderdogFreeThrowPercentage = teamUnderdog["stats-offensive"]["free-throw-percentage"];
   
    //// REBOUNDS ////
    const teamFavoredReboundPercentage = determineBiasedReboundStats(teamFavored["stats-defense"]["defensive-rebound-percentage"], teamUnderdog["stats-offensive"]["offensive-rebound-percentage"], true);
    const teamUnderdogReboundPercentage = determineBiasedReboundStats(teamUnderdog["stats-defense"]["defensive-rebound-percentage"], teamFavored["stats-offensive"]["offensive-rebound-percentage"], false);
   
    //// GAME TIME ////
    let favoredScore = 0;
    let underdogScore = 0;
    let favoredFouls = 0;
    let underdogFouls = 0;
    let potentialPoints = 0;
    let secondHalf = false;
    
    // Game functions
    const changePossession = () => {favoredHasPossession = !favoredHasPossession;}
    const favoredShootFT = (numberOfShots) => {
        let missedLastFT;
        for (let FT = 1; FT <= numberOfShots; FT++) {
            if (teamFavoredFreeThrowPercentage >= Math.random()) {
                favoredScore++;
                missedLastFT = false;
            } else missedLastFT = true;
        }
        return missedLastFT;
    }
    const underdogShootFT = (numberOfShots) => {
        let missedLastFT;
        for (let FT = 1; FT <= numberOfShots; FT++) {
            if (teamUnderdogFreeThrowPercentage >= Math.random()) {
                underdogScore++;
                missedLastFT = false;
            } else missedLastFT = true;
        }
        return missedLastFT;
    }

    // The Tipoff
    const tip = Math.random();
    let favoredHasPossession;
    if (tip < .5) favoredHasPossession = true;
    else favoredHasPossession = false; 

    //// The Game
    for (let poss = 1; poss <= possessions; poss++) {

        // Halftime Logic
        if (poss === halftime && secondHalf === false) {
            secondHalf = true;
            favoredFouls = 0;
            underdogFouls = 0;
        }

        // FAVORED TEAM POSSESSION
        if (favoredHasPossession) {
            // Chance of turnover
            if (teamFavoredTurnoverRate >= Math.random()) {
                changePossession();
                continue;
            }

            // Was 2 or 3
            if (teamFavoredTwoPointAttemptRatio >= Math.random()) potentialPoints = 2;
            else potentialPoints = 3;

            // Check if a foul on defense and free throws awarded
            if (teamFavoredCauseFoulPercentage >= Math.random()) {
                underdogFouls++;
                // Shooting Foul
                if (PERCENT_FOULS_THAT_SHOOT_FT >= Math.random()) {
                    let missedLastFT = favoredShootFT(potentialPoints);

                    if (missedLastFT) {
                        if (teamUnderdogReboundPercentage >= Math.random()) {
                            changePossession();
                            continue;
                        } else continue;
                    } else {
                        changePossession();
                        continue;
                    }
                } 
                // Check for Bonus
                else if (underdogFouls >= 7 && underdogFouls < 10) {
                    if (teamFavoredFreeThrowPercentage >= Math.random()) {
                        favoredScore++;
                        if (teamFavoredFreeThrowPercentage >= Math.random()) {
                            favoredScore++;
                            changePossession();
                            continue;
                        }
                        else {
                            if (teamUnderdogReboundPercentage >= Math.random()) {
                                changePossession();
                                continue;
                            } else continue;
                        }
                    } else {
                        if (teamUnderdogReboundPercentage >= Math.random()) {
                            changePossession();
                            continue;
                        } else continue;
                    }
                }
                // Check for double bonus
                else if (underdogFouls >= 10) {
                    let missedLastFT = favoredShootFT(2);
                    if (missedLastFT) {
                        if (teamUnderdogReboundPercentage >= Math.random()) {
                            changePossession();
                            continue;
                        } else continue;
                    } else {
                        changePossession();
                        continue;
                    }
                } 
                // Normal Foul on the floor
                else {
                    poss -= 1;
                    continue;
                }
            }

            // Chance of Scoring
            if (potentialPoints === 2) {
                if (teamFavoredTwoPointPercentage >= Math.random()) {
                    favoredScore += potentialPoints;
                    changePossession();
                    continue;
                } else {
                    if (teamUnderdogReboundPercentage >= Math.random()) {
                        changePossession();
                        continue;
                    } else continue;
                }
            } else if (potentialPoints === 3) {
                if (teamFavoredThreePointPercentage >= Math.random()) {
                    favoredScore += potentialPoints;
                        changePossession();
                        continue;
                } else {
                    if (teamUnderdogReboundPercentage >= Math.random()) {
                        changePossession();
                        continue;
                    } else continue;
                }
            }
            
        // UNDERDOG TEAM POSSESSION
        } else {
            if (teamUnderdogTurnoverRate >= Math.random()) {
                changePossession();
                continue;
            }
            
            // Was 2 or 3
            if (teamUnderdogTwoPointAttemptRatio >= Math.random()) potentialPoints = 2;
            else potentialPoints = 3;

            // Check if a foul on defense and free throws awarded
            if (teamUnderdogCauseFoulPercentage >= Math.random()) {
                favoredFouls++;
                // Shooting Foul
                if (PERCENT_FOULS_THAT_SHOOT_FT >= Math.random()) {
                    let missedLastFT = underdogShootFT(potentialPoints);

                    if (missedLastFT) {
                        if (teamFavoredReboundPercentage >= Math.random()) {
                            changePossession();
                            continue;
                        } else continue;
                    } else {
                        changePossession();
                        continue;
                    }
                } 
                // Check for Bonus
                else if (favoredFouls >= 7 && favoredFouls < 10) {
                    if (teamUnderdogFreeThrowPercentage >= Math.random()) {
                        underdogScore++;
                        if (teamUnderdogFreeThrowPercentage >= Math.random()) {
                            underdogScore++;
                            changePossession();
                            continue;
                        }
                        else {
                            if (teamFavoredReboundPercentage >= Math.random()) {
                                changePossession();
                                continue;
                            } else continue;
                        }
                    } else {
                        if (teamFavoredReboundPercentage >= Math.random()) {
                            changePossession();
                            continue;
                        } else continue;
                    }
                }
                // Check for double bonus
                else if (favoredFouls >= 10) {
                    let missedLastFT = underdogShootFT(2);
                    if (missedLastFT) {
                        if (teamFavoredReboundPercentage >= Math.random()) {
                            changePossession();
                            continue;
                        } else continue;
                    } else {
                        changePossession();
                        continue;
                    }
                }
                // Normal Foul on the floor
                else {
                    poss -= 1;
                    continue;
                }
            }

            // Chance of Scoring
            if (potentialPoints === 2) {
                if (teamUnderdogTwoPointPercentage >= Math.random()) {
                    underdogScore += potentialPoints;
                    changePossession();
                    continue;
                } else {
                    if (teamFavoredReboundPercentage >= Math.random()) {
                        changePossession();
                        continue;
                    } else continue;
                }
            } else if (potentialPoints === 3) {
                if (teamUnderdogThreePointPercentage >= Math.random()) {
                    underdogScore += potentialPoints;
                        changePossession();
                        continue;
                } else {
                    if (teamFavoredReboundPercentage >= Math.random()) {
                        changePossession();
                        continue;
                    } else continue;
                }
            }
        }

    }
    
    // Buzzer Beater!
    while (favoredScore === underdogScore) {
        // Favored Chance to win
        if (favoredHasPossession) {
            if (teamFavoredThreePointPercentage >= Math.random()) {
                favoredScore += 1;
                    changePossession();
                }
            } else {
                if (teamUnderdogThreePointPercentage >= Math.random()) {
                    underdogScore += 1;
                    changePossession();
            }
        }
    }

    // Return game result object
    return {
        favoredTeam: teamFavored.name,
        favoredScore,
        favoredRPI: +teamFavored.rpi,
        underdogTeam: teamUnderdog.name,
        underdogScore,
        underdogRPI: +teamUnderdog.rpi,
    }
}
