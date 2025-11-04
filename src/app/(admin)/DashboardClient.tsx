/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(admin)/dashboard/DashboardClient.tsx
"use client";

import React from "react";
import {
  getAdminWallet,
  getPausedStatus,
  getPriceSnapshot,
  listUsers,
  listAudits,
  listRedemptions,
  type Activity,
  type PriceSnapshot,
  type UserWithBalances,
} from "@/lib/api";
import { REDEMPTION_STATUS, type Redemption } from "@/lib/api";

/**
 * Admin Dashboard (client-side, hydration-safe)
 * ---------------------------------------------------------
 * - Do not branch UI during SSR based on client-only states (localStorage, window).
 * - Read admin wallet after mount, then fetch admin endpoints.
 * - Any time-sensitive formatting (Date.toLocaleString) is rendered only after mount.
 */

type Summary = {
  rmCredit: number;
  rmSpent: number;
  oumgPurchased: number; // grams
};

function pct(num: number, den: number) {
  const d = den > 0 ? den : 1;
  return Math.max(0, Math.min(100, Math.round((num / d) * 100)));
}

export default function DashboardClient() {
  // Mount + admin wallet (read after mount to avoid SSR mismatch)
  const [mounted, setMounted] = React.useState(false);
  const [adminWallet, setAdminWallet] = React.useState<string | null>(null);
  const hasAdmin = !!adminWallet;

  // Public state
  const [price, setPrice] = React.useState<PriceSnapshot | null>(null);
  const [paused, setPaused] = React.useState<boolean>(false);

  // Admin state
  const [users, setUsers] = React.useState<UserWithBalances[]>([]);
  const [activity, setActivity] = React.useState<Activity[]>([]);
  const [pending, setPending] = React.useState<Redemption[]>([]);

  const [loadingPublic, setLoadingPublic] = React.useState(true);
  const [loadingAdmin, setLoadingAdmin] = React.useState(true);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  // Mark mounted and hydrate admin wallet from storage
  React.useEffect(() => {
    setMounted(true);
    try {
      const w = getAdminWallet(); // safe now (client only)
      setAdminWallet(w || null);
    } catch {
      setAdminWallet(null);
    }
  }, []);

  // Public data (no admin header)
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingPublic(true);
      try {
        const [p, pa] = await Promise.all([getPriceSnapshot(), getPausedStatus()]);
        if (!alive) return;
        setPrice(p);
        setPaused(Boolean(pa.paused));
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Failed to load public data";
        setErrorText(msg);
      } finally {
        if (alive) setLoadingPublic(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Admin data (requires x-admin-wallet) — run only after mount and when wallet exists
  React.useEffect(() => {
    if (!mounted || !hasAdmin) {
      // If not admin, ensure admin blocks show loading=false (to avoid infinite spinner)
      setLoadingAdmin(false);
      return;
    }
    let alive = true;
    (async () => {
      setLoadingAdmin(true);
      setErrorText(null);
      try {
        const [usersRes, auditsRes, pendingRes] = await Promise.all([
          listUsers({ limit: 200 }),
          listAudits({ limit: 20 }),
          listRedemptions({ status: REDEMPTION_STATUS.PENDING, limit: 100 }),
        ]);
        if (!alive) return;
        setUsers(usersRes.data || []);
        setActivity(auditsRes.data || []);
        setPending(pendingRes.data || []);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Failed to load admin data";
        setErrorText(msg);
      } finally {
        if (alive) setLoadingAdmin(false);
      }
    })();
    return () => { alive = false; };
  }, [mounted, hasAdmin]);

  // Derived UI data (safe to compute any time)
  const summary: Summary = React.useMemo(() => {
    return users.reduce<Summary>(
      (acc, u) => {
        acc.rmCredit += Number(u.rm_credit || 0);
        acc.rmSpent += Number(u.rm_spent || 0);
        acc.oumgPurchased += Number(u.oumg_grams || 0);
        return acc;
      },
      { rmCredit: 0, rmSpent: 0, oumgPurchased: 0 }
    );
  }, [users]);

  const topBuyers = React.useMemo(
    () => [...users].sort((a, b) => b.oumg_grams - a.oumg_grams).slice(0, 5),
    [users]
  );

  const currentPrice =
    price?.user_buy_myr_per_g ??
    price?.price_myr_per_g ??
    price?.buy_myr_per_g ??
    0;

  const creditPct = pct(summary.rmCredit, summary.rmCredit + summary.rmSpent);
  const spentPct = pct(summary.rmSpent, summary.rmCredit + summary.rmSpent);
  const maxOumg = Math.max(...topBuyers.map((b) => b.oumg_grams), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview of pricing, credits, token ops and recent activity.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Pending: {pending.length}</span>
          {/* Render the "connect admin" hint only after mount to avoid SSR mismatch */}
          <span
            suppressHydrationWarning
            className={!mounted || hasAdmin ? "invisible" : "text-amber-600 dark:text-amber-400"}
          >
            {!mounted ? " " : (!hasAdmin ? "Connect admin wallet to load admin data." : "")}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Current Price */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Current Price (MYR / g)</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loadingPublic ? "…" : `RM ${currentPrice || "—"}`}
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                paused
                  ? "border-red-300 bg-red-500/10 text-red-700 dark:border-red-800 dark:text-red-400"
                  : "border-green-300 bg-green-500/10 text-green-700 dark:border-green-800 dark:text-green-400"
              }`}
            >
              {paused ? "Paused" : "Active"}
            </span>
          </div>
          <div
            suppressHydrationWarning
            className="mt-3 text-xs text-gray-400 dark:text-gray-500"
          >
            {mounted
              ? (price?.updated_at ? new Date(price.updated_at).toLocaleString() : (loadingPublic ? "Loading…" : "—"))
              : " "}
          </div>
        </div>

        {/* Total RM Credit */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total RM Credit</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {loadingAdmin ? "…" : `RM ${summary.rmCredit}`}
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
            <div className="h-2 rounded-full bg-brand-500/70" style={{ width: `${creditPct}%` }} />
          </div>
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">Credit vs. Spent</div>
        </div>

        {/* Total RM Spent */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total RM Spent</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {loadingAdmin ? "…" : `RM ${summary.rmSpent}`}
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
            <div className="h-2 rounded-full bg-blue-500/70" style={{ width: `${spentPct}%` }} />
          </div>
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">Spent vs. Credit</div>
        </div>

        {/* Total OUMG Purchased */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total OUMG Purchased</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {loadingAdmin ? "…" : `${summary.oumgPurchased} g`}
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
            <div className="h-2 rounded-full bg-emerald-500/70" style={{ width: `${Math.min(100, summary.oumgPurchased)}%` }} />
          </div>
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">Cumulative grams</div>
        </div>

        {errorText && (
          <div className="xl:col-span-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {errorText}
          </div>
        )}
      </div>

      {/* Two-column: Top Buyers & Recent Activity */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-12">
        {/* Top Buyers */}
        <div className="xl:col-span-7 rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top Buyers</h2>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3">Address</th>
                  <th className="px-6 py-3">OUMG (g)</th>
                  <th className="px-6 py-3">RM Spent</th>
                  <th className="px-6 py-3">Sparkline</th>
                  <th className="px-6 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {loadingAdmin ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                      Loading…
                    </td>
                  </tr>
                ) : topBuyers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                      No buyers yet.
                    </td>
                  </tr>
                ) : (
                  topBuyers.map((u, idx) => (
                    <tr key={u.wallet || `buyer-${idx}`} className="border-b border-gray-200 dark:border-gray-800">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{u.wallet}</td>
                      <td className="px-6 py-4">{u.oumg_grams}</td>
                      <td className="px-6 py-4">RM {u.rm_spent}</td>
                      <td className="px-6 py-4">
                        <div className="h-2 w-40 rounded-full bg-gray-100 dark:bg-white/5">
                          <div
                            className="h-2 rounded-full bg-emerald-500/70"
                            style={{ width: `${pct(u.oumg_grams, maxOumg)}%` }}
                          />
                        </div>
                      </td>
                      <td
                        className="px-6 py-4"
                        suppressHydrationWarning
                      >
                        {mounted && u.updated_at ? new Date(u.updated_at).toLocaleString() : " "}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="xl:col-span-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Activity</h2>
          </div>
          {loadingAdmin ? (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading…</div>
          ) : (
            <ul className="space-y-3">
              {activity.slice(0, 8).map((a, idx) => {
                const key = a && (a as any).id != null ? String((a as any).id) : `${a?.type ?? "evt"}-${a?.createdAt ?? "t"}-${idx}`;
                return (
                  <li key={key} className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                    <span className="mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium border-gray-300 bg-gray-500/10 text-gray-700 dark:border-gray-700 dark:text-gray-300">
                      {a.type}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm text-gray-800 dark:text-gray-200">{a.detail || a.type}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400" suppressHydrationWarning>
                        {mounted && a.createdAt ? new Date(a.createdAt).toLocaleString() : " "}
                      </div>
                    </div>
                  </li>
                );
              })}
              {activity.length === 0 && (
                <li className="rounded-xl border border-gray-200 p-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  No activity yet.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}