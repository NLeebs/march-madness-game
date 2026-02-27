import { NextRequest, NextResponse } from "next/server";
import { getTeamsInMostFinalsByYear } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const teamsInMostFinals = await getTeamsInMostFinalsByYear(yearId);
    return NextResponse.json(teamsInMostFinals, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      `/api/teams/appearances/finals/${params.yearId}`,
    );
  }
}
