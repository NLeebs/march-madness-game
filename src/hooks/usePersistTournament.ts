import { useMutation } from "@tanstack/react-query";
import { persistTournamentPost } from "@/src/utils";

export const usePersistTournament = () => {
  const { mutate: persistTournamentMutation, isPending } = useMutation({
    mutationFn: persistTournamentPost,
  });

  return { persistTournamentMutation, isPending };
};
