import { getUserTotalStatsByYearId } from "@/application/useCases/GetUserTotalStatsByYearId";
import { handleApiError } from "@/utils/errorHandling";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string; yearId: string } },
) {
  try {
    const { userId, yearId } = params;
    const userTotalStats = await getUserTotalStatsByYearId(userId, yearId);
    return NextResponse.json(userTotalStats, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      `/api/user-statistics/${params.userId}/${params.yearId}`,
    );
  }
}
