import { NextRequest, NextResponse } from "next/server";
import { getTeamsMostUpsetProneByYearId } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const teamsMostUpsetProne = await getTeamsMostUpsetProneByYearId(yearId);
    return NextResponse.json(teamsMostUpsetProne, { status: 200 });
  } catch (error) {
    return handleApiError(error, `/api/teams/upsets/prone/${params.yearId}`);
  }
}
