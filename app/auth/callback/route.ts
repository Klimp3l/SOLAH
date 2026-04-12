import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { makeUserRepository } from "@/lib/factories/api-deps";

function sanitizeNextPath(next: string | null) {
  if (!next) return "/admin";
  return next.startsWith("/") ? next : "/admin";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
    const { data } = await supabase.auth.getUser();
    if (data.user?.id && data.user.email) {
      await makeUserRepository().linkAccountByEmail(data.user.id, data.user.email);
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
