const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type";

function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const isGitHubPages = url.protocol === "https:" &&
      (url.hostname === "github.io" || url.hostname.endsWith(".github.io"));
    const isLocalDevelopment = url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname);

    return isGitHubPages || isLocalDevelopment;
  } catch {
    return false;
  }
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  // Calls without an Origin header are typically server-to-server and do not
  // need a browser CORS allowlist. Browser calls must come from GitHub Pages
  // (or localhost during development).
  if (!origin) {
    headers["Access-Control-Allow-Origin"] = "*";
  } else if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}
