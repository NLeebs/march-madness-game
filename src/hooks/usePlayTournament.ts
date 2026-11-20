import { useIsMutating, useMutation } from "@tanstack/react-query";
import { playTournamentPost } from "@/src/utils";

const PLAY_TOURNAMENT_KEY = ["playTournament"];

/** Plays the tournament on the server. A failed request throws to the error boundary. */
export const usePlayTournament = () =>
  useMutation({
    mutationKey: PLAY_TOURNAMENT_KEY,
    mutationFn: playTournamentPost,
    throwOnError: true,
  });

/** True while the picks are being sent, so the bracket can lock them. */
export const useIsPlayingTournament = () =>
  useIsMutating({ mutationKey: PLAY_TOURNAMENT_KEY }) > 0;
