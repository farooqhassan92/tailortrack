import { NextResponse } from "next/server";

export function noStoreJson<T>(data: T, init?: ResponseInit) {
  const response = NextResponse.json(data, init);

  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");

  return response;
}

export function safeInternalPath(
  value: string,
  allowedPrefixes: string[],
  fallback: string
) {
  if (!value || value.startsWith("//") || value.includes("\\") || /[\r\n]/.test(value)) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://tailortrack.local");

    if (url.origin !== "https://tailortrack.local") {
      return fallback;
    }

    const isAllowed = allowedPrefixes.some(
      (prefix) =>
        url.pathname === prefix ||
        url.pathname.startsWith(`${prefix}/`) ||
        url.pathname.startsWith(`${prefix}?`)
    );

    return isAllowed ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
}
