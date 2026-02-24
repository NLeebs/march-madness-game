import { getTopPickedTeamsByUserIdAndYearId } from "@/application/useCases/GetTopPickedTeamsByUserIdAndYearId";
import { handleApiError } from "@/utils/errorHandling";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string; yearId: string } },
) {
  try {
    const { userId, yearId } = params;
    const topPickedTeams = await getTopPickedTeamsByUserIdAndYearId(
      userId,
      yearId,
    );
    return NextResponse.json(topPickedTeams, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      `/api/pick-count/${params.userId}/${params.yearId}`,
    );
  }
}
