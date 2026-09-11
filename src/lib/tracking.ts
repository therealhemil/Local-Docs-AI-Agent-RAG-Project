import { NextRequest } from "next/server";

export interface ClientTrackingData {
  ipAddress: string;
  userAgent: string;
  device: string;
  browser: string;
  os: string;
  country?: string;
  city?: string;
  timezone?: string;
  screenResolution?: string;
  referrer?: string;
  language?: string;
}

export interface ClientSideMeta {
  timezone?: string;
  screenResolution?: string;
  referrer?: string;
  language?: string;
}

/**
 * Parses user agent string to extract human-readable browser, OS, and device type.
 */
export function parseUserAgent(ua: string | null | undefined): {
  browser: string;
  os: string;
  device: string;
} {
  if (!ua) {
    return { browser: "Unknown Browser", os: "Unknown OS", device: "Desktop" };
  }

  // Detect Device
  let device = "Desktop";
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    device = "Tablet";
  } else if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    device = "Mobile";
  } else if (/bot|crawler|spider|crawling/i.test(ua)) {
    device = "Bot";
  }

  // Detect OS
  let os = "Unknown OS";
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows nt 6.3/i.test(ua)) os = "Windows 8.1";
  else if (/windows nt 6.2/i.test(ua)) os = "Windows 8";
  else if (/windows nt 6.1/i.test(ua)) os = "Windows 7";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/cros/i.test(ua)) os = "Chrome OS";
  else if (/linux/i.test(ua)) os = "Linux";

  // Detect Browser
  let browser = "Unknown Browser";
  if (/edg([ea]|ios)?\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/edg([ea]|ios)?\/([0-9.]+)/i);
    browser = `Edge ${match ? match[2].split(".")[0] : ""}`.trim();
  } else if (/opr\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/opr\/([0-9.]+)/i);
    browser = `Opera ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (/samsungbrowser\/([0-9.]+)/i.test(ua)) {
    const match = ua.match(/samsungbrowser\/([0-9.]+)/i);
    browser = `Samsung Internet ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) {
    const match = ua.match(/(?:chrome|crios)\/([0-9.]+)/i);
    browser = `Chrome ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (/firefox|fxios/i.test(ua)) {
    const match = ua.match(/(?:firefox|fxios)\/([0-9.]+)/i);
    browser = `Firefox ${match ? match[1].split(".")[0] : ""}`.trim();
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    const match = ua.match(/version\/([0-9.]+)/i);
    browser = `Safari ${match ? match[1].split(".")[0] : ""}`.trim();
  }

  return { browser, os, device };
}

/**
 * Extracts client IP from standard proxy and CDN headers.
 */
export function extractClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    if (ips.length > 0 && ips[0]) return ips[0];
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  const clientIp = req.headers.get("x-client-ip");
  if (clientIp) return clientIp;

  return req.ip || "127.0.0.1";
}

/**
 * Compiles comprehensive tracking data for incoming authentication requests.
 */
export function extractClientDetails(
  req: NextRequest,
  clientMeta?: ClientSideMeta
): ClientTrackingData {
  const ipAddress = extractClientIp(req);
  const userAgent = req.headers.get("user-agent") || "Unknown";
  const { browser, os, device } = parseUserAgent(userAgent);

  const country =
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("x-country-code") ||
    undefined;

  const city =
    req.headers.get("x-vercel-ip-city") ||
    req.headers.get("x-city-name") ||
    undefined;

  const headerReferrer = req.headers.get("referer") || req.headers.get("referrer");
  const referrer = clientMeta?.referrer || headerReferrer || undefined;

  const headerLanguage = req.headers.get("accept-language");
  const language = clientMeta?.language || (headerLanguage ? headerLanguage.split(",")[0] : undefined);

  return {
    ipAddress,
    userAgent,
    device,
    browser,
    os,
    country,
    city,
    timezone: clientMeta?.timezone,
    screenResolution: clientMeta?.screenResolution,
    referrer,
    language,
  };
}
