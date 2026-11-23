import type { TournamentPlayResult } from "@/src/functions/tournament/simulateTournament";
import type { TournamentPicks } from "./TournamentPicks";

/**
 * Body of POST /api/bracket/simulation. The route validates it with
 * SimulationRequestSchema (app/api/bracket/simulation/schema.ts), which
 * type-checks that its keys match these.
 */
export interface PlayTournamentRequest {
  /** Signed by POST /api/season; the year and field come only from it. */
  fieldToken: string;
  picks: TournamentPicks;
  /** Logged-out player's id; the server ignores it when the session has a user. */
  anonUserId?: string | null;
}

/** Response of POST /api/bracket/simulation. bracketId is null when nothing was saved (a preview deployment). */
export type PlayTournamentResult = TournamentPlayResult & { bracketId: string | null };
