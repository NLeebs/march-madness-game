import { NextRequest, NextResponse } from "next/server";
import { getTopPerformingNonPowerConferenceTeamsByYear } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const topPerformingNonPowerConferenceTeams =
      await getTopPerformingNonPowerConferenceTeamsByYear(yearId);
    return NextResponse.json(topPerformingNonPowerConferenceTeams, {
      status: 200,
    });
  } catch (error) {
    return handleApiError(
      error,
      `/api/teams/top-performers/non-power-conference/${params.yearId}`,
    );
  }
}
