import { NextRequest, NextResponse } from "next/server";
import { getTeamsInMostSweetSixteensByYear } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const teamsInMostSweetSixteens =
      await getTeamsInMostSweetSixteensByYear(yearId);
    return NextResponse.json(teamsInMostSweetSixteens, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      `/api/teams/appearances/sweet-sixteens/${params.yearId}`,
    );
  }
}
