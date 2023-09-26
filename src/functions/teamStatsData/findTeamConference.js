export default function findTeamConference(team, confArrsObj) {
    let teamConf;
    const conferences = Object.keys(confArrsObj);
    for (let i = 0; i < conferences.length; i++) {
        if (confArrsObj[conferences[i]].includes(team)) {
            teamConf =  conferences[i];
            break;
        }
    };

    return teamConf;
}