import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { searchFares } from "@/lib/fares/search";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await searchFares(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid fare search", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to search fares right now" }, { status: 500 });
  }
}
