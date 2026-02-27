import { getYears } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const years = await getYears();
    return NextResponse.json(years, { status: 200 });
  } catch (error) {
    return handleApiError(error, "/api/years");
  }
}
