// src/lib/apiTokenOps.ts
// Lightweight frontend client for token-ops admin API (pause/resume/status/logs)

export type ApiError = { message: string; status?: number; code?: string };

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "http://localhost:4000";

const PATHS = {
  status: "/api/token-ops/status",
  pause: "/api/token-ops/pause",
  resume: "/api/token-ops/resume",
  logs: "/api/token-ops/logs",
} as const;

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

// ----- Response types -----
export type TokenOpsStatus = { ok: true; paused: boolean };
export type TokenOpsAction = { ok: true; action: "pause" | "resume"; txHash: string };
export type TokenOpsLog = {
  id: string | number;
  admin_wallet: string;
  action: string;
  tx_hash: string;
  note: string;
  created_at: string;
};

// ----- Public API -----
export function getContractStatus(): Promise<TokenOpsStatus> {
  return fetchJson<TokenOpsStatus>(PATHS.status, { method: "GET", admin: false });
}

export function pauseContract(): Promise<TokenOpsAction> {
  return fetchJson<TokenOpsAction>(PATHS.pause, { method: "POST", admin: true });
}

export function resumeContract(): Promise<TokenOpsAction> {
  return fetchJson<TokenOpsAction>(PATHS.resume, { method: "POST", admin: true });
}

export function getTokenOpsLogs(params?: {
  limit?: number;
  offset?: number;
  action?: string;
  operator?: string;
}): Promise<{ data: TokenOpsLog[]; limit: number; offset: number }> {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.action) qs.set("action", params.action);
  if (params?.operator) qs.set("operator", params.operator);
  return fetchJson<{ data: TokenOpsLog[]; limit: number; offset: number }>(
    `${PATHS.logs}?${qs.toString()}`,
    { method: "GET", admin: true }
  );
}