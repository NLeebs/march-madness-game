const numberOfTeams = function(teamStatsState) {
    let numberOfTeams = 0;
    
    Object.keys(teamStatsState.teamStats).forEach((conf) => {
        numberOfTeams += Object.keys(conf).length;
    });

    return numberOfTeams;
};

export default numberOfTeams; 