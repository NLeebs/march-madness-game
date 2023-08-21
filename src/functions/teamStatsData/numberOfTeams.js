const numberOfTeams = function(teamStatsObj) {
    // Arugment should be object of conferences
    let numberOfTeams = 0;
    Object.keys(teamStatsObj).forEach((conf) => {
        numberOfTeams += Object.keys(teamStatsObj[conf]).length;
    });

    return numberOfTeams;
};

export default numberOfTeams; 