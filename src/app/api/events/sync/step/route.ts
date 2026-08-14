import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { runEventSyncStep } from "@/lib/sync-user-events-batch";

function formatStepError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "sync_failed";
  }

  if (error.message === "SYNC_NOT_RUNNING") {
    return "No sync is currently running.";
  }

  if (error.message === "TASTE_PROFILE_MISSING") {
    return "Sync your Spotify taste profile before refreshing concerts.";
  }

  return error.message;
}

export async function POST() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runEventSyncStep(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: formatStepError(error) }, { status: 400 });
  }
}
