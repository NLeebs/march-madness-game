import { NextRequest, NextResponse } from "next/server";
import { getTeamsThatCausedMostUpsetsByYearId } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const teamsThatCausedMostUpsets =
      await getTeamsThatCausedMostUpsetsByYearId(yearId);
    return NextResponse.json(teamsThatCausedMostUpsets, { status: 200 });
  } catch (error) {
    return handleApiError(error, `/api/teams/upsets/caused/${params.yearId}`);
  }
}
