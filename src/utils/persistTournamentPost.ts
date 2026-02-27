import {
  PersistTournamentDto,
  PersistTournamentResult,
} from "@/application/useCases";
import { AppError } from "@/utils/errorHandling";

export const persistTournamentPost = async (
  payload: PersistTournamentDto,
): Promise<PersistTournamentResult> => {
  const response = await fetch("/api/bracket/simulation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new AppError("Failed to persist tournament", response.status);
  }
  const data = await response.json();
  return data as PersistTournamentResult;
};
