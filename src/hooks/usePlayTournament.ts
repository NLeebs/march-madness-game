import { useMutation } from "@tanstack/react-query";
import { playTournamentPost } from "@/src/utils";

/** Plays the tournament on the server. A failed request throws to the error boundary. */
export const usePlayTournament = () =>
  useMutation({ mutationFn: playTournamentPost, throwOnError: true });
