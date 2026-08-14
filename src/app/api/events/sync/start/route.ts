import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import type { EventSyncMode } from "@/lib/event-sync-job-store";
import { startEventSyncJob } from "@/lib/sync-user-events-batch";

function formatStartError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "sync_failed";
  }

  if (error.message === "TASTE_PROFILE_MISSING") {
    return "Sync your Spotify taste profile before refreshing concerts.";
  }

  return error.message;
}

function parseMode(value: unknown): EventSyncMode {
  if (value === "resolve-urls" || value === "refresh-events") {
    return value;
  }
  return "refresh-events";
}

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let mode: EventSyncMode = "refresh-events";
  let forceRefresh = false;
  try {
    const body = (await request.json()) as { mode?: EventSyncMode; forceRefresh?: boolean };
    mode = parseMode(body.mode);
    forceRefresh = Boolean(body.forceRefresh);
  } catch {
    mode = "refresh-events";
  }

  try {
    const job = await startEventSyncJob(session.user.id, { mode, forceRefresh });
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json({ error: formatStartError(error) }, { status: 400 });
  }
}
