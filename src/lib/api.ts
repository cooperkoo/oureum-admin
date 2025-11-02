// src/lib/api.ts
// Tiny API helper for both public and admin calls.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

/** Read/Write admin wallet (lowercased) in localStorage. */
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

/** Generic JSON fetch with optional admin header. */
export async function fetchJson<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: any;
    admin?: boolean; // include x-admin-wallet if true
  } = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.admin) {
    const wallet = getAdminWallet();
    if (wallet) headers["x-admin-wallet"] = wallet;
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data as T;
}

/** Connect MetaMask and persist admin wallet locally. */
export async function connectMetaMaskAsAdmin(): Promise<string> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("MetaMask not detected.");
  }
  const accounts: string[] = await (window as any).ethereum.request({
    method: "eth_requestAccounts",
  });
  const addr = (accounts?.[0] || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(addr)) {
    throw new Error("No valid account from MetaMask.");
  }
  setAdminWallet(addr);
  return addr;
}