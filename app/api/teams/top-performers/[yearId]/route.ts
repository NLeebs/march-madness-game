import { NextRequest, NextResponse } from "next/server";
import { getTopPerformingTeamsByYear } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const topPerformingTeams = await getTopPerformingTeamsByYear(yearId);
    return NextResponse.json(topPerformingTeams, { status: 200 });
  } catch (error) {
    return handleApiError(error, `/api/teams/top-performers/${params.yearId}`);
  }
}
