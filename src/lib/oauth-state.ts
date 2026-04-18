import { createHmac, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 15 * 60 * 1000;

type StatePayload = {
  p: string;
  s: string;
};

export function createOAuthState(userId: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for OAuth state");
  }

  const issued = Date.now();
  const payload = `${userId}:${issued}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  const body: StatePayload = { p: payload, s: sig };
  return Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
}

export function verifyOAuthState(state: string | null): string | null {
  if (!state) {
    return null;
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return null;
  }

  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const payload = record.p;
    const sig = record.s;
    if (typeof payload !== "string" || typeof sig !== "string") {
      return null;
    }

    const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return null;
    }

    const parts = payload.split(":");
    if (parts.length !== 2) {
      return null;
    }

    const [userId, issuedRaw] = parts;
    const issued = Number(issuedRaw);
    if (!userId || !Number.isFinite(issued)) {
      return null;
    }

    if (Date.now() - issued > STATE_TTL_MS) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}
