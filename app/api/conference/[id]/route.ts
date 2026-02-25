import { getConferenceById } from "@/application/useCases/GetConferenceById";
import { handleApiError } from "@/utils/errorHandling";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const conference = await getConferenceById(id);
    return NextResponse.json(conference, { status: 200 });
  } catch (error) {
    return handleApiError(error, `/api/conference/${params.id}`);
  }
}
