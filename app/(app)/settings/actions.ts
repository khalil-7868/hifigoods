"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import {
  AVATARS_BUCKET,
  AVATAR_MAX_BYTES,
  avatarPath,
  isAllowedAvatarType,
} from "@/lib/storage";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { revalidateFor, revalidateLayout } from "@/lib/revalidate";

export interface SettingsResult {
  error?: string;
  success?: boolean;
  message?: string;
  /** Set after a successful avatar change so the client can refresh its preview. */
  avatarUrl?: string | null;
}

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

/**
 * Verified identity + a client, without a round-trip to the Auth server.
 * See lib/supabase/auth.ts — the JWT is checked locally against the project's
 * JWKS and memoized for the request, so several actions in one submission
 * share a single verification.
 */
async function requireUser() {
  const [supabase, user] = await Promise.all([
    createClient(),
    requireCurrentUser(),
  ]);
  return { supabase, user };
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Delete every file currently stored under the user's avatar folder. */
async function clearAvatarFolder(supabase: SupabaseServer, userId: string) {
  const { data: existing } = await supabase.storage
    .from(AVATARS_BUCKET)
    .list(userId);
  if (existing && existing.length > 0) {
    await supabase.storage
      .from(AVATARS_BUCKET)
      .remove(existing.map((f) => `${userId}/${f.name}`));
  }
}

/* ----------------------------------------------------------------- Profile */

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required.").max(80),
  company: z.string().trim().max(80).optional().or(z.literal("")),
});

export async function updateProfile(
  _prev: SettingsResult,
  formData: FormData,
): Promise<SettingsResult> {
  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    company: formData.get("company"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  let newAvatarUrl: string | null | undefined;

  try {
    const { supabase, user } = await requireUser();

    const removeAvatar = formData.get("remove_avatar") === "on";
    const file = formData.get("avatar") as File | null;

    if (removeAvatar && !(file && file.size > 0)) {
      await clearAvatarFolder(supabase, user.id);
      newAvatarUrl = null;
    } else if (file && file.size > 0) {
      if (file.size > AVATAR_MAX_BYTES) {
        return { error: "Image must be 4 MB or smaller." };
      }
      if (!isAllowedAvatarType(file.type)) {
        return { error: "Image must be a PNG, JPG, or WEBP." };
      }

      await clearAvatarFolder(supabase, user.id);

      const path = avatarPath(user.id, file.name);
      const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        const missingBucket = /bucket.*not.*found/i.test(uploadError.message);
        return {
          error: missingBucket
            ? "The 'avatars' storage bucket is missing. Run supabase/migration_02.sql in the Supabase SQL editor."
            : `Upload failed: ${uploadError.message}`,
        };
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
      newAvatarUrl = publicUrl;
    }

    // UPSERT (not update): the profiles row may not exist if the signup
    // trigger never fired. A plain update would match 0 rows and silently
    // report success while saving nothing.
    const payload: ProfileInsert = {
      id: user.id,
      full_name: parsed.data.full_name,
      company: parsed.data.company || null,
    };
    if (newAvatarUrl !== undefined) payload.avatar_url = newAvatarUrl;

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("id")
      .maybeSingle();

    if (error) return { error: error.message };
    if (!data) {
      return {
        error:
          "Profile could not be saved. Check that row-level security allows updating your own profile.",
      };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateLayout();
  revalidateFor("profile");
  return {
    success: true,
    message: "Profile updated.",
    avatarUrl: newAvatarUrl ?? null,
  };
}

/* ---------------------------------------------------------------- Password */

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export async function changePassword(
  _prev: SettingsResult,
  formData: FormData,
): Promise<SettingsResult> {
  const parsed = passwordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (error) {
      // Supabase rejects reusing the current password on some projects.
      if (/same.*password/i.test(error.message)) {
        return { error: "That's already your current password." };
      }
      if (/session|expired|reauth/i.test(error.message)) {
        return {
          error: "Your session expired. Sign out and back in, then try again.",
        };
      }
      return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  return { success: true, message: "Password changed." };
}

/* ------------------------------------------------------------------ Delete */

export async function deleteAccount(): Promise<SettingsResult> {
  try {
    const { supabase, user } = await requireUser();
    await clearAvatarFolder(supabase, user.id);

    // Security-definer RPC deletes auth.users; cascades remove all app data.
    const { error } = await supabase.rpc("delete_current_user");
    if (error) {
      const missingFn = /function.*does not exist|could not find/i.test(
        error.message,
      );
      return {
        error: missingFn
          ? "Account deletion isn't set up yet. Run supabase/migration_02.sql in the Supabase SQL editor."
          : error.message,
      };
    }
    await supabase.auth.signOut();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateLayout();
  redirect("/login");
}
