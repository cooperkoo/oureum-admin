/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * app/(admin)/users/page.tsx
 *
 * Users admin page wired to backend admin endpoints.
 * Improvements:
 * - Fetch waits until adminWallet is resolved (prevents first-frame "No users found.")
 * - Debounced search + Enter immediate search
 * - Latest-response-wins: drop stale responses by requestId
 * - Never clear list on error; keep previous data
 * - "No users found." only shown after first real fetch completes
 *
 * English-only comments; UI text stays as in your code.
 */

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import type { Address, UserWithBalances, PriceSnapshot } from "@/lib/api";
import { getAdminWallet, listUsers, getPriceSnapshot } from "@/lib/api";

import AddUserModal from "./Modals/AddUserModal";
import CreditModal from "./Modals/CreditModal";
import MintModal from "./Modals/MintModal";

// Fallback price if backend returns nothing usable
const FALLBACK_PRICE_MYR_PER_G = 500;

type Row = {
  id?: number;
  address: Address;
  rmCredit: number;
  rmSpent: number;
  oumgPurchased: number;
  note?: string;
  updated?: string;
};

/** Helper: truncate wallet for display */
function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/** Reusable address display with copy & tooltip (pure client) */
function AddressDisplay({ address }: { address: Address }) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 group relative">
      <span className="font-mono">{truncateAddress(address)}</span>
      <button
        onClick={copy}
        className="relative flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
        disabled={copied}
        aria-label="Copy address"
        title={copied ? "Copied!" : "Copy address"}
      >
        {copied ? (
          // Checkmark icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-green-500"
          >
            <path
              fillRule="evenodd"
              d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          // Copy icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 16.5v-13Z" />
            <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v10A1.5 1.5 0 0 0 4.5 19h7a1.5 1.5 0 0 0 1.5-1.5v-1.333a.75.75 0 0 1-1.5 0V17.5a.5.5 0 0 1-.5-.5h-7a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h1.333a.75.75 0 0 1 0 1.5H4.5Z" />
          </svg>
        )}
      </button>

      {/* Hover tooltip with full address */}
      <div
        className="
          absolute left-0 bottom-full mb-2
          w-auto p-2 px-3
          bg-gray-800 text-white
          text-xs font-mono rounded-md shadow-lg 
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200 
          pointer-events-none
          z-10
          whitespace-nowrap
        "
      >
        {address}
        <div
          className="
            absolute left-0 top-full ml-4 
            w-0 h-0
            border-l-[6px] border-l-transparent
            border-r-[6px] border-r-transparent
            border-t-[6px] border-t-gray-800
          "
        />
      </div>
    </div>
  );
}

/** Tiny debounce hook to avoid over-fetching while typing */
function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function UsersPage() {
  // --- Admin wallet gate ---
  const [adminWallet, setAdminWalletState] = useState<string | null>(null);
  const [adminReady, setAdminReady] = useState(false); // true after we attempt to read from storage once

  // --- Server data ---
  const [users, setUsers] = useState<Row[]>([]);
  const [price, setPrice] = useState<PriceSnapshot | null>(null);

  // --- UI state ---
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false); // only show "No users found." after true

  // --- Search ---
  const [query, setQuery] = useState("");
  const debouncedQ = useDebounced(query, 250);

  // Immediate search nonce (Enter key)
  const [searchNonce, setSearchNonce] = useState(0);

  // --- Modals ---
  const [addOpen, setAddOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [mintOpen, setMintOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  // --- latest-response-wins ---
  const reqSeq = useRef(0); // increases each fetch
  const lastAppliedSeq = useRef(0); // last seq that actually mutated state

  // Load admin wallet once (client-only)
  useEffect(() => {
    const w = getAdminWallet(); // sync read from localStorage in your lib
    setAdminWalletState(w);
    setAdminReady(true);
  }, []);

  /** Fetch function reused by both debounced and immediate searches */
  const fetchData = useCallback(
    async (qForFetch: string | undefined, options?: { immediate?: boolean }) => {
      // If admin not ready yet, don't start; prevents first-frame "No users"
      if (!adminReady) return;

      // Only fetch users when adminWallet exists; price can still be fetched.
      const seq = ++reqSeq.current;
      if (options?.immediate) {
        setLoading(true);
      } else if (!hasFetchedOnce) {
        // During first load keep skeleton; avoid jitter
        setLoading(true);
      }

      setErrorText(null);

      try {
        const [p, u] = await Promise.all([
          getPriceSnapshot().catch(() => ({} as PriceSnapshot)),
          adminWallet
            ? listUsers({ q: qForFetch ?? "", limit: 100 })
            : Promise.resolve({ data: [] as UserWithBalances[] }),
        ]);

        // Drop stale response
        if (seq < lastAppliedSeq.current) return;

        setPrice(p || null);

        const rows: Row[] = (u.data || []).map((x) => ({
          id: x.id,
          address: x.wallet as Address,
          rmCredit: Number(x.rm_credit || 0),
          rmSpent: Number(x.rm_spent || 0),
          oumgPurchased: Number(x.oumg_grams || 0),
          note: (x as any).note ?? undefined,
          updated: (x as any).updated_at || (x as any).created_at || "",
        }));

        setUsers(rows);
        lastAppliedSeq.current = seq;
      } catch (e) {
        // Keep previous users on error; show error banner only
        const msg = e instanceof Error ? e.message : "Failed to load users";
        setErrorText(msg);
      } finally {
        setLoading(false);
        setHasFetchedOnce(true);
      }
    },
    [adminWallet, adminReady, hasFetchedOnce]
  );

  // Debounced auto-search (runs only after adminReady)
  useEffect(() => {
    if (!adminReady) return;
    fetchData(debouncedQ);
  }, [debouncedQ, adminReady, fetchData]);

  // Manual "Enter" immediate search handler
  const onKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setSearchNonce((n) => n + 1);
    }
  };

  // React to Enter-triggered manual search (immediate)
  useEffect(() => {
    if (!adminReady) return;
    if (searchNonce > 0) fetchData(query, { immediate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchNonce, adminReady]);

  /** Totals */
  const totals = useMemo(() => {
    return users.reduce(
      (acc, u) => {
        acc.rmCredit += u.rmCredit;
        acc.rmSpent += u.rmSpent;
        acc.oumgPurchased += u.oumgPurchased;
        return acc;
      },
      { rmCredit: 0, rmSpent: 0, oumgPurchased: 0 }
    );
  }, [users]);

  /** Preferred purchase price order, with fallback */
  const currentUserBuyPrice =
    price?.user_buy_myr_per_g ??
    price?.buy_myr_per_g ??
    price?.price_myr_per_g ??
    FALLBACK_PRICE_MYR_PER_G;

  /** Helpers */
  const fmt2 = (n: number) => Number(n || 0).toFixed(2);

  const fmtg = (n: number | null | undefined): string => {
    if (n === 0 || n === null || n === undefined) return "0";
    if (Number.isInteger(n)) return n.toFixed(2);
    return Number(n).toFixed(6);
  };

  /** Refresh list - for modal success callbacks (keeps current query) */
  async function refreshList() {
    await fetchData(debouncedQ, { immediate: true });
  }

  /** Openers */
  function openAddUser() {
    setAddOpen(true);
  }
  function openCredit(row: Row) {
    setSelected(row);
    setCreditOpen(true);
  }
  function openMint(row: Row) {
    setSelected(row);
    setMintOpen(true);
  }

  // Already server-filtered by q
  const filtered = users;

  // Decide empty-state visibility:
  const showEmpty =
    !loading && hasFetchedOnce && adminReady && filtered.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Users
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage whitelisted users, preload RM credits, and mint OUMG
            (connected to backend).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search box with clear + Enter immediate search */}
          <div className="hidden sm:block">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDownSearch}
                placeholder="Search by address…"
                className="h-10 w-[300px] rounded-lg border border-gray-200 bg-transparent pl-9 pr-8 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              />
              {/* Search icon (left) */}
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.9 14.32a8 8 0 1 1 1.414-1.414l3.387 3.387a1 1 0 0 1-1.414 1.414l-3.387-3.387ZM14 8a6 6 0 1 0-12 0 6 6 0 0 0 12 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              {/* Clear button (right) */}
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearchNonce((n) => n + 1); // immediate reload unfiltered
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Clear search"
                  title="Clear"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <button
            onClick={openAddUser}
            disabled={!adminWallet}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
          >
            Add User
          </button>
        </div>
      </div>

      {/* Page-level error banner */}
      {errorText && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {errorText}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-6 py-3">Address</th>
              <th className="px-6 py-3">RM Credit (MYR)</th>
              <th className="px-6 py-3">RM Spent (MYR)</th>
              <th className="px-6 py-3">OUMG Purchased (g)</th>
              {/* <th className="px-6 py-3">Note</th> */}
              <th className="px-6 py-3">Updated</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  colSpan={7}
                >
                  Loading…
                </td>
              </tr>
            ) : showEmpty ? (
              <tr>
                <td
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  colSpan={7}
                >
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id ?? u.address}
                  className="border-b border-gray-200 dark:border-gray-800"
                >
                  <td className="px-6 py-4 text-gray-900 dark:text-white">
                    <AddressDisplay address={u.address} />
                  </td>
                  <td className="px-6 py-4">RM {fmt2(u.rmCredit)}</td>
                  <td className="px-6 py-4">RM {fmt2(u.rmSpent)}</td>
                  <td className="px-6 py-4">{fmtg(u.oumgPurchased)}</td>
                  {/* <td className="px-6 py-4">{u.note || "—"}</td> */}
                  <td className="px-6 py-4">
                    {u.updated ? new Date(u.updated).toLocaleString() : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openCredit(u)}
                        disabled={!adminWallet}
                        className="text-sm inline-flex items-center rounded-lg border border-blue-300 bg-blue-500/10 px-3 py-1.5 font-semibold text-blue-700 shadow-theme-xs hover:bg-blue-500/15 disabled:opacity-60 dark:border-blue-800 dark:text-blue-400"
                      >
                        Credit RM
                      </button>
                      <button
                        onClick={() => openMint(u)}
                        disabled={!adminWallet}
                        className="text-sm inline-flex items-center rounded-lg border border-green-300 bg-green-500/10 px-3 py-1.5 font-semibold text-green-700 shadow-theme-xs hover:bg-green-500/15 disabled:opacity-60 dark:border-green-800 dark:text-green-400"
                      >
                        Mint OUMG
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}

            {/* Totals row */}
            {!loading && !showEmpty && (
              <tr className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
                <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                  Totals
                </td>
                <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                  RM {fmt2(totals.rmCredit)}
                </td>
                <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                  RM {fmt2(totals.rmSpent)}
                </td>
                <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                  {fmtg(totals.oumgPurchased)}
                </td>
                <td className="px-6 py-4">—</td>
                <td className="px-6 py-4">—</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={refreshList}
      />

      {selected && (
        <CreditModal
          open={creditOpen}
          onClose={() => {
            setCreditOpen(false);
            setSelected(null);
          }}
          target={{ address: selected.address, currentCredit: Number(selected.rmCredit || 0) }}
          onSuccess={refreshList}
        />
      )}

      {selected && (
        <MintModal
          open={mintOpen}
          onClose={() => {
            setMintOpen(false);
            setSelected(null);
          }}
          target={{ address: selected.address, currentCredit: Number(selected.rmCredit || 0) }}
          unitPriceMyrPerG={Number(currentUserBuyPrice) || FALLBACK_PRICE_MYR_PER_G}
          onSuccess={refreshList}
        />
      )}
    </div>
  );
}