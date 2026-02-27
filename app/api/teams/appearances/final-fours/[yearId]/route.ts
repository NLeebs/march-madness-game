import { NextRequest, NextResponse } from "next/server";
import { getTeamsInMostFinalFoursByYear } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const teamsInMostFinalFours = await getTeamsInMostFinalFoursByYear(yearId);
    return NextResponse.json(teamsInMostFinalFours, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      `/api/teams/appearances/final-fours/${params.yearId}`,
    );
  }
}
