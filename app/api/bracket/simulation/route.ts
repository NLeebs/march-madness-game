import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { persistTournament } from "@/application/useCases/PersistTournament";
import { handleApiError } from "@/utils/errorHandling/errorHandler";
import { validateRequest } from "@/utils/errorHandling";
import { TournamentState } from "@/store/tournamentSlice";
import { TournamentPlayerPicks } from "@/types";

export interface SimulationRequestBody {
  tournamentState: TournamentState;
  picksState: TournamentPlayerPicks;
  userId?: string | null;
  anonUserId?: string | null;
}

const SimulationRequestBodySchema = z.object({
  userId: z.string().uuid().nullable().optional(),
  anonUserId: z.string().uuid().nullable().optional(),
  tournamentState: z.object({
    yearId: z.string().min(1, "Year ID is required"),
    tournamentScoringRulesId: z
      .string()
      .min(1, "Tournament scoring rules ID is required"),
    tournamentTeams: z.array(z.string()),
    tournamentSeeds: z.record(z.string(), z.array(z.string())).optional(),
    playinTeams: z.object({
      elevenSeeds: z.array(z.string()),
      sixteenSeeds: z.array(z.string()),
    }),
    roundOneMatchups: z.any(),
    roundTwoMatchups: z.any(),
    roundSweetSixteenMatchups: z.any(),
    roundEliteEightMatchups: z.any(),
    roundFinalFourMatchups: z.any(),
    roundFinalsMatchups: z.any(),
    champion: z.any(),
    playerScore: z.number(),
  }),
  picksState: z.object({
    picks: z.any(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const validatedBody = await validateRequest(SimulationRequestBodySchema)(
      req
    );
    const body: SimulationRequestBody = validatedBody as SimulationRequestBody;

    const result = await persistTournament(body);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error, "/api/bracket/simulation");
  }
}
