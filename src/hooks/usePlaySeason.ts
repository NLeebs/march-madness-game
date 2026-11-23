import { useMutation, useMutationState } from "@tanstack/react-query";
import type { PlaySeasonResult } from "@/application/useCases/season/PlaySeason";
import { playSeasonPost } from "@/src/utils/playSeasonPost";

const PLAY_SEASON_KEY = ["playSeason"];

interface UsePlaySeasonOptions {
  /**
   * Runs when the season arrives, even if the calling component has unmounted
   * by then (the start screen goes away before a slow response). Callbacks
   * passed to mutate() would be skipped in that case. A throw here fails the
   * mutation, so it reaches the error boundary like a failed request.
   */
  onSuccess?: (result: PlaySeasonResult) => void;
}

/** Plays the regular season on the server. A failed request throws to the error boundary. */
export const usePlaySeason = ({ onSuccess }: UsePlaySeasonOptions = {}) =>
  useMutation({
    mutationKey: PLAY_SEASON_KEY,
    mutationFn: playSeasonPost,
    throwOnError: true,
    onSuccess,
  });

/**
 * Rethrows a failed season request during render, so the error boundary shows
 * the crash screen. throwOnError only reaches components that are still
 * observing the mutation; the start screen is gone a second after Start, so
 * the game (App) calls this to catch a failure that comes later.
 */
export const useRethrowPlaySeasonError = (): void => {
  const errors = useMutationState({
    filters: { mutationKey: PLAY_SEASON_KEY },
    select: (mutation) => mutation.state.error,
  });
  // The latest request is the current game's.
  const latest = errors[errors.length - 1];
  if (latest) throw latest;
};
