import { readFileSync } from "fs";

const html = readFileSync(process.argv[2] ?? "tmp-bit-page.html", "utf8");
const pattern =
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

let count = 0;
for (const match of html.matchAll(pattern)) {
  const parsed = JSON.parse(match[1] ?? "null");
  const events = Array.isArray(parsed) ? parsed : [parsed];
  for (const event of events) {
    if (event["@type"] !== "MusicEvent") {
      continue;
    }
    count += 1;
    if (count <= 2) {
      console.log(JSON.stringify(event, null, 2).slice(0, 800));
    }
  }
}

console.log("MusicEvent count:", count);
