import { NextRequest, NextResponse } from "next/server";
import { getTeamsInMostSecondRoundsByYear } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const teamsInMostSecondRounds =
      await getTeamsInMostSecondRoundsByYear(yearId);
    return NextResponse.json(teamsInMostSecondRounds, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      `/api/teams/appearances/second-rounds/${params.yearId}`,
    );
  }
}
