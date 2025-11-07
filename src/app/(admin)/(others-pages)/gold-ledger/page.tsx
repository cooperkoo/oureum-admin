/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  listGoldLedger,
  type GoldLedgerEntry,
} from "@/lib/apiGoldLedger";
import NewGoldEntry from "./Modals/NewGoldEntry";

function fmtNum(n: number | null | undefined, decimals = 6) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toFixed(decimals);
}

export default function GoldLedgerPage() {
  const [entries, setEntries] = useState<GoldLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // modal + toast
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorText(null);
    try {
      const data = await listGoldLedger({ limit: 200 });
      setEntries(data || []);
    } catch (e: any) {
      setErrorText(e?.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const totalG = entries.reduce((sum, e) => sum + (Number(e.intake_g) || 0), 0);
    const avgPurity =
      entries.length > 0
        ? entries.reduce((sum, e) => sum + (Number(e.purity_bp) || 0), 0) / entries.length / 100
        : 0;
    return { totalG, avgPurity, count: entries.length };
  }, [entries]);

  function openModal() {
    setIsModalOpen(true);
  }
  function closeModal() {
    setIsModalOpen(false);
  }

  async function handleModalSuccess() {
    await load();
    setToast("Gold entry created.");
    setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Gold Ledger</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track physical gold intakes with purity and source details. Used to reconcile OUMG mint/burn.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openModal}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
          >
            Add Entry
          </button>
          <button
            onClick={() => load()}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorText && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {errorText}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Gold (g)</p>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {fmtNum(stats.totalG)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Average Purity (%)</p>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {fmtNum(stats.avgPurity, 2)}%
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Entries</p>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            {stats.count}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ledger Entries</h2>
        </div>

        <table className="min-w-full text-left text-sm text-gray-700 dark:text-gray-300">
          <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Intake (g)</th>
              <th className="px-5 py-3">Purity (bp)</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Serial</th>
              <th className="px-5 py-3">Batch</th>
              <th className="px-5 py-3">Storage</th>
              <th className="px-5 py-3">Custody</th>
              <th className="px-5 py-3">Insurance</th>
              <th className="px-5 py-3">Audit Ref</th>
              <th className="px-5 py-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-5 py-8 text-center text-gray-400">Loading…</td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-5 py-8 text-center text-gray-400">No records found.</td>
              </tr>
            ) : (
              entries.map((e, idx) => {
                const key = (e as any).id ?? `${e.entry_date}-${idx}`;
                return (
                  <tr key={key} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-5 py-3" suppressHydrationWarning>
                      {e.entry_date ? new Date(e.entry_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3">{fmtNum(e.intake_g)}</td>
                    <td className="px-5 py-3">{e.purity_bp ?? "—"}</td>
                    <td className="px-5 py-3">{e.source || "—"}</td>
                    <td className="px-5 py-3">{e.serial || "—"}</td>
                    <td className="px-5 py-3">{e.batch || "—"}</td>
                    <td className="px-5 py-3">{e.storage || "—"}</td>
                    <td className="px-5 py-3">{e.custody || "—"}</td>
                    <td className="px-5 py-3">{e.insurance || "—"}</td>
                    <td className="px-5 py-3">{e.audit_ref || "—"}</td>
                    <td className="px-5 py-3">{e.note || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-theme-lg dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          {toast}
        </div>
      )}

      {/* Modal */}
      <NewGoldEntry
        open={isModalOpen}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}