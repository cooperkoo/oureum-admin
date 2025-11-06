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

type Summary = {
  rmCredit: number;
  rmSpent: number;
  oumgPurchased: number;
};

function pct(num: number, den: number) {
  const d = den > 0 ? den : 1;
  return Math.max(0, Math.min(100, Math.round((num / d) * 100)));
}

function shortenAddress(addr: string) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function formatRM(value: any) {
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
}

function formatGrams(value: any) {
  const num = Number(value);
  if (isNaN(num)) return "0";
  return parseFloat(num.toFixed(6));
}

export default function DashboardClient() {
  const [mounted, setMounted] = React.useState(false);
  const [adminWallet, setAdminWallet] = React.useState<string | null>(null);
  const hasAdmin = !!adminWallet;

  const [price, setPrice] = React.useState<PriceSnapshot | null>(null);
  const [paused, setPaused] = React.useState<boolean>(false);

  const [users, setUsers] = React.useState<UserWithBalances[]>([]);
  const [activity, setActivity] = React.useState<Activity[]>([]);
  const [pending, setPending] = React.useState<Redemption[]>([]);

  const [loadingPublic, setLoadingPublic] = React.useState(true);
  const [loadingAdmin, setLoadingAdmin] = React.useState(true);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
    try {
      const w = getAdminWallet();
      setAdminWallet(w || null);
    } catch {
      setAdminWallet(null);
    }
  }, []);

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
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (!mounted || !hasAdmin) {
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
    return () => {
      alive = false;
    };
  }, [mounted, hasAdmin]);

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

  function formatDetail(detail: any): string {
    if (!detail) return "";
    if (typeof detail === "string") return detail;
    try {
      const parts = [];
      if (detail.source) parts.push(String(detail.source).toUpperCase());
      if (detail.grams != null) parts.push(`grams=${detail.grams}`);
      if (detail.unit_price_myr_per_g != null)
        parts.push(`price=${detail.unit_price_myr_per_g}`);
      if (detail.tx_hash) parts.push(`tx=${String(detail.tx_hash).slice(0, 10)}…`);
      if (detail.note) parts.push(`note=${detail.note}`);
      return parts.join(" · ");
    } catch {
      return JSON.stringify(detail);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview of pricing, credits, token ops and recent activity.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Pending: {pending.length}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Current Price (MYR / g)
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loadingPublic ? "…" : `RM ${currentPrice || "—"}`}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total RM Credit
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {loadingAdmin ? "…" : `RM ${formatRM(summary.rmCredit)}`}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total RM Spent
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {loadingAdmin ? "…" : `RM ${formatRM(summary.rmSpent)}`}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total OUMG Purchased
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {loadingAdmin ? "…" : `${formatGrams(summary.oumgPurchased)} g`}
          </div>
        </div>
      </div>

      {/* Top Buyers */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Top Buyers
            </h2>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-3">Address</th>
                  <th className="px-6 py-3">OUMG (g)</th>
                  <th className="px-6 py-3">RM Credit</th>
                  <th className="px-6 py-3">RM Spent</th>
                </tr>
              </thead>
              <tbody>
                {loadingAdmin ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-gray-500" colSpan={4}>
                      Loading…
                    </td>
                  </tr>
                ) : (
                  topBuyers.map((u, idx) => (
                    <tr
                      key={u.wallet || `buyer-${idx}`}
                      className="border-b border-gray-200 dark:border-gray-800"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{shortenAddress(u.wallet)}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(u.wallet)}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            Copy
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">{formatGrams(u.oumg_grams)}</td>
                      <td className="px-6 py-4">RM {formatRM(u.rm_credit)}</td>
                      <td className="px-6 py-4">RM {formatRM(u.rm_spent)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="xl:col-span-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Recent Activity
          </h2>
          {loadingAdmin ? (
            <div className="p-4 text-sm text-gray-500">Loading…</div>
          ) : (
            <ul className="space-y-3">
              {activity.slice(0, 8).map((a, idx) => {
                const key =
                  a && (a as any).id != null
                    ? String((a as any).id)
                    : `${a?.type ?? "evt"}-${a?.createdAt ?? "t"}-${idx}`;
                return (
                  <li
                    key={key}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
                  >
                    <span className="mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium border-gray-300 bg-gray-500/10 text-gray-700 dark:border-gray-700 dark:text-gray-300">
                      {a.type}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm text-gray-800 dark:text-gray-200">
                        {formatDetail(a.detail) || a.type}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400" suppressHydrationWarning>
                        {mounted && a.createdAt
                          ? new Date(a.createdAt).toLocaleString()
                          : " "}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}