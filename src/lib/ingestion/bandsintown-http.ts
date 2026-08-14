import path from "path";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const STATUS_MARKER = "\n__CURL_STATUS__:";
const COOKIE_JAR_PATH = path.join(process.cwd(), "data", "bandsintown-cookies.txt");
const CURL_CONNECT_TIMEOUT_SEC = 15;
const CURL_MAX_TIME_SEC = 45;

function hasValidBandsintownHtmlContent(body: string): boolean {
  return (
    body.includes("window.__data=") ||
    body.includes('"artistView"') ||
    body.includes('type="application/ld+json"')
  );
}

function looksLikeBlockedHtml(body: string): boolean {
  const trimmed = body.trimStart();
  const lower = trimmed.toLowerCase();

  if (!lower.startsWith("<!doctype") && !lower.startsWith("<html")) {
    return false;
  }

  // Valid artist pages embed tour data and may still include Cloudflare bootstrap scripts.
  if (hasValidBandsintownHtmlContent(body)) {
    return false;
  }

  return (
    lower.includes("just a moment") ||
    lower.includes("checking your browser") ||
    lower.includes("enable javascript and cookies") ||
    lower.includes("access denied") ||
    lower.includes("error 504") ||
    lower.includes("error 403") ||
    (lower.includes("cloudflare") && lower.includes("ray id"))
  );
}

async function fetchWithCurl(url: string, accept: string): Promise<{ status: number; body: string }> {
  const curlCommand = process.platform === "win32" ? "curl.exe" : "curl";
  const args = [
    "-s",
    "-S",
    "-L",
    "--compressed",
    "--connect-timeout",
    String(CURL_CONNECT_TIMEOUT_SEC),
    "--max-time",
    String(CURL_MAX_TIME_SEC),
    "-c",
    COOKIE_JAR_PATH,
    "-b",
    COOKIE_JAR_PATH,
    "-H",
    `Accept: ${accept}`,
    "-H",
    `User-Agent: ${BROWSER_USER_AGENT}`,
    "-H",
    "Accept-Language: en-US,en;q=0.9",
    "-H",
    "Referer: https://www.bandsintown.com/",
    "-w",
    `${STATUS_MARKER}%{http_code}`,
    url,
  ];

  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const { mkdir } = await import("fs/promises");
  const execFileAsync = promisify(execFile);

  await mkdir(path.dirname(COOKIE_JAR_PATH), { recursive: true });

  try {
    const { stdout } = await execFileAsync(curlCommand, args, {
      maxBuffer: 8 * 1024 * 1024,
    });

    const markerIndex = stdout.lastIndexOf(STATUS_MARKER);
    if (markerIndex === -1) {
      return { status: 200, body: stdout };
    }

    const body = stdout.slice(0, markerIndex);
    const status = Number.parseInt(stdout.slice(markerIndex + STATUS_MARKER.length), 10);
    return {
      status: Number.isFinite(status) ? status : 200,
      body,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/timed out|timeout|ETIMEDOUT/i.test(message)) {
      throw new Error(`Bandsintown request timed out after ${CURL_MAX_TIME_SEC}s`);
    }
    throw error;
  }
}

export async function fetchBandsintownResource(
  url: string,
  accept: string,
): Promise<{ status: number; body: string }> {
  const curlResult = await fetchWithCurl(url, accept);

  if (looksLikeBlockedHtml(curlResult.body)) {
    throw new Error(
      `Bandsintown blocked the request (likely Cloudflare). Wait a few minutes and retry. Snippet: ${curlResult.body.slice(0, 120)}`,
    );
  }

  if (!curlResult.status || curlResult.status >= 400) {
    throw new Error(`Bandsintown request failed (${curlResult.status}): ${curlResult.body.slice(0, 180)}`);
  }

  return curlResult;
}

export { BROWSER_USER_AGENT };
