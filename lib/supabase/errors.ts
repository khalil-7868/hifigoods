/**
 * Translates raw Postgres "missing column / missing relation" errors into a
 * message that names the exact migration to run. Without this you just get
 * `column routes.parent_route_id does not exist`, which doesn't tell you what
 * to do about it.
 */

interface MigrationHint {
  /** Matches the offending column or relation name. */
  pattern: RegExp;
  migration: string;
  what: string;
}

const HINTS: MigrationHint[] = [
  {
    pattern: /parent_route_id/i,
    migration: "migration_03.sql",
    what: "sub-routes (route legs)",
  },
  {
    pattern: /\b(party_id|driver_id|broker_id|broker_commission\w*|odometer)\b/i,
    migration: "migration_05.sql",
    what: "parties, drivers, brokers and tyres",
  },
  {
    pattern:
      /\b(parties|party_payments|brokers|drivers|driver_advances|tyres|vehicle_owners)\b/i,
    migration: "migration_05.sql",
    what: "parties, drivers, brokers and tyres",
  },
  {
    pattern: /\b(avatars|delete_current_user)\b/i,
    migration: "migration_02.sql",
    what: "avatars storage and account deletion",
  },
];

const SCHEMA_DRIFT =
  /(column|relation)\s+.*(does not exist)|could not find the .* column|schema cache/i;

/**
 * Returns a human-actionable message for a Supabase/Postgres error, or the
 * original message when it isn't a schema-drift problem.
 */
export function describeDbError(message: string): string {
  if (!SCHEMA_DRIFT.test(message)) return message;

  const hint = HINTS.find((h) => h.pattern.test(message));
  if (hint) {
    return `Your database is missing the ${hint.what} schema. Run supabase/${hint.migration} in the Supabase SQL editor, then reload. (${message})`;
  }

  return `Your database schema is out of date. Run the pending scripts in supabase/ (migration_02 → 03 → 04 → 05) in the Supabase SQL editor. (${message})`;
}

/** Throw a described error, for use right after a Supabase query. */
export function throwDbError(message: string): never {
  throw new Error(describeDbError(message));
}
