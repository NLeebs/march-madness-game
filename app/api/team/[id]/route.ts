import { getTeamById } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const team = await getTeamById(id);
    return NextResponse.json(team, { status: 200 });
  } catch (error) {
    return handleApiError(error, `/api/team/${params.id}`);
  }
}
