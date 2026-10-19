import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

const PUBLIC_ROUTES = ["/login", "/signup", "/auth"];

/**
 * Refreshes the Supabase session on every request and guards protected routes.
 * Must return the same `response` object so refreshed auth cookies persist.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between client creation and the auth check.
  //
  // getClaims() rather than getUser(): this project signs JWTs with an
  // asymmetric ES256 key, so the token is verified locally against the cached
  // JWKS instead of costing a round-trip to the Auth server on every single
  // request — including every RSC navigation. Same signature verification,
  // no network hop. Falls back to a server request automatically if the
  // project ever moves back to a symmetric secret.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims?.sub ? { id: claims.claims.sub } : null;

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/" || PUBLIC_ROUTES.some((p) => pathname.startsWith(p));

  // Unauthenticated user hitting a protected route -> send to /login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user on an auth page -> send to dashboard.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
