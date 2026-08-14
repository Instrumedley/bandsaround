import { readFileSync } from "fs";
import { extractEventsFromArtistPageHtml } from "../src/lib/ingestion/bandsintown-web.ts";
import { filterMappedEvents } from "../src/lib/ingestion/bandsintown-event-mapper.ts";

const html = readFileSync(process.argv[2] ?? "tmp-sonata-page.html", "utf8");
const rawEvents = extractEventsFromArtistPageHtml(html);
console.log("raw events:", rawEvents.length);
console.log("sample:", rawEvents.slice(0, 2));

const dateFrom = new Date();
const dateTo = new Date();
dateTo.setMonth(dateTo.getMonth() + 6);

const mapped = filterMappedEvents({
  rawEvents,
  artist: { name: "Sonata Arctica", rank: 1 },
  dateFrom,
  dateTo,
});

console.log("in window:", mapped.rawEventsCount);
console.log("europe mapped:", mapped.events.length);
for (const event of mapped.events.slice(0, 5)) {
  console.log(`${event.date} ${event.city}, ${event.country} @ ${event.venue}`);
}
