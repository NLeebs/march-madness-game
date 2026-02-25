import { handleApiError } from "@/utils/errorHandling";
import { NextRequest, NextResponse } from "next/server";
import { getUserProfile } from "@/application/useCases/GetUserProfile";
import { authorizeUserAccess } from "@/utils/api/authorizeUserAccess";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { userId } = params;
    await authorizeUserAccess(userId);
    const profile = await getUserProfile(userId);
    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    return handleApiError(error, `/api/profile/${params.userId}`);
  }
}
