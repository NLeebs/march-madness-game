export const getTournamentGameResultObj = (
  resultObj,
  gameIndex,
  region = null
) => {
  // Construct Results Object
  let winningTeam;
  let winningScore;
  let losingScore;

  if (resultObj.favoredScore > resultObj.underdogScore) {
    winningTeam = resultObj.favoredTeam;
    winningScore = resultObj.favoredScore;
    losingScore = resultObj.underdogScore;
  } else {
    winningTeam = resultObj.underdogTeam;
    winningScore = resultObj.underdogScore;
    losingScore = resultObj.favoredScore;
  }

  return {
    region,
    gameIndex,
    winningTeam,
    winningScore,
    losingScore,
  };
};
