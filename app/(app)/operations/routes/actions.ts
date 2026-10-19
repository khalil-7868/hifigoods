"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  RECEIPTS_BUCKET,
  RECEIPT_MAX_BYTES,
  isAllowedReceiptType,
  receiptPath,
} from "@/lib/storage";
import type { Expense, TablesUpdate } from "@/lib/database.types";
import { requireCurrentUser } from "@/lib/supabase/auth";
import { revalidateFor } from "@/lib/revalidate";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

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


/* ------------------------------------------------------------------ Routes */

const routeSchema = z
  .object({
    vehicle_id: z.string().uuid("Select a vehicle."),
    origin: z.string().trim().min(1, "Origin is required.").max(120),
    destination: z.string().trim().min(1, "Destination is required.").max(120),
    revenue: z.coerce.number().min(0, "Revenue cannot be negative."),
    start_date: z.string().min(1, "Start date is required."),
    end_date: z.string().optional().or(z.literal("")),
  })
  .refine(
    (v) => !v.end_date || v.end_date >= v.start_date,
    { message: "End date must be on or after the start date.", path: ["end_date"] },
  );

export async function addRoute(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = routeSchema.safeParse({
    vehicle_id: formData.get("vehicle_id"),
    origin: formData.get("origin"),
    destination: formData.get("destination"),
    revenue: formData.get("revenue"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("routes").insert({
      user_id: user.id,
      vehicle_id: parsed.data.vehicle_id,
      origin: parsed.data.origin,
      destination: parsed.data.destination,
      revenue: parsed.data.revenue,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date || null,
      party_id: optionalId(formData.get("party_id")),
      driver_id: optionalId(formData.get("driver_id")),
      ...parseBrokerFields(formData),
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("routes");
  return { success: true };
}

export async function updateRoute(
  routeId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = routeSchema.safeParse({
    vehicle_id: formData.get("vehicle_id"),
    origin: formData.get("origin"),
    destination: formData.get("destination"),
    revenue: formData.get("revenue"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("routes")
      .update({
        vehicle_id: parsed.data.vehicle_id,
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        revenue: parsed.data.revenue,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date || null,
        party_id: optionalId(formData.get("party_id")),
        driver_id: optionalId(formData.get("driver_id")),
        ...parseBrokerFields(formData),
      })
      .eq("id", routeId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("routes");
  return { success: true };
}

export async function deleteRoute(routeId: string): Promise<ActionResult> {
  if (!routeId) return { error: "Missing route id." };
  try {
    const { supabase, user } = await requireUser();

    // Legs cascade-delete in the DB, so clear their receipts too.
    const { data: legs } = await supabase
      .from("routes")
      .select("id")
      .eq("parent_route_id", routeId);

    for (const leg of legs ?? []) {
      await removeReceiptFolder(supabase, user.id, leg.id);
    }
    await removeReceiptFolder(supabase, user.id, routeId);

    const { error } = await supabase.from("routes").delete().eq("id", routeId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("routes");
  return { success: true };
}

/* -------------------------------------------------------------- Sub-routes */

/** Turn a select value into a uuid or null ("none" = cleared). */
function optionalId(raw: FormDataEntryValue | null): string | null {
  const v = raw ? String(raw) : "";
  return v && v !== "none" ? v : null;
}

/** Broker + commission fields shared by the route and leg forms. */
const brokerFields = {
  broker_id: z.string().uuid().optional().or(z.literal("")).or(z.null()),
  broker_commission_type: z
    .enum(["fixed", "percent"])
    .optional()
    .or(z.literal("")),
  broker_commission_value: z.coerce.number().min(0).optional(),
};

function parseBrokerFields(formData: FormData) {
  const rawId = formData.get("broker_id");
  const rawType = formData.get("broker_commission_type");
  const rawValue = formData.get("broker_commission_value");

  const broker_id =
    rawId && String(rawId) !== "none" ? String(rawId) : null;
  const broker_commission_type = broker_id
    ? ((String(rawType ?? "fixed") || "fixed") as "fixed" | "percent")
    : null;
  const broker_commission_value = broker_id ? Number(rawValue ?? 0) || 0 : 0;

  return { broker_id, broker_commission_type, broker_commission_value };
}

/** Optional cargo details shared by add/update leg. Blank strings -> null. */
function legDetailFields(data: {
  material?: string;
  weight?: string;
  notes?: string;
}) {
  return {
    material: data.material?.trim() || null,
    weight: data.weight?.trim() ? Number(data.weight) : null,
    notes: data.notes?.trim() || null,
  };
}

const subRouteSchema = z.object({
  origin: z.string().trim().min(1, "Origin is required.").max(120),
  destination: z.string().trim().min(1, "Destination is required.").max(120),
  revenue: z.coerce.number().min(0, "Rent cannot be negative."),
  material: z.string().trim().max(120).optional().or(z.literal("")),
  // Kept as a string here; blank -> null, otherwise coerced to a number below.
  weight: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  ...brokerFields,
});

/**
 * Add a leg to a main route. The leg inherits the parent's vehicle and start
 * date; its `revenue` is the leg's rent. The main route's rent is the sum of
 * its legs (computed when reading, see lib/routes-data.ts).
 */
export async function addSubRoute(
  parentId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  if (!parentId) return { error: "Missing route id." };

  const parsed = subRouteSchema.safeParse({
    origin: formData.get("origin"),
    destination: formData.get("destination"),
    revenue: formData.get("revenue"),
    material: formData.get("material"),
    weight: formData.get("weight"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();

    const { data: parent, error: parentError } = await supabase
      .from("routes")
      .select("vehicle_id, start_date, parent_route_id")
      .eq("id", parentId)
      .maybeSingle();
    if (parentError) return { error: parentError.message };
    if (!parent) return { error: "Main route not found." };
    if (parent.parent_route_id) {
      return { error: "A leg cannot have its own legs." };
    }

    const { error } = await supabase.from("routes").insert({
      user_id: user.id,
      vehicle_id: parent.vehicle_id,
      parent_route_id: parentId,
      origin: parsed.data.origin,
      destination: parsed.data.destination,
      revenue: parsed.data.revenue,
      start_date: parent.start_date,
      ...legDetailFields(parsed.data),
      ...parseBrokerFields(formData),
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("routes", parentId);
  return { success: true };
}

/** Update a leg's origin, destination, or rent. */
export async function updateSubRoute(
  legId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = subRouteSchema.safeParse({
    origin: formData.get("origin"),
    destination: formData.get("destination"),
    revenue: formData.get("revenue"),
    material: formData.get("material"),
    weight: formData.get("weight"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase } = await requireUser();
    const { data: leg } = await supabase
      .from("routes")
      .select("parent_route_id")
      .eq("id", legId)
      .maybeSingle();

    const { error } = await supabase
      .from("routes")
      .update({
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        revenue: parsed.data.revenue,
        ...legDetailFields(parsed.data),
        ...parseBrokerFields(formData),
      })
      .eq("id", legId);
    if (error) return { error: error.message };

    revalidateFor("routes", leg?.parent_route_id ?? undefined);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  return { success: true };
}

/* ---------------------------------------------------------------- Expenses */

const expenseSchema = z.object({
  route_id: z.string().uuid(),
  // Free text: a preset like "Fuel" or a custom label like "Lunch".
  category: z
    .string()
    .trim()
    .min(1, "Category is required.")
    .max(40, "Category is too long."),
  amount: z.coerce.number().min(0, "Amount cannot be negative."),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  // Date is no longer entered in the UI; the DB defaults it to current_date.
  date: z.string().optional().or(z.literal("")),
});

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Upload a receipt file if present and valid; returns its storage path. */
async function maybeUploadReceipt(
  supabase: SupabaseServer,
  userId: string,
  routeId: string,
  file: File | null,
): Promise<{ path: string | null; error?: string }> {
  if (!file || file.size === 0) return { path: null };
  if (file.size > RECEIPT_MAX_BYTES) {
    return { path: null, error: "Receipt must be 10 MB or smaller." };
  }
  if (!isAllowedReceiptType(file.type)) {
    return { path: null, error: "Receipt must be a PNG, JPG, WEBP, or PDF." };
  }
  const path = receiptPath(userId, routeId, file.name);
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { path: null, error: error.message };
  return { path };
}

async function removeReceipt(
  supabase: SupabaseServer,
  path: string | null | undefined,
) {
  if (!path) return;
  await supabase.storage.from(RECEIPTS_BUCKET).remove([path]);
}

async function removeReceiptFolder(
  supabase: SupabaseServer,
  userId: string,
  routeId: string,
) {
  const prefix = `${userId}/${routeId}`;
  const { data } = await supabase.storage.from(RECEIPTS_BUCKET).list(prefix);
  if (data && data.length > 0) {
    await supabase.storage
      .from(RECEIPTS_BUCKET)
      .remove(data.map((f) => `${prefix}/${f.name}`));
  }
}

export async function addExpense(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse({
    route_id: formData.get("route_id"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
    date: formData.get("date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();
    const file = formData.get("receipt") as File | null;
    const uploaded = await maybeUploadReceipt(
      supabase,
      user.id,
      parsed.data.route_id,
      file,
    );
    if (uploaded.error) return { error: uploaded.error };

    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      route_id: parsed.data.route_id,
      category: parsed.data.category as never,
      amount: parsed.data.amount,
      notes: parsed.data.notes || null,
      // date omitted -> DB default current_date
      receipt_url: uploaded.path,
    });
    if (error) {
      await removeReceipt(supabase, uploaded.path); // avoid orphaned file
      return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("routes", parsed.data.route_id);
  return { success: true };
}

/**
 * Bulk-insert several expenses for one route in a single save. Rows are sent
 * as indexed FormData fields (amount-<i>, category-<i>, date-<i>, notes-<i>,
 * receipt-<i>). Empty rows (no amount) are skipped.
 */
export async function addExpenses(
  routeId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  if (!routeId) return { error: "Missing route id." };

  const count = Number(formData.get("count") ?? 0);
  if (!Number.isInteger(count) || count <= 0) {
    return { error: "Add at least one expense." };
  }

  const rowSchema = expenseSchema.omit({ route_id: true });
  type Row = {
    category: string;
    amount: number;
    notes: string | null;
    file: File | null;
  };
  const rows: Row[] = [];

  for (let i = 0; i < count; i++) {
    const amountRaw = formData.get(`amount-${i}`);
    // Skip untouched rows.
    if (amountRaw === null || String(amountRaw).trim() === "") continue;

    const parsed = rowSchema.safeParse({
      category: formData.get(`category-${i}`),
      amount: amountRaw,
      // No per-row description field in the batch form anymore.
      notes: formData.get(`notes-${i}`) ?? "",
    });
    if (!parsed.success) {
      return {
        error: `Row ${i + 1}: ${parsed.error.issues[0]?.message ?? "Invalid input."}`,
      };
    }
    rows.push({
      category: parsed.data.category,
      amount: parsed.data.amount,
      notes: parsed.data.notes || null,
      file: formData.get(`receipt-${i}`) as File | null,
    });
  }

  if (rows.length === 0) return { error: "Add at least one expense." };

  const uploadedPaths: string[] = [];
  try {
    const { supabase, user } = await requireUser();

    // Upload any receipts first, tracking paths for rollback on failure.
    const inserts = [];
    for (const row of rows) {
      const uploaded = await maybeUploadReceipt(
        supabase,
        user.id,
        routeId,
        row.file,
      );
      if (uploaded.error) {
        await Promise.all(uploadedPaths.map((p) => removeReceipt(supabase, p)));
        return { error: uploaded.error };
      }
      if (uploaded.path) uploadedPaths.push(uploaded.path);

      inserts.push({
        user_id: user.id,
        route_id: routeId,
        kind: "road" as const,
        category: row.category as never,
        amount: row.amount,
        notes: row.notes,
        // date omitted -> DB default current_date
        receipt_url: uploaded.path,
      });
    }

    const { error } = await supabase.from("expenses").insert(inserts);
    if (error) {
      await Promise.all(uploadedPaths.map((p) => removeReceipt(supabase, p)));
      return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("routes", routeId);
  return { success: true };
}

/* ---------------------------------------------------------------- Diesel */

const dieselRowSchema = z.object({
  slip_no: z.string().trim().max(40).optional().or(z.literal("")),
  pump_name: z.string().trim().max(60).optional().or(z.literal("")),
  date: z.string().min(1, "Date is required."),
  rate: z.coerce.number().min(0, "Rate cannot be negative."),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative."),
  amount: z.coerce.number().min(0, "Amount cannot be negative."),
});

/**
 * Bulk-insert diesel fills for one route. A long trip may be filled several
 * times at different pumps, so rows are indexed like the road-expense form:
 * slip-<i>, pump-<i>, date-<i>, rate-<i>, qty-<i>, amount-<i>, receipt-<i>.
 * Rows with no quantity AND no amount are skipped.
 */
export async function addDieselEntries(
  routeId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  if (!routeId) return { error: "Missing route id." };

  const count = Number(formData.get("count") ?? 0);
  if (!Number.isInteger(count) || count <= 0) {
    return { error: "Add at least one diesel entry." };
  }

  type Row = z.infer<typeof dieselRowSchema> & { file: File | null };
  const rows: Row[] = [];

  for (let i = 0; i < count; i++) {
    const qtyRaw = String(formData.get(`qty-${i}`) ?? "").trim();
    const amountRaw = String(formData.get(`amount-${i}`) ?? "").trim();
    if (qtyRaw === "" && amountRaw === "") continue; // untouched row

    const rate = String(formData.get(`rate-${i}`) ?? "").trim() || "0";
    const qty = qtyRaw || "0";
    // Total defaults to rate x qty but an explicit amount always wins.
    const amount = amountRaw || String(Number(rate) * Number(qty));

    const parsed = dieselRowSchema.safeParse({
      slip_no: formData.get(`slip-${i}`),
      pump_name: formData.get(`pump-${i}`),
      date: formData.get(`date-${i}`),
      rate,
      quantity: qty,
      amount,
    });
    if (!parsed.success) {
      return {
        error: `Row ${i + 1}: ${parsed.error.issues[0]?.message ?? "Invalid input."}`,
      };
    }
    if (parsed.data.amount <= 0) {
      return { error: `Row ${i + 1}: enter a rate and quantity, or a total.` };
    }

    rows.push({ ...parsed.data, file: formData.get(`receipt-${i}`) as File | null });
  }

  if (rows.length === 0) return { error: "Add at least one diesel entry." };

  const uploadedPaths: string[] = [];
  try {
    const { supabase, user } = await requireUser();
    const inserts = [];

    for (const row of rows) {
      const uploaded = await maybeUploadReceipt(
        supabase,
        user.id,
        routeId,
        row.file,
      );
      if (uploaded.error) {
        await Promise.all(uploadedPaths.map((p) => removeReceipt(supabase, p)));
        return { error: uploaded.error };
      }
      if (uploaded.path) uploadedPaths.push(uploaded.path);

      inserts.push({
        user_id: user.id,
        route_id: routeId,
        kind: "diesel" as const,
        category: "Diesel" as never,
        amount: row.amount,
        rate: row.rate,
        quantity: row.quantity,
        slip_no: row.slip_no || null,
        pump_name: row.pump_name || null,
        date: row.date,
        receipt_url: uploaded.path,
      });
    }

    const { error } = await supabase.from("expenses").insert(inserts);
    if (error) {
      await Promise.all(uploadedPaths.map((p) => removeReceipt(supabase, p)));
      return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("routes", routeId);
  return { success: true };
}

export async function updateExpense(
  expenseId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse({
    route_id: formData.get("route_id"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
    date: formData.get("date"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const { supabase, user } = await requireUser();

    // The recorded date is left untouched when editing road expenses.
    const update: TablesUpdate<"expenses"> = {
      category: parsed.data.category,
      amount: parsed.data.amount,
      notes: parsed.data.notes || null,
    };

    // Diesel-only fields: applied only when the edit form submits them.
    const rate = formData.get("rate");
    const quantity = formData.get("quantity");
    const slipNo = formData.get("slip_no");
    const pumpName = formData.get("pump_name");
    const dieselDate = formData.get("date");

    if (rate !== null) update.rate = Number(rate) || 0;
    if (quantity !== null) update.quantity = Number(quantity) || 0;
    if (slipNo !== null) update.slip_no = String(slipNo).trim() || null;
    if (pumpName !== null) update.pump_name = String(pumpName).trim() || null;
    if (dieselDate !== null && String(dieselDate).trim() !== "") {
      update.date = String(dieselDate);
    }

    // Optional receipt replacement.
    const file = formData.get("receipt") as File | null;
    if (file && file.size > 0) {
      const uploaded = await maybeUploadReceipt(
        supabase,
        user.id,
        parsed.data.route_id,
        file,
      );
      if (uploaded.error) return { error: uploaded.error };

      const { data: existing } = await supabase
        .from("expenses")
        .select("receipt_url")
        .eq("id", expenseId)
        .maybeSingle();

      update.receipt_url = uploaded.path;
      await removeReceipt(supabase, existing?.receipt_url ?? null);
    }

    const { error } = await supabase
      .from("expenses")
      .update(update)
      .eq("id", expenseId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }

  revalidateFor("routes", parsed.data.route_id);
  return { success: true };
}

/**
 * Deletes an expense and returns the row so the client can offer Undo.
 *
 * The receipt file is deliberately NOT removed here. Deleting it eagerly would
 * make Undo lossy — the row would come back pointing at a missing object. It
 * was also already inconsistent: deleting a route cascades its expenses in the
 * database, which never ran this cleanup at all, so those receipts are orphaned
 * today regardless.
 *
 * Follow-up: a scheduled job (or a storage trigger) should sweep objects under
 * `receipts/` with no matching expenses row. Tracked in IMPLEMENTATION.md.
 */
export async function deleteExpense(
  expenseId: string,
): Promise<ActionResult & { restore?: Expense }> {
  if (!expenseId) return { error: "Missing expense id." };
  let restore: Expense | undefined;
  try {
    const { supabase } = await requireUser();

    const { data, error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .select()
      .maybeSingle();
    if (error) return { error: error.message };

    restore = data ?? undefined;
    revalidateFor("routes", restore?.route_id ?? undefined);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  return { success: true, restore };
}

/** Re-inserts a row removed by deleteExpense, receipt link intact. */
export async function restoreExpense(row: Expense): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("expenses").insert({
      id: row.id,
      // Session-derived, never the client's copy.
      user_id: user.id,
      route_id: row.route_id,
      kind: row.kind,
      category: row.category,
      amount: row.amount,
      date: row.date,
      notes: row.notes,
      receipt_url: row.receipt_url,
      slip_no: row.slip_no,
      pump_name: row.pump_name,
      rate: row.rate,
      quantity: row.quantity,
      created_at: row.created_at,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
  revalidateFor("routes", row.route_id);
  return { success: true };
}
