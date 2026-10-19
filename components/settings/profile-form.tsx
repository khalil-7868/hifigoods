"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2, Trash2, Upload, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AVATAR_ACCEPT } from "@/lib/storage";
import { updateProfile, type SettingsResult } from "@/app/(app)/settings/actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

interface ProfileFormProps {
  fullName: string;
  company: string;
  avatarUrl: string | null;
}

export function ProfileForm({ fullName, company, avatarUrl }: ProfileFormProps) {
  const [state, formAction] = useActionState<SettingsResult, FormData>(updateProfile, {});

  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Object URL for a freshly picked file (before upload). */
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  /** The saved avatar as the server last reported it. */
  const [savedUrl, setSavedUrl] = useState<string | null>(avatarUrl);

  // Keep in sync when the server sends a new value after revalidation.
  useEffect(() => {
    setSavedUrl(avatarUrl);
  }, [avatarUrl]);

  // Release object URLs so we don't leak blobs.
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!state.success) return;
    toast.success(state.message ?? "Saved.");
    if (state.avatarUrl !== undefined) setSavedUrl(state.avatarUrl);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(null);
    setRemoveAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const preview = fileUrl ?? (removeAvatar ? null : savedUrl);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(file ? URL.createObjectURL(file) : null);
    if (file) setRemoveAvatar(false);
  }

  function handleRemove() {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setRemoveAvatar(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name, photo, and company.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          {removeAvatar && <input type="hidden" name="remove_avatar" value="on" />}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-secondary-foreground">{preview ? <img src={preview} alt="Profile photo preview" className="size-full object-cover" /> : <UserIcon className="size-8" aria-hidden />}</span>

            <div className="space-y-2">
              <Label htmlFor="avatar">Profile photo</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload aria-hidden />
                  Choose image
                </Button>
                {preview && (
                  <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-expense" onClick={handleRemove}>
                    <Trash2 aria-hidden />
                    Remove
                  </Button>
                )}
              </div>
              <Input ref={fileInputRef} id="avatar" name="avatar" type="file" accept={AVATAR_ACCEPT} className="sr-only" onChange={handleFileChange} />
              <p className="text-xs text-muted-foreground">
                PNG, JPG, or WEBP, up to 4 MB.
                {removeAvatar && " Photo will be removed when you save."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" defaultValue={fullName} placeholder="Your name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" name="company" defaultValue={company} placeholder="Optional" />
            </div>
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-expense">
              {state.error}
            </p>
          )}

          <SaveButton />
        </form>
      </CardContent>
    </Card>
  );
}
