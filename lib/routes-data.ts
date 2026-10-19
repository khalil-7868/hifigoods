import { createClient } from "@/lib/supabase/server";
import { throwDbError } from "@/lib/supabase/errors";
import { RECEIPTS_BUCKET } from "@/lib/storage";
import type { Expense, Route } from "@/lib/database.types";

export interface ExpenseVM extends Expense {
  /** Short-lived signed URL for a private receipt, or null when none. */
  receiptSignedUrl: string | null;
}

export interface RouteVM extends Route {
  vehicle: { plate_number: string; make_model: string | null } | null;
  /** Expenses recorded directly on this route (not on its legs). */
  expenses: ExpenseVM[];
  /** Sum of this route's own expenses. */
  expensesTotal: number;
  /** Own revenue minus own expenses (leaf-level figure). */
  profit: number;

  /** Legs of this route. Empty for a simple route. */
  subRoutes: RouteVM[];
  /** Rolled-up rent: own revenue for a leaf, or the sum of legs for a main route. */
  totalRevenue: number;
  /** Rolled-up expenses: own expenses plus every leg's expenses. */
  totalExpenses: number;
  totalProfit: number;
}

const SIGNED_URL_TTL = 60 * 60; // 1 hour

type RawRoute = Route & {
  vehicles: { plate_number: string; make_model: string | null } | null;
  expenses: Expense[];
};

const SELECT = "*, vehicles(plate_number, make_model), expenses(*)";

/** Sign every receipt path in one request; returns path -> signed URL. */
async function signReceipts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: RawRoute[],
): Promise<Map<string, string>> {
  const paths = rows.flatMap((r) =>
    r.expenses.map((e) => e.receipt_url).filter((p): p is string => !!p),
  );
  const map = new Map<string, string>();
  if (paths.length === 0) return map;

  const { data: signed } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL);
  for (const s of signed ?? []) {
    if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
  }
  return map;
}

/** Turn a raw row into a node with own-expense figures (children added later). */
function toNode(r: RawRoute, signedMap: Map<string, string>): RouteVM {
  const expenses: ExpenseVM[] = [...r.expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({
      ...e,
      receiptSignedUrl: e.receipt_url
        ? (signedMap.get(e.receipt_url) ?? null)
        : null,
    }));

  const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return {
    ...r,
    vehicle: r.vehicles,
    expenses,
    expensesTotal,
    profit: Number(r.revenue) - expensesTotal,
    subRoutes: [],
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
  };
}

/**
 * Compute rollups bottom-up.
 * Leaf  : totalRevenue = own revenue.
 * Parent: totalRevenue = sum of legs (the main route's rent IS its legs' rent).
 * Expenses always roll up (own + every leg's).
 */
function rollup(node: RouteVM): RouteVM {
  node.subRoutes.forEach(rollup);

  const legRevenue = node.subRoutes.reduce((s, c) => s + c.totalRevenue, 0);
  const legExpenses = node.subRoutes.reduce((s, c) => s + c.totalExpenses, 0);

  node.totalRevenue =
    node.subRoutes.length > 0 ? legRevenue : Number(node.revenue);
  node.totalExpenses = node.expensesTotal + legExpenses;
  node.totalProfit = node.totalRevenue - node.totalExpenses;
  return node;
}

/** Link children to parents and return the root (main) routes. */
function buildTree(nodes: RouteVM[]): RouteVM[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: RouteVM[] = [];

  for (const node of nodes) {
    const parent = node.parent_route_id
      ? byId.get(node.parent_route_id)
      : undefined;
    if (parent) parent.subRoutes.push(node);
    else roots.push(node);
  }

  // Legs read naturally in the order they were created.
  for (const n of nodes) {
    n.subRoutes.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  roots.forEach(rollup);
  return roots;
}

/* -------------------------------------------------------------------------- */
/* Filtered, paginated list                                                    */
/* -------------------------------------------------------------------------- */

export interface RouteFilters {
  /** Free text matched against origin, destination and material. */
  query?: string;
  /** Vehicle uuid, or "all". */
  vehicleId?: string;
  /** Inclusive ISO date bounds on start_date. */
  from?: string;
  to?: string;
  /** 1-based. */
  page?: number;
  perPage?: number;
}

export interface RoutesPage {
  routes: RouteVM[];
  /** Main routes matching the filters, before pagination. */
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  /** True when any filter other than pagination is active. */
  filtered: boolean;
}

export const ROUTES_PER_PAGE = 20;

/**
 * PostgREST parses `,` `.` `(` `)` inside .or() as syntax, so a raw user
 * string can break the filter (or worse, widen it). Strip those characters
 * and cap the length rather than trying to escape them.
 */
function sanitizeForFilter(value: string): string {
  return value.replace(/[,.()%*\\]/g, " ").trim().slice(0, 60);
}

/**
 * One page of the user's MAIN routes, each with its legs and rolled-up totals.
 *
 * Previously this fetched every route with every nested expense on each render.
 * Now filtering and pagination happen in Postgres, and only the current page's
 * legs are loaded — the payload no longer grows with the size of the book.
 *
 * The list view never surfaces receipt links, so we skip the signReceipts()
 * round-trip that getRouteDetail() needs for the single-route page.
 */
export async function getRoutesDetailed(
  filters: RouteFilters = {},
): Promise<RoutesPage> {
  const supabase = await createClient();

  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.max(1, filters.perPage ?? ROUTES_PER_PAGE);
  const query = (filters.query ?? "").trim();
  const vehicleId =
    filters.vehicleId && filters.vehicleId !== "all"
      ? filters.vehicleId
      : undefined;

  const filtered = Boolean(query || vehicleId || filters.from || filters.to);

  /** Apply the shared filters to either a count or a select query. */
  const applyFilters = <T extends { eq: unknown; gte: unknown; lte: unknown }>(
    q: T,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let out: any = q;
    if (vehicleId) out = out.eq("vehicle_id", vehicleId);
    if (filters.from) out = out.gte("start_date", filters.from);
    if (filters.to) out = out.lte("start_date", filters.to);
    return out;
  };

  // A text search should also hit a route whose LEG matches, so resolve the
  // set of matching main-route ids first.
  let restrictIds: string[] | undefined;
  if (query) {
    const safe = sanitizeForFilter(query);
    if (safe) {
      const pattern = `%${safe}%`;
      const { data: hits, error: hitsError } = await supabase
        .from("routes")
        .select("id, parent_route_id")
        .or(
          `origin.ilike.${pattern},destination.ilike.${pattern},material.ilike.${pattern}`,
        );

      if (hitsError) throwDbError(hitsError.message);

      restrictIds = Array.from(
        new Set((hits ?? []).map((h) => h.parent_route_id ?? h.id)),
      );
      // No matches at all — short-circuit instead of issuing `.in('id', [])`.
      if (restrictIds.length === 0) {
        return {
          routes: [],
          total: 0,
          page: 1,
          perPage,
          pageCount: 0,
          filtered,
        };
      }
    }
  }

  // 1) Count matching main routes so the pager knows how many pages exist.
  let countQuery = supabase
    .from("routes")
    .select("id", { count: "exact", head: true })
    .is("parent_route_id", null);
  countQuery = applyFilters(countQuery);
  if (restrictIds) countQuery = countQuery.in("id", restrictIds);

  const { count, error: countError } = await countQuery;
  if (countError) throwDbError(countError.message);

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, pageCount);
  const offset = (safePage - 1) * perPage;

  // 2) Fetch just this page of main routes, newest first.
  let pageQuery = supabase
    .from("routes")
    .select(SELECT)
    .is("parent_route_id", null)
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);
  pageQuery = applyFilters(pageQuery);
  if (restrictIds) pageQuery = pageQuery.in("id", restrictIds);

  const { data: mains, error } = await pageQuery;
  if (error) throwDbError(error.message);

  const mainRows = (mains ?? []) as unknown as RawRoute[];
  if (mainRows.length === 0) {
    return { routes: [], total, page: safePage, perPage, pageCount, filtered };
  }

  // 3) Fetch only the legs belonging to this page.
  const { data: legs, error: legError } = await supabase
    .from("routes")
    .select(SELECT)
    .in(
      "parent_route_id",
      mainRows.map((r) => r.id),
    )
    .order("created_at", { ascending: true });

  if (legError) throwDbError(legError.message);

  const noSignedUrls = new Map<string, string>();
  const nodes = [...mainRows, ...((legs ?? []) as unknown as RawRoute[])].map(
    (r) => toNode(r, noSignedUrls),
  );

  return {
    routes: buildTree(nodes),
    total,
    page: safePage,
    perPage,
    pageCount,
    filtered,
  };
}

/**
 * Every route (mains AND legs) with expenses, unpaginated. Used by analytics
 * surfaces — dashboard and reports — which must total the whole book.
 */
export async function getAllRoutesDetailed(): Promise<RouteVM[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("routes")
    .select(SELECT)
    .order("start_date", { ascending: false });

  if (error) throwDbError(error.message);

  const rows = (data ?? []) as unknown as RawRoute[];
  const noSignedUrls = new Map<string, string>();
  return buildTree(rows.map((r) => toNode(r, noSignedUrls)));
}

/** A single route plus its legs, with rolled-up totals. Null when not found. */
export async function getRouteDetail(id: string): Promise<RouteVM | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("routes")
    .select(SELECT)
    .or(`id.eq.${id},parent_route_id.eq.${id}`)
    .order("created_at", { ascending: true });

  if (error) throwDbError(error.message);

  const rows = (data ?? []) as unknown as RawRoute[];
  if (rows.length === 0) return null;

  const signedMap = await signReceipts(supabase, rows);
  const nodes = rows.map((r) => toNode(r, signedMap));

  const root = nodes.find((n) => n.id === id);
  if (!root) return null;

  for (const n of nodes) {
    if (n.parent_route_id === id) root.subRoutes.push(n);
  }
  root.subRoutes.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return rollup(root);
}
