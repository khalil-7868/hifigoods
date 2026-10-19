import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { DangerZone } from "@/components/settings/danger-zone";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Account settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Settings needs `company` too, which the shared topbar profile doesn't
  // select — so this one query stays, but the auth check above is now local.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, password, and account.
        </p>
      </header>

      <ProfileForm
        fullName={profile?.full_name ?? ""}
        company={profile?.company ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <AppearanceForm />
      <PasswordForm />
      <DangerZone email={user.email ?? ""} />
    </div>
  );
}
