export default function createMatchupsFromSeededArr(seededArr) {
    const matchupArr = [];
    for (let i = 0; i < (seededArr.length / 2); i++) {
        matchupArr.push([seededArr[i], seededArr[seededArr.length - (i + 1)]]);
    }

    return matchupArr;
}