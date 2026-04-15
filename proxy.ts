import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function buildNextPath(url: URL) {
  const params = new URLSearchParams(url.searchParams);
  params.delete("code");
  params.delete("next");
  const query = params.toString();
  return `${url.pathname}${query ? `?${query}` : ""}` || "/";
}

export function proxy(request: NextRequest) {
  const currentUrl = request.nextUrl;
  const isCallbackPath = currentUrl.pathname.startsWith("/auth/callback");
  const code = currentUrl.searchParams.get("code");
  if (!code || isCallbackPath) return NextResponse.next();

  const callbackUrl = currentUrl.clone();
  callbackUrl.pathname = "/auth/callback";
  if (!callbackUrl.searchParams.get("next")) {
    callbackUrl.searchParams.set("next", buildNextPath(currentUrl));
  }

  return NextResponse.redirect(callbackUrl);
}
