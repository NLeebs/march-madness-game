import { NextRequest, NextResponse } from "next/server";
import { getTopPickedTeamsByYear } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const topPickedTeams = await getTopPickedTeamsByYear(yearId);
    return NextResponse.json(topPickedTeams, { status: 200 });
  } catch (error) {
    return handleApiError(error, `/api/teams/most-picked/${params.yearId}`);
  }
}
