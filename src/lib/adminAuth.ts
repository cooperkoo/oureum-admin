// src/lib/adminAuth.ts
// Helpers for Admin MetaMask sign-in with backend verification.
// All comments are in English as requested.

/** Normalized API base (no trailing slash). */
export const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

/** Normalize an EVM address to lowercase 0x…40 hex chars. Return "" if invalid. */
export function normalizeAddress(addr: string): string {
  const a = String(addr || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(a) ? a : "";
}

const ADMIN_SESSION_KEY = "ou_admin_session_v1";

type AdminSession = {
  wallet: string;
  ts: number; // unix ms
};

/** Persist admin session (browser localStorage). */
export function saveAdminSession(wallet: string) {
  const w = normalizeAddress(wallet);
  if (!w) return;
  const payload: AdminSession = { wallet: w, ts: Date.now() };
  try {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors (Safari private mode, etc.)
  }
}

/** Clear admin session. */
export function clearAdminSession() {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Read admin session. */
export function readAdminSession(): { isAdmin: boolean; wallet?: string } {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return { isAdmin: false };
    const parsed = JSON.parse(raw) as AdminSession;
    const w = normalizeAddress(parsed?.wallet || "");
    if (!w) return { isAdmin: false };
    return { isAdmin: true, wallet: w };
  } catch {
    return { isAdmin: false };
  }
}

/**
 * Request MetaMask accounts and return the first normalized address.
 * Throws if MetaMask is not present or user rejects.
 */
export async function requestMetaMaskAddress(): Promise<string> {
  const anyWin = window as any;
  if (!anyWin?.ethereum?.request) {
    throw new Error("MetaMask not detected. Please install MetaMask.");
  }
  const accounts: string[] = await anyWin.ethereum.request({
    method: "eth_requestAccounts",
  });
  const addr = normalizeAddress(accounts?.[0] || "");
  if (!addr) throw new Error("No account returned from MetaMask.");
  return addr;
}

/** Tiny helper for fetch with timeout (client-side). */
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Backend verification: call an admin-only endpoint with x-admin-wallet header.
 * If it returns 200, the wallet is whitelisted as admin.
 * - Returns boolean only (UI decides how to display errors).
 * - Prints minimal console info on non-200 to help debugging in staging.
 */
export async function isAdminAddress(addr: string): Promise<boolean> {
  const w = normalizeAddress(addr);
  if (!w) return false;

  if (!API_BASE) {
    // In dev, you must set NEXT_PUBLIC_API_BASE (e.g. http://localhost:4000)
    return false;
  }

  const url = `${API_BASE}/api/admin/users?limit=1`;
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: { "x-admin-wallet": w },
      },
      10_000
    );

    if (res.ok) return true;

    // Minimal debug information (visible in browser console only)
    const text = await res.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.warn(
      "[isAdminAddress] backend returned",
      res.status,
      res.statusText,
      "| body:",
      text?.slice(0, 200)
    );
    return false;
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn("[isAdminAddress] request failed:", e?.message || e);
    return false;
  }
}

/** Optional: quick backend health check (can be used on Settings page). */
export async function pingApi(): Promise<boolean> {
  if (!API_BASE) return false;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, { method: "GET" }, 5_000);
    return res.ok;
  } catch {
    return false;
  }
}