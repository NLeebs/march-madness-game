export default function createMatchupsFromSeededArr(seededArr) {
    const matchupArr = [];
    for (let i = 0; i < (seededArr.length / 2); i++) {
        matchupArr.push([
            {
                team: seededArr[i], 
                seed: i + 1,
            }, 
            {
                team: seededArr[seededArr.length - (i + 1)], 
                seed: seededArr.length - i,
            },
        ]);
    }

    return matchupArr;
}