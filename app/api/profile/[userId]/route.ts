import { handleApiError } from "@/utils/errorHandling";
import { NextRequest, NextResponse } from "next/server";
import { getUserProfile } from "@/application/useCases/GetUserProfile";

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { userId } = params;
    const profile = await getUserProfile(userId);
    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    return handleApiError(error, `/api/profile/${params.userId}`);
  }
}
