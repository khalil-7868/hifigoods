import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Who is signed in — resolved once per request, without a network call.
 *
 * ## Why this exists
 *
 * `auth.getUser()` sends a request to the Supabase Auth server *every time it
 * is called*. The app used to call it in middleware, again in the app layout,
 * and again inside every Server Action's `requireUser()` — so a single click
 * cost three or four sequential auth round-trips to Mumbai before a single
 * row of data was read.
 *
 * `auth.getClaims()` verifies the access token locally against the project's
 * JWKS using WebCrypto. This project signs JWTs with an asymmetric ES256 key
 * (confirmed: /auth/v1/.well-known/jwks.json publishes one), so verification
 * is genuinely local and the JWKS itself is cached. Same security guarantee as
 * `getUser()` — the signature is checked, a forged cookie is rejected — but no
 * request leaves the server.
 *
 * Wrapping it in React `cache()` collapses every call within one render pass
 * into a single verification.
 *
 * If the project were ever switched back to a symmetric JWT secret,
 * `getClaims()` transparently falls back to a server request — correctness is
 * preserved, only the speed benefit is lost.
 */

export interface CurrentUser {
  id: string;
  email: string;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : "",
  };
});

/**
 * Same, but throws when unauthenticated — for Server Actions, which should
 * never run without a verified user.
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated.");
  return user;
}

/**
 * The signed-in user's profile row, memoized per request.
 *
 * The app layout renders on every navigation and was querying `profiles` each
 * time purely to show a name and avatar in the topbar.
 */
export const getCurrentProfile = cache(
  async (): Promise<{ full_name: string | null; avatar_url: string | null }> => {
    const user = await getCurrentUser();
    if (!user) return { full_name: null, avatar_url: null };

    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    return {
      full_name: data?.full_name ?? null,
      avatar_url: data?.avatar_url ?? null,
    };
  },
);
