import { NextRequest, NextResponse } from "next/server";
import { getTeamsWithMostChampionshipsByYear } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const teamsWithMostChampionships =
      await getTeamsWithMostChampionshipsByYear(yearId);
    return NextResponse.json(teamsWithMostChampionships, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      `/api/teams/appearances/championships/${params.yearId}`,
    );
  }
}
