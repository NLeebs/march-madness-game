import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { appStateActions, RootState } from "@/store";
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
import { tournamentActions } from "@/store/tournamentSlice";
import { selectTournamentField } from "@/src/functions";

export const SelectionSunday = (props) => {
  const dispatch = useDispatch();

  const appState = useSelector((state: RootState) => state.appState);
  const seasonResults = useSelector(
    (state: RootState) => state.regularSeasonRecords.records
  );
  const conferenceArrs = useSelector(
    (state: RootState) => state.teamStats.conferenceArrays
  );
  const tournamentTeams = useSelector(
    (state: RootState) => state.tournament.tournamentTeams
  );

  // Select and dispatch
  useEffect(() => {
    if (appState.selectionSunday === true && tournamentTeams.length === 0) {
      const selection = selectTournamentField(seasonResults, conferenceArrs);
      selection.conferenceChampions.forEach((confChampion) =>
        dispatch(regularSeasonRecordActions.addConferenceChampion({ confChampion }))
      );
      selection.sixteenSeedPlayins.forEach((team) =>
        dispatch(tournamentActions.setPlayinTeams({ seed: 16, team }))
      );
      selection.elevenSeedPlayins.forEach((team) =>
        dispatch(tournamentActions.setPlayinTeams({ seed: 11, team }))
      );
      dispatch(tournamentActions.addTournamentTeams(selection.field));
      dispatch(tournamentActions.setTournamentSeeds());
    }
  }, [dispatch, appState, seasonResults, conferenceArrs, tournamentTeams]);

  return null;
};
