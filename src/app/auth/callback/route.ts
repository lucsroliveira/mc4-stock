import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin: serverOrigin } = new URL(request.url);
  // request.url pode refletir o bind do servidor (ex.: 0.0.0.0); usa o host real da requisição.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const origin = host ? `${proto}://${host}` : serverOrigin;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next") ?? "/dashboard";
  // Evita open redirect: apenas caminhos internos.
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-failed`);
}
