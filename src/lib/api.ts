/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/api.ts
// Frontend API helper aligned with current backend routes.
// ✅ 2025-11-04: Robust pricing normalization + safe front-end inference
//    so the History table shows Buy/Sell/Spread when the backend omits them.

export type Address = `0x${string}`;

export type Activity = {
  id: string | number;
  type: string;
  detail?: string;
  createdAt?: string;
};

export type UserWithBalances = {
  id?: number;
  wallet: Address;
  rm_credit: number;     // MYR
  rm_spent: number;      // MYR
  oumg_grams: number;    // grams
  note?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PriceSnapshot = {
  // Core price fields
  price_myr_per_g?: number;     // computed/base MYR per gram
  buy_myr_per_g?: number;       // internal/admin buy
  sell_myr_per_g?: number;      // internal/admin sell
  user_buy_myr_per_g?: number;  // end-user buy
  user_sell_myr_per_g?: number; // end-user sell

  // Extras
  spread_myr_per_g?: number;    // absolute spread in MYR/gram
  spread_bps?: number;          // basis points
  source?: "manual" | "cron" | string;
  updated_at?: string;
  created_at?: string;
  effective_date?: string;
  last_updated?: string;
  note?: string;
  id?: string | number;
};

export type LedgerItem = {
  id: string | number;
  date: string;
  source: string;
  batch: string;
  purity: string;
  grams: number;
  created_at: string;
  updated_at: string;
};

export type RedemptionStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
export const REDEMPTION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
} as const;

export type Redemption = {
  id: string | number;
  wallet: Address;
  grams: number;
  type: "CASH" | "GOLD";
  status: RedemptionStatus;
  fee_myr?: number | null;
  amount_myr?: number | null;
  created_at: string;
  updated_at: string;
};

export type ApiError = { message: string; status?: number; code?: string };

// ---------- Base ----------
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") ||
  "http://localhost:4000";

export const API_PATHS = {
  // Pricing
  priceCurrent: "/api/price/current",         // GET (public), POST (admin for manual update)
  priceSnapshots: "/api/price/snapshots",     // GET (admin)

  // Chain pause/resume
  chainPaused: "/api/chain/paused",           // GET (public)
  chainPause: "/api/chain/pause",             // POST (admin)
  chainUnpause: "/api/chain/unpause",         // POST (admin)

  // Admin
  adminFundPreset: "/api/admin/fund-preset",
  adminUsers: "/api/admin/users",
  adminUserCredit: (wallet: string) => `/api/admin/users/${wallet}/credit`,
  adminUserPurchase: (wallet: string) => `/api/admin/users/${wallet}/purchase`,
  adminBalances: "/api/admin/balances",
  adminAudits: "/api/admin/audits",

  // Token operations (fallback)
  tokenBuyMint: "/api/token/buy-mint",
  tokenSellBurn: "/api/token/sell-burn",
  tokenOps: "/api/token/ops",

  // Ledger
  ledgerGold: "/api/ledger/gold",

  // Redemptions
  redemption: "/api/redemption",
};

// ---------- Admin wallet header ----------
export function getAdminWallet(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("ou_admin_session_v1");
    if (raw) {
      const parsed = JSON.parse(raw) as { wallet?: string; isAdmin?: boolean };
      const w = (parsed?.wallet || "").toLowerCase();
      if (/^0x[a-f0-9]{40}$/.test(w)) return w;
    }
  } catch {
    // ignore malformed JSON
  }

  const legacy = (localStorage.getItem("admin_wallet") || "").toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(legacy) ? legacy : null;
}

export function setAdminWallet(addr: string | null) {
  if (typeof window === "undefined") return;
  if (addr && /^0x[a-f0-9]{40}$/.test(addr.toLowerCase())) {
    const normalized = addr.toLowerCase();
    localStorage.setItem("admin_wallet", normalized);
    localStorage.setItem(
      "ou_admin_session_v1",
      JSON.stringify({ wallet: normalized, isAdmin: true, ts: Date.now() })
    );
  } else {
    localStorage.removeItem("admin_wallet");
    localStorage.removeItem("ou_admin_session_v1");
  }
}

// ---------- Low-level fetch ----------
function buildHeaders(admin = false): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (admin) {
    const w = getAdminWallet();
    if (w) h["x-admin-wallet"] = w;
  }
  return h;
}

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    // if backend returns plain text, coerce to { message }
    return { message: text } as unknown as T;
  }
}

async function fetchJson<T>(
  path: string,
  opts: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; admin?: boolean } = {}
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

// ============================================================================
// Pricing helpers: normalization + safe inference
// ============================================================================

type AnyObj = Record<string, any>;

function toNum(v: any): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function round2(n: number | undefined): number | undefined {
  if (!Number.isFinite(Number(n))) return undefined;
  return Math.round((n as number) * 100) / 100;
}

/**
 * Attempt to infer missing fields when the backend doesn't send them.
 * Rules:
 * - Never override provided values.
 * - Prefer symmetric inference around base (buy = base + d/2, sell = base - d/2).
 * - Only compute when input signals are trustworthy (base > 0, spread >= 0, etc).
 */
function fillDerivedPrices(out: PriceSnapshot) {
  const base = out.price_myr_per_g;
  let buy = out.buy_myr_per_g;
  let sell = out.sell_myr_per_g;
  let ubuy = out.user_buy_myr_per_g;
  let usell = out.user_sell_myr_per_g;
  let spreadMYR = out.spread_myr_per_g;
  let bps = out.spread_bps;

  // 1) If spread in MYR is missing but we have buy/sell → compute it.
  if ((spreadMYR == null || !Number.isFinite(spreadMYR)) && buy != null && sell != null) {
    spreadMYR = Math.abs((buy as number) - (sell as number));
  }

  // 2) If spread in MYR is missing but base & bps exist → compute spreadMYR.
  if ((spreadMYR == null || !Number.isFinite(spreadMYR)) && base != null && bps != null && base > 0) {
    spreadMYR = (base as number) * (bps as number) / 10000;
  }

  // 3) If buy/sell are missing but we have base & spreadMYR → infer symmetrically.
  if ((buy == null || sell == null) && base != null && spreadMYR != null) {
    const half = (spreadMYR as number) / 2;
    if (buy == null) buy = (base as number) + half;
    if (sell == null) sell = (base as number) - half;
  }

  // 4) If only one side (buy or sell) + base → reflect around base.
  if (buy != null && sell == null && base != null) {
    sell = (2 * (base as number)) - (buy as number);
  } else if (sell != null && buy == null && base != null) {
    buy = (2 * (base as number)) - (sell as number);
  }

  // 5) If bps missing but we have base & spreadMYR → compute bps.
  if ((bps == null || !Number.isFinite(bps)) && base != null && base > 0 && spreadMYR != null) {
    bps = (spreadMYR as number) / (base as number) * 10000;
  }

  // 6) user prices default to internal prices when absent.
  if (ubuy == null && buy != null) ubuy = buy;
  if (usell == null && sell != null) usell = sell;

  // Round monetary values to 2 decimals; bps keep integer-ish precision.
  out.buy_myr_per_g = round2(buy);
  out.sell_myr_per_g = round2(sell);
  out.user_buy_myr_per_g = round2(ubuy);
  out.user_sell_myr_per_g = round2(usell);
  out.spread_myr_per_g = round2(spreadMYR);
  if (bps != null && Number.isFinite(bps)) out.spread_bps = Math.round(bps as number);
}

/**
 * Map an arbitrary backend shape into the unified PriceSnapshot.
 * We accept multiple aliases to be resilient across services.
 */
function normalizePriceSnapshot(x: AnyObj | undefined | null): PriceSnapshot {
  const obj = x ?? {};

  // Base price (computed)
  const base =
    obj.price_myr_per_g ??
    obj.computed_myr_per_g ??
    obj.myrPerG ??
    obj.price ??
    obj.base_myr_per_g;

  // Internal prices
  const buy =
    obj.buy_myr_per_g ??
    obj.buyMyrPerG ??
    obj.internalBuy ??
    obj.buyPrice ??
    obj.buy;

  const sell =
    obj.sell_myr_per_g ??
    obj.sellMyrPerG ??
    obj.internalSell ??
    obj.sellPrice ??
    obj.sell;

  // End-user prices
  const ubuy = obj.user_buy_myr_per_g ?? obj.userBuyMyrPerG ?? obj.user_buy;
  const usell = obj.user_sell_myr_per_g ?? obj.userSellMyrPerG ?? obj.user_sell;

  // Spread / Markup
  const spreadMYR =
    obj.spread_myr_per_g ?? obj.spreadMyrPerG ?? obj.myr_spread ?? obj.absolute_spread;
  const spreadBps =
    obj.spread_bps ?? obj.markup_bps ?? obj.spreadBps ?? obj.markupBps;

  // Timestamps & meta
  const updated =
    obj.updated_at ??
    obj.updatedAt ??
    obj.last_updated ??
    obj.lastUpdated ??
    obj.effective_date ??
    obj.effectiveDate ??
    obj.created_at ??
    obj.createdAt ??
    obj.effectiveAt;

  const source =
    obj.source ??
    obj.kind ??
    (obj.manual ? "manual" : undefined);

  const out: PriceSnapshot = {
    id: obj.id ?? obj.snapshot_id ?? undefined,
    price_myr_per_g: toNum(base),
    buy_myr_per_g: toNum(buy),
    sell_myr_per_g: toNum(sell),
    user_buy_myr_per_g: toNum(ubuy),
    user_sell_myr_per_g: toNum(usell),
    spread_myr_per_g: toNum(spreadMYR),
    spread_bps: toNum(spreadBps),
    source,
    updated_at: typeof updated === "string" ? updated : undefined,
    created_at: typeof (obj.created_at ?? obj.createdAt) === "string" ? (obj.created_at ?? obj.createdAt) : undefined,
    effective_date: typeof obj.effective_date === "string" ? obj.effective_date : undefined,
    last_updated: typeof obj.last_updated === "string" ? obj.last_updated : undefined,
    note: obj.note ?? obj.remark ?? obj.comments,
  };

  // Safely derive missing numbers for display (History table needs these).
  fillDerivedPrices(out);

  return out;
}

// ---------- Pricing ----------
export async function getPriceSnapshot(): Promise<PriceSnapshot> {
  // Public route; do NOT send admin header
  const r = await fetchJson<{ data?: AnyObj } | AnyObj>(API_PATHS.priceCurrent, { admin: false });
  const raw = (r as any)?.data ?? r;
  return normalizePriceSnapshot(raw);
}

export function listPriceSnapshots(params?: { limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  const url = `${API_PATHS.priceSnapshots}${qs.toString() ? `?${qs.toString()}` : ""}`;

  return fetchJson<{ data?: AnyObj[] }>(url, { admin: true }).then((resp) => {
    const arr = Array.isArray(resp?.data) ? resp!.data! : [];
    const mapped = arr.map((x) => normalizePriceSnapshot(x));
    return { data: mapped as PriceSnapshot[] };
  });
}

/** Allow both legacy and extended fields for manual price override. */
export type ManualPriceUpdatePayload = {
  myrPerG?: number;
  note?: string;
  // extended keys — some backends support these
  myrPerG_buy?: number;
  myrPerG_sell?: number;
  user_buy_myr_per_g?: number;
  user_sell_myr_per_g?: number;
};

export function manualPriceUpdate(payload: ManualPriceUpdatePayload) {
  return fetchJson<{ success?: true }>(API_PATHS.priceCurrent, {
    method: "POST",
    admin: true,
    body: payload,
  });
}

// ---------- Chain (pause/resume) ----------
export function getPausedStatus(): Promise<{ paused: boolean }> {
  return fetchJson<{ paused: boolean }>(API_PATHS.chainPaused, { admin: false });
}
export function pauseContract() {
  return fetchJson<{ success: true; txHash?: string }>(API_PATHS.chainPause, { method: "POST", admin: true });
}
export function unpauseContract() {
  return fetchJson<{ success: true; txHash?: string }>(API_PATHS.chainUnpause, { method: "POST", admin: true });
}

// ---------- Admin: users / balances / audits ----------
export function listUsers(params?: { q?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  const url = `${API_PATHS.adminUsers}${qs.toString() ? `?${qs.toString()}` : ""}`;
  return fetchJson<{ data: UserWithBalances[] }>(url, { admin: true });
}

export function createAdminUser(payload: { wallet: Address; note?: string }) {
  return fetchJson<UserWithBalances>(API_PATHS.adminUsers, {
    method: "POST",
    admin: true,
    body: payload,
  });
}

export function creditAdminUser(payload: { wallet: Address; amount_myr: number; note?: string }) {
  const path = API_PATHS.adminUserCredit(payload.wallet.toLowerCase());
  return fetchJson<UserWithBalances>(path, {
    method: "POST",
    admin: true,
    body: { amount_myr: payload.amount_myr, note: payload.note },
  });
}

export function purchaseAdminUser(payload: {
  wallet: Address;
  grams: number;
  unit_price_myr_per_g: number;
  note?: string;
}) {
  const path = API_PATHS.adminUserPurchase(payload.wallet.toLowerCase());
  return fetchJson<UserWithBalances>(path, {
    method: "POST",
    admin: true,
    body: {
      grams: payload.grams,
      unit_price_myr_per_g: payload.unit_price_myr_per_g,
      note: payload.note,
    },
  });
}

export function getUserBalancesAdmin(wallet: Address) {
  const qs = new URLSearchParams({ wallet });
  return fetchJson<{ data: UserWithBalances }>(`${API_PATHS.adminBalances}?${qs.toString()}`, { admin: true });
}

export function listAudits(params?: { limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  return fetchJson<{ data: Activity[] }>(`${API_PATHS.adminAudits}?${qs.toString()}`, { admin: true });
}

/** fundPreset
 * Some backends expect { wallet, amountMyr }, others { wallet, amount_myr }.
 * We send both keys to stay compatible.
 */
export function fundPreset(address: Address, amountMyr: number, note?: string) {
  return fetchJson<{ success: true; result?: unknown }>(API_PATHS.adminFundPreset, {
    method: "POST",
    admin: true,
    body: { wallet: address, amountMyr, amount_myr: amountMyr, note },
  });
}

// ---------- Token operations (fallbacks) ----------
export function buyMint(address: Address, grams: number) {
  return fetchJson<{ success?: boolean; txHash?: string }>(API_PATHS.tokenBuyMint, {
    method: "POST",
    admin: true,
    body: { wallet: address, grams },
  });
}
export function sellBurn(address: Address, grams: number) {
  return fetchJson<{ success?: boolean; txHash?: string }>(API_PATHS.tokenSellBurn, {
    method: "POST",
    admin: true,
    body: { wallet: address, grams },
  });
}
export function listTokenOps(params?: { limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  return fetchJson<{ data: unknown[] }>(`${API_PATHS.tokenOps}?${qs.toString()}`, { admin: true });
}

// ---------- Ledger (gold) ----------
export function listGoldLedger() {
  return fetchJson<{ data: LedgerItem[] }>(API_PATHS.ledgerGold, { admin: true });
}
export function createGoldLedger(item: {
  date: string;
  source: string;
  batch: string;
  purity: string;
  grams: number;
}) {
  return fetchJson<LedgerItem>(API_PATHS.ledgerGold, { method: "POST", admin: true, body: item });
}

// ---------- Redemptions ----------
export function listRedemptions(params?: { status?: RedemptionStatus; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  return fetchJson<{ data: Redemption[] }>(`${API_PATHS.redemption}?${qs.toString()}`, { admin: true });
}
export function updateRedemption(
  id: string | number,
  patch: Partial<Pick<Redemption, "status">> & { note?: string; txHash?: string }
) {
  return fetchJson<{ success: true }>(`${API_PATHS.redemption}/${id}`, {
    method: "PATCH",
    admin: true,
    body: patch,
  });
}

// ---------- Admin connect (MetaMask) ----------
export async function connectMetaMaskAsAdmin(): Promise<string> {
  if (typeof window === "undefined" || !(window as unknown as { ethereum?: unknown }).ethereum) {
    throw new Error("MetaMask not detected.");
  }
  const ethereum = (window as unknown as { ethereum: { request: (x: { method: string }) => Promise<string[]> } }).ethereum;
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const addr = (accounts?.[0] || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(addr)) throw new Error("No valid account from MetaMask.");
  setAdminWallet(addr);
  return addr;
}