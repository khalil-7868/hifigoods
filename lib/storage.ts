/** Shared config for receipt uploads (Supabase Storage). */

export const RECEIPTS_BUCKET = "receipts";

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const RECEIPT_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export const RECEIPT_ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf";

export function isAllowedReceiptType(type: string): boolean {
  return (RECEIPT_ALLOWED_TYPES as readonly string[]).includes(type);
}

/** Storage key layout: <userId>/<routeId>/<uuid>.<ext> — matches RLS policy. */
export function receiptPath(
  userId: string,
  routeId: string,
  fileName: string,
): string {
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()!.toLowerCase()
    : "bin";
  return `${userId}/${routeId}/${crypto.randomUUID()}.${ext}`;
}

/* --------------------------------------------------------------- Avatars */

export const AVATARS_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export const AVATAR_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const AVATAR_ACCEPT = ".png,.jpg,.jpeg,.webp";

export function isAllowedAvatarType(type: string): boolean {
  return (AVATAR_ALLOWED_TYPES as readonly string[]).includes(type);
}

/** Avatar key layout: <userId>/<uuid>.<ext> — first segment is the owner id. */
export function avatarPath(userId: string, fileName: string): string {
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()!.toLowerCase()
    : "png";
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}
