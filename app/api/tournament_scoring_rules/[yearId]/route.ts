import { getScoringRuleIdByYearId } from "@/application/useCases/GetScoringRulesId";
import { handleApiError } from "@/utils/errorHandling";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } }
) {
  try {
    const { yearId } = params;
    const tournamentScoringRuleId = await getScoringRuleIdByYearId(yearId);

    return NextResponse.json(
      {
        tournamentScoringRuleId,
        message: "Tournament scoring rules ID received",
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(
      error,
      `/api/tournament_scoring_rules/${params.yearId}`
    );
  }
}
