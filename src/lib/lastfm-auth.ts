import { createHash } from "crypto";

function lastFmApiSignature(params: Record<string, string>, secret: string): string {
  const sortedKeys = Object.keys(params).sort();
  let signatureSource = "";
  for (const key of sortedKeys) {
    signatureSource += key + params[key];
  }
  return createHash("md5").update(signatureSource + secret).digest("hex");
}

export type LastFmSessionResponse = {
  session: {
    name: string;
    key: string;
  };
};

export async function fetchLastFmSession(token: string): Promise<LastFmSessionResponse> {
  const apiKey = process.env.LASTFM_API_KEY;
  const apiSecret = process.env.LASTFM_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Last.fm API environment variables are not configured.");
  }

  const params: Record<string, string> = {
    method: "auth.getSession",
    token,
    api_key: apiKey,
  };

  const api_sig = lastFmApiSignature(params, apiSecret);
  const search = new URLSearchParams({ ...params, api_sig, format: "json" });

  const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${search.toString()}`);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Last.fm auth.getSession failed: ${response.status} ${text}`);
  }

  const json: unknown = await response.json();
  if (!json || typeof json !== "object") {
    throw new Error("Last.fm response was not valid JSON.");
  }

  const record = json as Record<string, unknown>;
  if (record.error) {
    throw new Error(`Last.fm error: ${String(record.message ?? record.error)}`);
  }

  if (!record.session || typeof record.session !== "object") {
    throw new Error("Last.fm session missing from response.");
  }

  const session = record.session as Record<string, unknown>;
  const name = session.name;
  const key = session.key;
  if (typeof name !== "string" || typeof key !== "string") {
    throw new Error("Last.fm session name/key invalid.");
  }

  return {
    session: {
      name,
      key,
    },
  };
}
