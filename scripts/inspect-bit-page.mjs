import { readFileSync } from "fs";

const html = readFileSync("tmp-bit-page.html", "utf8");
const marker = "window.__data=";
const start = html.indexOf(marker);
if (start === -1) {
  console.log("no window.__data");
  process.exit(1);
}

const jsonStart = start + marker.length;
let depth = 0;
let inString = false;
let escape = false;

for (let index = jsonStart; index < html.length; index += 1) {
  const char = html[index];
  if (inString) {
    if (escape) {
      escape = false;
    } else if (char === "\\") {
      escape = true;
    } else if (char === '"') {
      inString = false;
    }
    continue;
  }

  if (char === '"') {
    inString = true;
    continue;
  }

  if (char === "{") {
    depth += 1;
  }
  if (char === "}") {
    depth -= 1;
    if (depth === 0) {
      const jsonText = html.slice(jsonStart, index + 1);
      const data = JSON.parse(jsonText);
      const artistView = data.artistView;
      console.log("artistView keys:", Object.keys(artistView));

      function walk(obj, path, depth = 0) {
        if (!obj || typeof obj !== "object" || depth > 6) {
          return;
        }

        if (Array.isArray(obj) && obj[0] && typeof obj[0] === "object") {
          const sample = obj[0];
          if (
            ("startsAt" in sample || "starts_at" in sample || "datetime" in sample) &&
            ("venue" in sample || "location" in sample || "venueName" in sample)
          ) {
            console.log("\nEVENT ARRAY at", path, "len", obj.length);
            console.log(JSON.stringify(sample, null, 2).slice(0, 1500));
          }
        }

        if (Array.isArray(obj)) {
          for (const item of obj.slice(0, 3)) {
            walk(item, path + "[]", depth + 1);
          }
          return;
        }

        for (const [key, value] of Object.entries(obj)) {
          if (/event|tour|show|concert|calendar|upcoming|date|body|gig/i.test(key)) {
            walk(value, `${path}.${key}`, depth + 1);
          }
        }
      }

      walk(artistView, "artistView");

      const upcoming =
        data?.artistView?.body?.events?.upcomingEvents?.events ?? [];
      if (upcoming[0]) {
        console.log("\nAll keys on upcoming event:", Object.keys(upcoming[0]));
        console.log(JSON.stringify(upcoming[0], null, 2));
      }

      break;
    }
  }
}
