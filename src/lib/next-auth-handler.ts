import { NextResponse, type NextRequest } from "next/server";
import { authOptions } from "@/auth";

type AuthAction =
  | "providers"
  | "signin"
  | "signout"
  | "callback"
  | "session"
  | "csrf"
  | "error"
  | "verify-request";

type AuthCookie = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

type AuthResponseInternal = {
  status?: number;
  headers?: Array<{ key: string; value: string }>;
  body?: unknown;
  redirect?: string;
  cookies?: AuthCookie[];
};

async function readBody(req: NextRequest): Promise<Record<string, unknown> | undefined> {
  if (req.method !== "POST") {
    return undefined;
  }

  const contentType = req.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await req.json()) as Record<string, unknown>;
  }

  if (contentType?.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(await req.text());
    return Object.fromEntries(params);
  }

  return undefined;
}

function parseCookieHeader(header: string): Record<string, string> {
  if (!header.trim()) {
    return {};
  }

  return header.split(";").reduce<Record<string, string>>((acc, part) => {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) {
      return acc;
    }

    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (name) {
      acc[name] = decodeURIComponent(value);
    }
    return acc;
  }, {});
}

function readRequestCookies(req: NextRequest): Record<string, string> {
  const cookies: Record<string, string> = {
    ...parseCookieHeader(req.headers.get("cookie") ?? ""),
  };

  for (const cookie of req.cookies.getAll()) {
    cookies[cookie.name] = cookie.value;
  }

  return cookies;
}

function applyAuthCookies(response: NextResponse, cookies: AuthCookie[] | undefined): void {
  for (const cookie of cookies ?? []) {
    const options = cookie.options;
    response.cookies.set({
      name: cookie.name,
      value: cookie.value,
      httpOnly: Boolean(options.httpOnly),
      secure: Boolean(options.secure),
      sameSite: typeof options.sameSite === "string" ? options.sameSite.toLowerCase() as "lax" | "strict" | "none" : "lax",
      path: typeof options.path === "string" ? options.path : "/",
      maxAge: typeof options.maxAge === "number" ? options.maxAge : undefined,
      expires: options.expires instanceof Date ? options.expires : undefined,
    });
  }
}

function toAuthResponse(res: AuthResponseInternal): NextResponse {
  const headers = new Headers(
    res.headers?.reduce<Record<string, string>>((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {}) ?? {},
  );

  let body = res.body;
  if (headers.get("content-type") === "application/json") {
    body = JSON.stringify(res.body);
  } else if (headers.get("content-type") === "application/x-www-form-urlencoded") {
    body = new URLSearchParams(res.body as Record<string, string>).toString();
  }

  const status = res.redirect ? 302 : (res.status ?? 200);
  const response = res.redirect
    ? NextResponse.redirect(res.redirect, status)
    : new NextResponse(body as BodyInit | null | undefined, { headers, status });

  applyAuthCookies(response, res.cookies);
  return response;
}

async function handleNextAuthRequest(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> },
): Promise<NextResponse> {
  const { AuthHandler } = await import("next-auth/core");

  const options = {
    ...authOptions,
    secret: authOptions.secret ?? process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  };

  const nextauth = (await context.params)?.nextauth;
  const query = Object.fromEntries(req.nextUrl.searchParams);
  const body = await readBody(req);

  const internalResponse = await AuthHandler({
    req: {
      body,
      query,
      cookies: readRequestCookies(req),
      headers: Object.fromEntries(req.headers.entries()),
      method: req.method ?? "GET",
      action: nextauth?.[0] as AuthAction,
      providerId: nextauth?.[1],
      error: (query.error as string | undefined) ?? nextauth?.[1],
    },
    options,
  });

  if (body?.json === "true" && internalResponse.redirect) {
    const response = NextResponse.json({ url: internalResponse.redirect });
    applyAuthCookies(response, internalResponse.cookies);
    return response;
  }

  return toAuthResponse(internalResponse);
}

export const GET = handleNextAuthRequest;
export const POST = handleNextAuthRequest;
