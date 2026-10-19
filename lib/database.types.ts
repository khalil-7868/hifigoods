/**
 * App-facing database types and domain constants.
 *
 * The `Database` shape itself is GENERATED from the live schema and lives in
 * `lib/supabase/database-generated.ts` — never hand-edit it. This module is the
 * single import surface for the rest of the app: it re-exports the generated
 * types, gives every table Row a short alias, and holds the domain constants
 * (expense presets, payment methods, vehicle makes) that have no DB equivalent.
 *
 * After any schema change:
 *   npm run db:types
 */

import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/supabase/database-generated";

export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from "@/lib/supabase/database-generated";

export { Constants } from "@/lib/supabase/database-generated";

/* -------------------------------------------------------------------------- */
/* Enum-ish column types                                                       */
/* -------------------------------------------------------------------------- */

export type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
export type TyreStatus = Database["public"]["Enums"]["tyre_status"];

/**
 * Expense category is free text (see migration_02.sql). ROAD_EXPENSE below are
 * suggested presets; users may also type custom labels like "Lunch".
 */
export type ExpenseCategory = string;

/** Broker commission is either a flat rupee amount or a % of the route rent. */
export type BrokerCommissionType = "fixed" | "percent";

/**
 * `routes.broker_commission_type` is a nullable `text` column, so Postgres
 * hands it back as `string | null`. Narrow it at the boundary instead of
 * casting: an unexpected value from an old row degrades to null rather than
 * silently lying to the form.
 */
export function asBrokerCommissionType(
  value: string | null | undefined,
): BrokerCommissionType | null {
  return value === "fixed" || value === "percent" ? value : null;
}

/** Same idea for `expenses.kind`. */
export function asExpenseKind(value: string | null | undefined): ExpenseKind {
  return value === "diesel" ? "diesel" : "road";
}

/** Same idea for `khata_entries.direction`. */
export function asKhataDirection(
  value: string | null | undefined,
): KhataDirection {
  return value === "got" ? "got" : "gave";
}

/** 'road' = general trip cost; 'diesel' = a fuel fill with rate/qty/slip. */
export type ExpenseKind = "road" | "diesel";

/** 'gave' = money out (they owe you); 'got' = money received back. */
export type KhataDirection = "gave" | "got";

/* -------------------------------------------------------------------------- */
/* Row aliases                                                                 */
/* -------------------------------------------------------------------------- */

export type Profile = Tables<"profiles">;
export type Vehicle = Tables<"vehicles">;
export type Route = Tables<"routes">;
export type Expense = Tables<"expenses">;
export type Party = Tables<"parties">;
export type PartyPayment = Tables<"party_payments">;
export type Broker = Tables<"brokers">;
export type BrokerPayment = Tables<"broker_payments">;
export type Driver = Tables<"drivers">;
export type DriverAdvance = Tables<"driver_advances">;
export type Tyre = Tables<"tyres">;
export type VehicleOwner = Tables<"vehicle_owners">;
export type MaintenanceFee = Tables<"maintenance_fees">;
export type MaintenanceEvent = Tables<"maintenance_events">;
export type Mechanic = Tables<"mechanics">;
export type KhataContact = Tables<"khata_contacts">;
export type KhataEntry = Tables<"khata_entries">;

/* Insert/Update payload aliases — use these in Server Actions so a column
 * rename fails the build instead of failing at runtime. */
export type RouteInsert = TablesInsert<"routes">;
export type RouteUpdate = TablesUpdate<"routes">;
export type ExpenseInsert = TablesInsert<"expenses">;
export type VehicleInsert = TablesInsert<"vehicles">;
export type PartyInsert = TablesInsert<"parties">;
export type BrokerInsert = TablesInsert<"brokers">;
export type MechanicInsert = TablesInsert<"mechanics">;
export type MaintenanceFeeInsert = TablesInsert<"maintenance_fees">;
export type MaintenanceEventInsert = TablesInsert<"maintenance_events">;
export type KhataContactInsert = TablesInsert<"khata_contacts">;
export type KhataEntryInsert = TablesInsert<"khata_entries">;
export type PartyPaymentInsert = TablesInsert<"party_payments">;
export type BrokerPaymentInsert = TablesInsert<"broker_payments">;

/* -------------------------------------------------------------------------- */
/* Domain constants                                                            */
/* -------------------------------------------------------------------------- */

/** Common pump/filling-station names offered as combobox suggestions. */
export const FUEL_PUMPS: readonly string[] = [
  "PSO",
  "Shell",
  "Total Parco",
  "Attock",
  "Hascol",
  "Go",
  "Other",
] as const;

export const PAYMENT_METHODS: readonly string[] = [
  "Cash",
  "Bank transfer",
  "Cheque",
  "Easypaisa",
  "JazzCash",
  "Other",
] as const;

/**
 * Road-expense rows pre-listed on the entry table. Diesel is excluded — it has
 * its own section with slip/rate/litres. Extra rows can still be added, and
 * custom text is allowed in the category combobox.
 */
export const ROAD_EXPENSE: readonly string[] = [
  "Toll Plaza",
  "Load/Unload",
  "Munshiana",
  "PP Police",
  "Motorway Police",
  "Tyre/Jali Kharcha",
  "Khurak (Food)",
  "Chukidara",
  "Driver Inam",
  "Maintenance",
  "Kanta",
  "Service/Grease",
  "Port Kharcha",
  "Container Challan",
  "Motorway Kanta",
  "Diesel Kharcha",
  "M-Tag",
  "Engine Oil",
  "Oil Filter",
  "Air Filter (Jali)",
  "Fuel/Diesel Filter",
] as const;

export const VEHICLES_NAMES = [
  "Hino",
  "Isuzu",
  "Nissan",
  "Bedford",
  "FAW",
  "Master",
  "Forland",
  "JACK",
  "Daewoo",
  "Sino",
] as const;

export const VEHICLES_TYPES = [
  "Container",
  "Flat/Phatta",
  "Mazda",
  "Body",
  "Half-Body",
  "Car Carrier",
  "Oil Tanker",
  "Bowser",
] as const;

export const VEHICLE_STATUSES: readonly VehicleStatus[] = [
  "active",
  "idle",
  "maintenance",
  "retired",
] as const;

/** Suggested repair/event type presets; custom text also allowed. */
export const MAINTENANCE_EVENT_TYPES: readonly string[] = [
  "Tyre Change",
  "Engine Repair",
  "Oil Change",
  "Clutch/Gearbox",
  "Brake Service",
  "Body/Paint",
  "Electrical",
  "Other",
] as const;
