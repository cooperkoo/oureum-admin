// src/lib/apiGoldLedger.ts
// Lightweight frontend client for gold ledger admin API (list & create)

export type ApiError = { message: string; status?: number; code?: string };

export interface GoldLedgerEntry {
  id?: number;
  entry_date: string;        // YYYY-MM-DD
  intake_g: number;
  source?: string | null;
  purity_bp?: number | null; // basis points, e.g. 9999
  serial?: string | null;
  batch?: string | null;
  storage?: string | null;
  custody?: string | null;
  insurance?: string | null;
  audit_ref?: string | null;
  note?: string | null;
}

// ---- Base & helpers (same pattern as apiTokenOps.ts) ----
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "http://localhost:4000";

/** Read admin wallet from localStorage (same behavior as your reference) */
function getAdminWallet(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ou_admin_session_v1");
    if (raw) {
      const parsed = JSON.parse(raw) as { wallet?: string; isAdmin?: boolean };
      const w = (parsed?.wallet || "").toLowerCase();
      if (/^0x[a-f0-9]{40}$/.test(w)) return w;
    }
  } catch {}
  const legacy = (localStorage.getItem("admin_wallet") || "").toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(legacy) ? legacy : null;
}

/** Build headers; send admin wallet in header for admin-guarded routes */
function buildHeaders(admin = false): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (admin) {
    const w = getAdminWallet();
    if (w) {
      // Match server CORS allow-list case ("X-Admin-Wallet")
      h["X-Admin-Wallet"] = w;
    }
  }
  return h;
}

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { message: text } as unknown as T;
  }
}

async function fetchJson<T>(
  path: string,
  opts: { method?: "GET" | "POST"; body?: unknown; admin?: boolean } = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: buildHeaders(Boolean(opts.admin)),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
    credentials: "omit",
  });
  const data = await parseJsonSafe<unknown>(res);
  if (!res.ok) {
    const msg =
      (data as { error?: string; message?: string })?.error ||
      (data as { message?: string })?.message;
    const err: ApiError = { message: msg || `HTTP ${res.status}`, status: res.status };
    throw err;
  }
  return data as T;
}

// ---- Public API ----

/**
 * GET /api/ledger/gold
 * Returns an array of entries (the backend responds with { data: [...] }).
 * For convenience, we unwrap to GoldLedgerEntry[] to match your page usage.
 */
export async function listGoldLedger(params?: {
  from?: string;
  to?: string;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<GoldLedgerEntry[]> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.source) qs.set("source", params.source);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));

  const resp = await fetchJson<{ data: GoldLedgerEntry[] }>(
    `/api/ledger/gold?${qs.toString()}`,
    { method: "GET", admin: true }
  );
  return resp.data || [];
}

/**
 * POST /api/ledger/gold
 * Body: GoldLedgerEntry (entry_date & intake_g required)
 * Backend returns { success: true, row }
 */
export async function createGoldLedger(entry: GoldLedgerEntry): Promise<{
  success: boolean;
  row: GoldLedgerEntry;
}> {
  return fetchJson<{ success: boolean; row: GoldLedgerEntry }>(
    `/api/ledger/gold`,
    { method: "POST", admin: true, body: entry }
  );
}