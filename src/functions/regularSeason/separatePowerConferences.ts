import { ConferenceMap } from "@/models";

export const separatePowerConferences = (
  teamStats: ConferenceMap,
  powerConfArr: string[]
) => {
  const otherConfArr = [];

  for (const key in teamStats) {
    if (powerConfArr.includes(key)) {
    } else {
      otherConfArr.push(key);
    }
  }

  return otherConfArr;
};
