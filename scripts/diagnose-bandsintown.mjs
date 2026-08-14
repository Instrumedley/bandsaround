import { readFileSync, existsSync } from "fs";
import path from "path";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

function loadSampleArtists() {
  try {
    const tastePath = path.join(process.cwd(), "data", "taste-profiles.json");
    const raw = readFileSync(tastePath, "utf8");
    const parsed = JSON.parse(raw);
    const firstProfile = Object.values(parsed)[0];
    return firstProfile?.artists?.slice(0, 3).map((artist) => artist.name) ?? [];
  } catch {
    return ["Between The Buried And Me", "Radiohead", "Steven Wilson"];
  }
}

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function searchArtist(name) {
  const url = new URL("https://www.bandsintown.com/searchSuggestions");
  url.searchParams.set("searchTerm", name);
  url.searchParams.set("cameFromCode", "257");
  url.searchParams.set("typeOfPage", "homePage");
  url.searchParams.set("fetchVenueApiData", "false");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": userAgent,
    },
  });

  const text = await response.text();
  const json = JSON.parse(text);
  const top = json.artists?.[0];
  return {
    status: response.status,
    topArtist: top ? { id: top.id, name: top.name, href: top.href } : null,
  };
}

const artists = loadSampleArtists();
console.log("Bandsintown web diagnose (searchSuggestions)");
console.log("");

for (const name of artists) {
  try {
    const result = await searchArtist(name);
    console.log(
      `${result.status} ${name}: ${
        result.topArtist
          ? `id=${result.topArtist.id}, href=${result.topArtist.href}`
          : "no artist match"
      }`,
    );
  } catch (error) {
    console.log(`ERR ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
