import { NUMBER_OF_TEAMS } from "@/constants/CONSTANTS";

export default function playGame(team1Stats, team2Stats) {
    
    console.log(team1Stats);
    console.log(team2Stats);

    // Functions
    const determineBiasedStat = (favoredStat, underdogStat, isBetter, round) => {
        let statAdvantage = (Math.abs(favoredStat - underdogStat) / 2) * scheduleStrengthAdvantage;
        if ((favoredStat < underdogStat && isBetter === "sync") || isBetter === "lower limit") {
            statAdvantage *= -1;
        } 

        if (round) return  Math.round((favoredStat + underdogStat) / 2 + statAdvantage);
        return  (favoredStat + underdogStat) / 2 + statAdvantage;
    }
    
    //// FAVORED TEAM ////
     // Determine which team has the advantage
     let teamFavored = team1Stats;
     let teamUnderdog = team2Stats;
     if (+team1Stats.rpi > +team1Stats.rpi) {
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

    const possessions = determineBiasedStat(teamFavoredPossessions, teamUnderdogPossessions, "sync", "round");
    console.log(possessions);
    
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
    

    // Chance of turnover
    // Chance of foul
        // offensive cause foul vs defensive commit foul
        // after 7 shoot free throws
    
    // Was 2 or 3
    // Offense percentage of shots
    
    // Chance of Scoring
    // Offensive type Shooting Percentage vs defense percentage
    
    // Chance of rebound
    // Offense rebound vs defensive rebound
    // Set start of next possession
    
    // loop through all possessions
    
    // returns object of winner, loser, and both scores
}
