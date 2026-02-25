import { getUserBracketsByYearId } from "@/application/useCases/GetUserBracketsByYearId";
import { handleApiError } from "@/utils/errorHandling";
import { NextRequest, NextResponse } from "next/server";
import { authorizeUserAccess } from "@/utils/api/authorizeUserAccess";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string; yearId: string } },
) {
  try {
    const { userId, yearId } = params;
    await authorizeUserAccess(userId);
    const brackets = await getUserBracketsByYearId(userId, yearId);
    return NextResponse.json(brackets, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      `/api/brackets/${params.userId}/${params.yearId}`,
    );
  }
}
