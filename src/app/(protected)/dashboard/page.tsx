import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/auth";
import { DiscoveryShell } from "@/components/discovery-shell";
import { getUserEvents } from "@/lib/event-store";
import { getIntegrations } from "@/lib/integration-store";
import { getTasteProfile } from "@/lib/taste-profile-store";

export default async function DashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [tasteProfile, integrations, userEvents] = await Promise.all([
    getTasteProfile(session.user.id),
    getIntegrations(session.user.id),
    getUserEvents(session.user.id),
  ]);

  return (
    <DiscoveryShell
      tasteProfile={tasteProfile}
      spotifyConnected={Boolean(integrations.spotify)}
      events={userEvents?.events ?? []}
      eventsMeta={
        userEvents
          ? {
              syncedAt: userEvents.syncedAt,
              artistsQueried: userEvents.artistsQueried,
              artistsWithEvents: userEvents.artistsWithEvents,
              rawEventsTotal: userEvents.rawEventsTotal ?? 0,
              dateFrom: userEvents.dateFrom,
              dateTo: userEvents.dateTo,
              syncWarning: userEvents.syncWarning,
            }
          : null
      }
    />
  );
}
