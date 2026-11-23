import type { Dispatch } from "@reduxjs/toolkit";
import type { PlaySeasonResult } from "@/application/useCases/season/PlaySeason";
import type { ConferenceMap } from "@/models";
import { expandSeason } from "@/src/functions/regularSeason/seasonWire";
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
import { teamScheduleActions } from "@/store/teamScheduleSlice";
import { tournamentActions } from "@/store/tournamentSlice";

/**
 * Stores the server's season for the replay: the schedule, every week's
 * results with the selection, and the signed field token. Expands first, so a
 * season that does not match the team stats throws before anything is stored.
 */
export function storeSeason(
  dispatch: Dispatch,
  result: PlaySeasonResult,
  teamStats: ConferenceMap
): void {
  const { schedule, weeks, selection } = expandSeason(result, teamStats);
  dispatch(teamScheduleActions.setSeasonSchedule(schedule));
  dispatch(regularSeasonRecordActions.setSeason({ weeks, selection }));
  dispatch(tournamentActions.setFieldToken(result.fieldToken));
}
