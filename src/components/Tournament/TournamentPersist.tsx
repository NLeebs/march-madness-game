import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState, TournamentState } from "@/store";
import { TournamentPlayerPicks } from "@/types";
import { SimulationRequestBody } from "@/app/api/bracket/simulation/route";
import { usePersistTournament, useAuth } from "@/src/hooks";
import { getAnonUserId } from "@/src/utils/getAnonUserId";

export const TournamentPersist = () => {
  const tournamentState: TournamentState = useSelector(
    (state: RootState) => state.tournament
  );
  const picksState: TournamentPlayerPicks = useSelector(
    (state: RootState) => state.tournamentPlayersPicks
  );
  const { user } = useAuth();
  const anonUserId = user ? null : getAnonUserId();

  const { persistTournamentMutation } = usePersistTournament();
  const hasPersistedRef = useRef(false);

  useEffect(() => {
    if (
      hasPersistedRef.current ||
      !tournamentState.yearId ||
      !tournamentState.tournamentScoringRulesId
    )
      return;

    const simulationBody: SimulationRequestBody = {
      tournamentState,
      picksState,
      userId: user?.id || null,
      anonUserId,
    };

    persistTournamentMutation(simulationBody);
    hasPersistedRef.current = true;
  }, [
    user?.id,
    persistTournamentMutation,
    tournamentState,
    picksState,
    anonUserId,
  ]);

  return null;
};
