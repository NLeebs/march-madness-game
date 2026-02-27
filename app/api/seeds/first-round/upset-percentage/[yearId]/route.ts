import { NextRequest, NextResponse } from "next/server";
import { getFirstRoundSeedMatchupUpsetPercentageByYearId } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";

export async function GET(
  req: NextRequest,
  { params }: { params: { yearId: string } },
) {
  try {
    const { yearId } = params;
    const firstRoundSeedMatchupUpsetPercentages =
      await getFirstRoundSeedMatchupUpsetPercentageByYearId(yearId);
    return NextResponse.json(firstRoundSeedMatchupUpsetPercentages, {
      status: 200,
    });
  } catch (error) {
    return handleApiError(
      error,
      `/api/seeds/first-round/upset-percentage/${params.yearId}`,
    );
  }
}
