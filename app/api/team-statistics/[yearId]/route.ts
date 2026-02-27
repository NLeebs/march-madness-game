import { getTeamStatisticsByYearId } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const teamStats = await getTeamStatisticsByYearId(yearId);
    return NextResponse.json(teamStats, { status: 200 });
  } catch (error) {
    return handleApiError(error, `/api/team-statistics/${params.yearId}`);
  }
}
