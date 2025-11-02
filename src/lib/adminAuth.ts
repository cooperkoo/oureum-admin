// src/lib/adminAuth.ts
// Helpers for Admin MetaMask sign-in with backend verification.
// All comments are in English as requested.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "";

/** Normalize an EVM address to lowercase 0x…40 hex chars. Return "" if invalid. */
export function normalizeAddress(addr: string): string {
  const a = String(addr || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(a) ? a : "";
}

const ADMIN_SESSION_KEY = "ou_admin_session_v1";

type AdminSession = {
  wallet: string;
  ts: number;
};

/** Persist admin session (localStorage + cookie for middleware SSR). */
export function saveAdminSession(wallet: string) {
  const w = normalizeAddress(wallet);
  if (!w) return;
  const payload: AdminSession = { wallet: w, ts: Date.now() };
  try {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(payload));
  } catch {}
  try {
    // Cookie read by middleware (SSR). 7 days validity; adjust as needed.
    document.cookie = `ou_admin=1; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  } catch {}
}

/** Clear admin session. */
export function clearAdminSession() {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {}
  try {
    // Expire cookie immediately
    document.cookie = `ou_admin=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {}
}

/** Read admin session from localStorage. */
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
 * Backend verification: call an admin-only endpoint with x-admin-wallet header.
 * If it returns 200, the wallet is whitelisted as admin.
 */
export async function isAdminAddress(addr: string): Promise<boolean> {
  const w = normalizeAddress(addr);
  if (!w) return false;

  if (!API_BASE) {
    // In dev, you must set NEXT_PUBLIC_API_BASE (e.g. http://localhost:4000).
    return false;
  }

  const url = `${API_BASE}/api/admin/users?limit=1`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "x-admin-wallet": w },
  });

  return res.ok; // 200 means pass; 401/403 mean not in whitelist
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