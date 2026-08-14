import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { cancelEventSyncJob } from "@/lib/sync-user-events-batch";

export async function POST() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await cancelEventSyncJob(session.user.id);
  return NextResponse.json({ job });
}
