"use client";

import React, { useMemo, useState } from "react";


type UserRow = {
  address: string;
  rmCredit: number;
  rmSpent: number;
  oumgPurchased: number; // grams
  updated: string;
};

type Activity = {
  id: string;
  type: "Pricing" | "Credit" | "Purchase" | "Pause" | "Resume" | "Mint" | "Burn";
  detail: string;
  when: string;
};

const PRICE_MYR_PER_G = 500; // align with Pricing demo

export default function Dashboard() {
  // ===== Demo data (align with Users / Token Ops / Pricing) =====
  const [isPaused] = useState(false);
  const [currentSheetId] = useState("PRC-TBD");
  const [currentPrice] = useState(PRICE_MYR_PER_G);
  const [users] = useState<UserRow[]>([
    {
      address: "0x0bf3E5F98d659BCe08C3aeD0AD5F373Ba1cEb24f",
      rmCredit: 5000,
      rmSpent: 1500,
      oumgPurchased: 3,
      updated: "2025-09-20 11:05",
    },
    {
      address: "0xAbc…789",
      rmCredit: 1200,
      rmSpent: 0,
      oumgPurchased: 0,
      updated: "2025-09-19 16:42",
    },
    {
      address: "0xDef…456",
      rmCredit: 800,
      rmSpent: 1000,
      oumgPurchased: 2,
      updated: "2025-09-18 10:20",
    },
  ]);
  const [activity] = useState<Activity[]>([
    { id: "A-1006", type: "Purchase", detail: "0x0bf3…b24f bought 1g OUMG (RM 500)", when: "2025-09-20 14:10" },
    { id: "A-1005", type: "Credit",   detail: "Credited RM 1,000 to 0xAbc…789",   when: "2025-09-20 13:55" },
    { id: "A-1004", type: "Pricing",  detail: "Pricing updated to RM 500 / g (PRC-TBD)", when: "2025-09-20 09:00" },
    { id: "A-1003", type: "Resume",   detail: "Token resumed by 0xAdmin…789",    when: "2025-09-19 18:22" },
    { id: "A-1002", type: "Pause",    detail: "Token paused by 0xAdmin…789",     when: "2025-09-19 18:10" },
  ]);
  // ===============================================================

  // Totals
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

  // Top buyers (by OUMG)
  const topBuyers = useMemo(
    () =>
      [...users]
        .sort((a, b) => b.oumgPurchased - a.oumgPurchased)
        .slice(0, 5),
    [users]
  );

  const pill = (t: Activity["type"]) => {
    switch (t) {
      case "Purchase":
      case "Mint":
        return "border-green-300 bg-green-500/10 text-green-700 dark:border-green-800 dark:text-green-400";
      case "Credit":
        return "border-blue-300 bg-blue-500/10 text-blue-700 dark:border-blue-800 dark:text-blue-400";
      case "Burn":
        return "border-red-300 bg-red-500/10 text-red-700 dark:border-red-800 dark:text-red-400";
      case "Pause":
        return "border-yellow-300 bg-yellow-500/10 text-yellow-700 dark:border-yellow-800 dark:text-yellow-400";
      case "Resume":
        return "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400";
      default:
        return "border-gray-300 bg-gray-500/10 text-gray-700 dark:border-gray-700 dark:text-gray-300";
    }
  };

  // Simple sparkline (no external lib) -> returns width % based on ratio
  const ratio = (num: number, max: number) => (max <= 0 ? 0 : Math.min(100, Math.round((num / max) * 100)));
  const maxSpent = Math.max(...users.map(u => u.rmSpent), 1);
  const maxOumg = Math.max(...users.map(u => u.oumgPurchased), 1);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            High-level overview of pricing, credits, and purchases.
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Sheet: <span className="font-medium text-gray-700 dark:text-gray-300">{currentSheetId}</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Current Price */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Current Price (MYR / g)</div>
          <div className="mt-2 flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">RM {currentPrice}</div>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${isPaused ? "border-red-300 bg-red-500/10 text-red-700 dark:border-red-800 dark:text-red-400" : "border-green-300 bg-green-500/10 text-green-700 dark:border-green-800 dark:text-green-400"}`}>
              {isPaused ? "Paused" : "Active"}
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">Sheet ID: {currentSheetId}</div>
        </div>

        {/* Total RM Credit */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total RM Credit</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">RM {totals.rmCredit}</div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
            <div className="h-2 rounded-full bg-brand-500/70" style={{ width: `${ratio(totals.rmCredit, totals.rmCredit + totals.rmSpent)}%` }} />
          </div>
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">Credit vs. Spent</div>
        </div>

        {/* Total RM Spent */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total RM Spent</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">RM {totals.rmSpent}</div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
            <div className="h-2 rounded-full bg-blue-500/70" style={{ width: `${ratio(totals.rmSpent, totals.rmCredit + totals.rmSpent)}%` }} />
          </div>
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">Spent vs. Credit</div>
        </div>

        {/* Total OUMG Purchased */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total OUMG Purchased</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{totals.oumgPurchased} g</div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
            <div className="h-2 rounded-full bg-emerald-500/70" style={{ width: `${ratio(totals.oumgPurchased, totals.oumgPurchased + 1)}%` }} />
          </div>
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">Cumulative grams</div>
        </div>
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
                {topBuyers.map((u) => (
                  <tr key={u.address} className="border-b border-gray-200 dark:border-gray-800">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{u.address}</td>
                    <td className="px-6 py-4">{u.oumgPurchased}</td>
                    <td className="px-6 py-4">RM {u.rmSpent}</td>
                    <td className="px-6 py-4">
                      {/* simple proportional bar */}
                      <div className="h-2 w-40 rounded-full bg-gray-100 dark:bg-white/5">
                        <div className="h-2 rounded-full bg-emerald-500/70" style={{ width: `${ratio(u.oumgPurchased, maxOumg)}%` }} />
                      </div>
                    </td>
                    <td className="px-6 py-4">{u.updated}</td>
                  </tr>
                ))}
                {topBuyers.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={5}>
                      No buyers yet.
                    </td>
                  </tr>
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
          <ul className="space-y-3">
            {activity.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <span className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${pill(a.type)}`}>
                  {a.type}
                </span>
                <div className="flex-1">
                  <div className="text-sm text-gray-800 dark:text-gray-200">{a.detail}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{a.when}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom: Credit vs Spent by Address */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Credit vs. Spent by Address</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Quick visual comparison per address.
          </p>
        </div>
        <div className="space-y-4">
          {users.map((u) => {
            const total = u.rmCredit + u.rmSpent || 1;
            const wSpent = Math.round((u.rmSpent / total) * 100);
            const wCredit = 100 - wSpent;
            return (
              <div key={u.address}>
                <div className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">{u.address}</div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                  <div className="h-3 bg-blue-500/70" style={{ width: `${wSpent}%` }} title={`Spent: RM ${u.rmSpent}`} />
                  <div className="h-3 bg-brand-500/70" style={{ width: `${wCredit}%` }} title={`Credit: RM ${u.rmCredit}`} />
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Spent: RM {u.rmSpent} · Credit: RM {u.rmCredit}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}