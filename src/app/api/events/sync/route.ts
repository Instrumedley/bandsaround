import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Concert sync now runs in batches. Use POST /api/events/sync/start and POST /api/events/sync/step from the dashboard.",
    },
    { status: 410 },
  );
}
