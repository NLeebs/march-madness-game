import { NextRequest, NextResponse } from "next/server";
import { getTeamsWithMostTournamentAppearancesByYear } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const teamsWithMostTournamentAppearances =
      await getTeamsWithMostTournamentAppearancesByYear(yearId);
    return NextResponse.json(teamsWithMostTournamentAppearances, {
      status: 200,
    });
  } catch (error) {
    return handleApiError(error, `/api/teams/appearances/${params.yearId}`);
  }
}
