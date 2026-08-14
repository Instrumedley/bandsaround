import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getEventSyncJob } from "@/lib/event-sync-job-store";
import { getUserEvents } from "@/lib/event-store";

export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [job, userEvents] = await Promise.all([
    getEventSyncJob(session.user.id),
    getUserEvents(session.user.id),
  ]);

  return NextResponse.json({
    job,
    eventsCount: userEvents?.events.length ?? 0,
    artistsWithEvents: userEvents?.artistsWithEvents ?? 0,
  });
}
