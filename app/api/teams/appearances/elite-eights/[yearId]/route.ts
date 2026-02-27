import { NextRequest, NextResponse } from "next/server";
import { getTeamsInMostEliteEightsByYear } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const teamsInMostEliteEights =
      await getTeamsInMostEliteEightsByYear(yearId);
    return NextResponse.json(teamsInMostEliteEights, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      `/api/teams/appearances/elite-eights/${params.yearId}`,
    );
  }
}
