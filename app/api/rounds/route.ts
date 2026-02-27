import { getRounds } from "@/application/useCases";
import { handleApiError } from "@/utils/errorHandling";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const rounds = await getRounds();
    return NextResponse.json(rounds, { status: 200 });
  } catch (error) {
    return handleApiError(error, "/api/rounds");
  }
}
