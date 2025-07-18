import { ConferenceArrays } from "@/types";

export const findTeamConference = (
  team: string,
  confArrsObj: ConferenceArrays
): string | undefined => {
  let teamConf: string | undefined;
  const conferences = Object.keys(confArrsObj);
  for (let i = 0; i < conferences.length; i++) {
    if (confArrsObj[conferences[i]].includes(team)) {
      teamConf = conferences[i];
      break;
    }
  }

  return teamConf;
};
