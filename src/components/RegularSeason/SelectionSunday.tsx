import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { appStateActions, RootState } from "@/store";
import { regularSeasonRecordActions } from "@/store/regularSeasonRecordSlice";
import { tournamentActions } from "@/store/tournamentSlice";
import { GameDataError } from "@/src/functions/generic";

/** Dispatches the server's tournament selection (regularSeasonRecords.season.selection). */
export const SelectionSunday = () => {
  const dispatch = useDispatch();

  const appState = useSelector((state: RootState) => state.appState);
  const season = useSelector(
    (state: RootState) => state.regularSeasonRecords.season
  );
  const tournamentTeams = useSelector(
    (state: RootState) => state.tournament.tournamentTeams
  );

  const selection = season?.selection;

  useEffect(() => {
    if (!selection) return;
    if (appState.selectionSunday === true && tournamentTeams.length === 0) {
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
  }, [dispatch, appState, selection, tournamentTeams]);

  // The season is replayed before Selection Sunday, so it is always stored by now.
  if (!season) throw new GameDataError("no season results", {});

  return null;
};
