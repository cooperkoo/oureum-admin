/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/api.ts
// Frontend API helper aligned to the current backend routes.
// All comments are in English for cross-team readability.

export type Address = `0x${string}`;

export type Activity = {
  id: string;
  type: string;
  detail?: string;
  createdAt?: string;
};

export type UserWithBalances = {
  wallet: Address;
  rm_credit: number;
  rm_spent: number;
  oumg_grams: number;
  updated_at?: string;
};

export type PriceSnapshot = {
  price_myr_per_g?: number;
  buy_myr_per_g?: number;
  sell_myr_per_g?: number;
  user_buy_myr_per_g?: number;
  user_sell_myr_per_g?: number;
  source?: "manual" | "cron";
  updated_at?: string;
};

export type LedgerItem = {
  id: string;
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
  id: string;
  wallet: Address;
  grams: number;
  type: "CASH" | "GOLD";
  status: RedemptionStatus;
  fee_myr?: number;
  amount_myr?: number;
  created_at: string;
  updated_at: string;
};

export type ApiError = { message: string; status?: number; code?: string };

// ---------- Base ----------
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export const API_PATHS = {
  // Pricing
  priceCurrent: "/api/price/current",            // GET (public)
  priceManualUpdate: "/api/price/manual-update", // POST (admin)
  priceSnapshots: "/api/price/snapshots",        // GET (admin, paginated)

  // Chain pause/resume
  chainPaused: "/api/chain/paused",              // GET (public)
  chainPause: "/api/chain/pause",                // POST (admin)
  chainUnpause: "/api/chain/unpause",            // POST (admin)

  // Admin
  adminFundPreset: "/api/admin/fund-preset",     // POST (admin)
  adminUsers: "/api/admin/users",                // GET (admin, paginated)
  adminBalances: "/api/admin/balances",          // GET (admin? wallet=)
  adminAudits: "/api/admin/audits",              // GET (admin, paginated)

  // Token operations
  tokenBuyMint: "/api/token/buy-mint",           // POST (admin)
  tokenSellBurn: "/api/token/sell-burn",         // POST (admin)
  tokenOps: "/api/token/ops",                    // GET (admin)

  // Ledger
  ledgerGold: "/api/ledger/gold",                // GET/POST (admin)

  // Redemptions
  redemption: "/api/redemption",                 // GET (admin) / POST (public) / PATCH (admin :id)
};

// ---------- Admin wallet header ----------
export function getAdminWallet(): string | null {
  if (typeof window === "undefined") return null;
  const w = localStorage.getItem("admin_wallet") || "";
  return w && /^0x[a-f0-9]{40}$/.test(w) ? w : null;
}

export function setAdminWallet(addr: string | null) {
  if (typeof window === "undefined") return;
  if (addr && /^0x[a-f0-9]{40}$/.test(addr.toLowerCase())) {
    localStorage.setItem("admin_wallet", addr.toLowerCase());
  } else {
    localStorage.removeItem("admin_wallet");
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
    // If backend returns plain text, map into a predictable shape
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
    credentials:  "omit",
  });
  const data = await parseJsonSafe<unknown>(res);
  if (!res.ok) {
    const msg = (data as { error?: string; message?: string })?.error || (data as { message?: string })?.message;
    const err: ApiError = { message: msg || `HTTP ${res.status}`, status: res.status };
    throw err;
  }
  return data as T;
}

// ---------- Pricing ----------
export async function getPriceSnapshot(): Promise<PriceSnapshot> {
  // Backend shape: { data: { ... } }
  const r = await fetchJson<{ data: PriceSnapshot }>(API_PATHS.priceCurrent, { admin: false });
  return r.data ?? {};
}
export function listPriceSnapshots(params?: { limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  return fetchJson<{ data: PriceSnapshot[] }>(`${API_PATHS.priceSnapshots}?${qs.toString()}`, { admin: true });
}
export function manualPriceUpdate(payload: { myrPerG?: number; myrPerG_buy?: number; myrPerG_sell?: number; note?: string }) {
  return fetchJson<{ success: true }>(API_PATHS.priceManualUpdate, { method: "POST", body: payload, admin: true });
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

// ---------- Admin (users / balances / audits) ----------
export function listUsers(params?: { limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  return fetchJson<{ data: UserWithBalances[] }>(`${API_PATHS.adminUsers}?${qs.toString()}`, { admin: true });
}
export function getUserBalancesAdmin(wallet: Address) {
  const qs = new URLSearchParams({ wallet });
  return fetchJson<{ data: UserWithBalances }>(`${API_PATHS.adminBalances}?${qs.toString()}`, { admin: true });
}
export function listAudits(params?: { limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  return fetchJson<{ data: Activity[] }>(`${API_PATHS.adminAudits}?${qs.toString()}`, { admin: true });
}
export function fundPreset(address: Address, amountMyr: number) {
  return fetchJson<{ success: true; result: unknown }>(API_PATHS.adminFundPreset, {
    method: "POST",
    admin: true,
    body: { wallet: address, amountMyr },
  });
}

// ---------- Token operations ----------
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
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  return fetchJson<{ data: unknown[] }>(`${API_PATHS.tokenOps}?${qs.toString()}`, { admin: true });
}

// ---------- Ledger (gold) ----------
export function listGoldLedger() {
  return fetchJson<{ data: LedgerItem[] }>(API_PATHS.ledgerGold, { admin: true });
}
export function createGoldLedger(item: { date: string; source: string; batch: string; purity: string; grams: number }) {
  return fetchJson<LedgerItem>(API_PATHS.ledgerGold, { method: "POST", admin: true, body: item });
}

// ---------- Redemptions ----------
export function listRedemptions(params?: { status?: RedemptionStatus; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  return fetchJson<{ data: Redemption[] }>(`${API_PATHS.redemption}?${qs.toString()}`, { admin: true });
}
export function updateRedemption(
  id: string,
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