import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createFallbackSupabaseClient, hasSupabaseConfig } from "./lib/supabase/fallback";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = hasSupabaseConfig()
    ? createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => {
                request.cookies.set(name, value);
              });

              response = NextResponse.next({ request });

              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
            },
          },
        },
      )
    : createFallbackSupabaseClient({
        get: (name) => {
          const cookie = request.cookies.get(name);
          return cookie ? { value: cookie.value } : undefined;
        },
        getAll: () => request.cookies.getAll(),
        set: (name, value) => {
          request.cookies.set(name, value);
        },
        delete: (name) => {
          request.cookies.set(name, "");
        },
      }) as ReturnType<typeof createServerClient>;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname.startsWith("/login");
  const isStaticAsset = pathname.startsWith("/_next") || pathname.includes(".");

  if (!user && !isLoginRoute && !isStaticAsset) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLoginRoute) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};