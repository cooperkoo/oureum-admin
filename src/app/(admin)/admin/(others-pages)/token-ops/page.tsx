/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  getContractStatus,
  pauseContract,
  resumeContract,
  getTokenOpsLogs,
  type TokenOpsStatus,
  type TokenOpsAction,
} from "@/lib/apiTokenOps";

const PAGE_SIZE = 20;

/** Shorten Ethereum address for UI */
function shortenAddress(addr: string) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

/** Read admin wallet from localStorage (client-side only) */
function getAdminWalletLocal(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ou_admin_session_v1");
    if (raw) {
      const parsed = JSON.parse(raw) as { wallet?: string; isAdmin?: boolean };
      const w = (parsed?.wallet || "").toLowerCase();
      return /^0x[a-f0-9]{40}$/.test(w) ? w : null;
    }
  } catch {
    /* ignore */
  }
  const legacy = (localStorage.getItem("admin_wallet") || "").toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(legacy) ? legacy : null;
}

/** For "Type" column: audits.type or infer MINT_BURN for token_ops rows */
function getType(row: any): string {
  if (row?.type) return String(row.type);
  if (row?.op_type && (row?.wallet_address || row?.grams != null)) return "MINT_BURN";
  return "TOKEN_OPS";
}

/** For "Action" column: audits.action or token_ops.op_type */
function getAction(row: any): string {
  const a = row?.action ?? row?.op_type ?? "";
  return String(a).toUpperCase();
}

/** For "Operator" column: audits.operator / legacy admin_wallet / token_ops.wallet_address */
function getOperator(row: any): string {
  return row?.operator ?? row?.admin_wallet ?? row?.wallet_address ?? "";
}

/** For "Timestamp" column */
function getCreatedAt(row: any): string {
  return row?.created_at ?? row?.createdAt ?? "";
}

/** Details: prefer audits.detail; else fallback to token_ops fields */
function formatDetails(row: any): string {
  // audits.detail (jsonb or string)
  if (row?.detail != null) {
    if (typeof row.detail === "string") return row.detail;
    try {
      const d = row.detail as Record<string, any>;
      const parts: string[] = [];
      if (d.source) parts.push(String(d.source));
      if (d.grams != null) parts.push(`grams=${d.grams}`);
      if (d.unit_price_myr_per_g != null) parts.push(`price=${d.unit_price_myr_per_g}`);
      if (d.tx_hash) parts.push(`tx=${String(d.tx_hash).slice(0, 10)}…`);
      if (d.note) parts.push(`note=${d.note}`);
      return parts.length ? parts.join(" · ") : JSON.stringify(d);
    } catch {
      return String(row.detail);
    }
  }

  // token_ops raw fields fallback
  const parts: string[] = [];
  if (row?.grams != null) parts.push(`grams=${row.grams}`);
  if (row?.tx_hash) parts.push(`tx=${String(row.tx_hash).slice(0, 10)}…`);
  if (row?.note) parts.push(`note=${row.note}`);
  return parts.join(" · ") || "";
}

export default function TokenOpsPage() {
  // Session/admin
  const [adminWallet, setAdminWallet] = useState<string | null>(null);

  // Contract status
  const [statusLoading, setStatusLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [actionLoading, setActionLoading] = useState<"pause" | "resume" | null>(null);

  // Logs + pagination
  const [logsLoading, setLogsLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(0); // 0-based
  const [hasNext, setHasNext] = useState(false);

  // Error banner
  const [errorText, setErrorText] = useState<string | null>(null);

  // bootstrap admin wallet
  useEffect(() => {
    setAdminWallet(getAdminWalletLocal());
  }, []);

  // Fetch contract status
  useEffect(() => {
    let alive = true;
    (async () => {
      setStatusLoading(true);
      try {
        const st: TokenOpsStatus = await getContractStatus();
        if (!alive) return;
        setIsPaused(Boolean(st.paused));
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Failed to fetch status";
        setErrorText(msg);
      } finally {
        if (alive) setStatusLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Fetch logs for current page
  useEffect(() => {
    let alive = true;
    (async () => {
      setLogsLoading(true);
      setErrorText(null);
      try {
        const offset = page * PAGE_SIZE;
        // Do NOT pass action filter here, we want both TOKEN_OPS and MINT_BURN back.
        const res = await getTokenOpsLogs({ limit: PAGE_SIZE, offset });
        if (!alive) return;
        const data = (res as any)?.data ?? [];
        setLogs(data);
        setHasNext(data.length === PAGE_SIZE); // naive next-page guard when API has no total
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Failed to load logs";
        setErrorText(msg);
        setLogs([]);
        setHasNext(false);
      } finally {
        if (alive) setLogsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page]);

  // Pause/Resume handler
  async function handleTogglePause() {
    if (!adminWallet) {
      alert("Please connect an admin wallet first.");
      return;
    }
    setErrorText(null);
    const goingToPause = !isPaused;
    setActionLoading(goingToPause ? "pause" : "resume");
    try {
      const action: TokenOpsAction = isPaused ? await resumeContract() : await pauseContract();
      setIsPaused(action.action === "pause");
      // refresh current page logs after action
      const res = await getTokenOpsLogs({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      setLogs((res as any)?.data || []);
      setHasNext(((res as any)?.data || []).length === PAGE_SIZE);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pause/Resume request failed";
      setErrorText(msg);
    } finally {
      setActionLoading(null);
    }
  }

  // Pagination controls
  function goPrev() {
    if (page > 0) setPage((p) => p - 1);
  }
  function goNext() {
    if (hasNext) setPage((p) => p + 1);
  }

  const actionBtnLabel = statusLoading
    ? "Loading…"
    : isPaused
    ? actionLoading === "resume"
      ? "Resuming…"
      : "Resume"
    : actionLoading === "pause"
    ? "Pausing…"
    : "Pause";

  const isBtnDisabled = statusLoading || actionLoading !== null;

  const actionBtnStyle = isPaused
    ? "border border-green-300 bg-green-500/10 text-green-700 hover:bg-green-500/15 disabled:opacity-60 dark:border-green-800 dark:text-green-400"
    : "border border-red-300 bg-red-500/10 text-red-700 hover:bg-red-500/15 disabled:opacity-60 dark:border-red-800 dark:text-red-400";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Token Ops
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage contract state and view operation logs (includes pause/resume and mint/burn).
          </p>
        </div>
      </div>

      {/* Error banner */}
      {errorText && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {errorText}
        </div>
      )}

      {/* Status card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Contract Status</div>
            <div className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-100">
              {statusLoading ? "Loading…" : isPaused ? "Paused" : "Active"}
            </div>
          </div>

          <button
            onClick={handleTogglePause}
            disabled={isBtnDisabled}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium shadow-theme-xs ${actionBtnStyle}`}
          >
            {actionLoading && (
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  opacity="0.25"
                />
                <path
                  d="M22 12a10 10 0 0 1-10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {actionBtnLabel}
          </button>
        </div>
      </div>

      {/* Logs table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Recent Token Ops
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Showing mixed records from contract operations (PAUSE/RESUME) and mint/burn events.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Operator</th>
                <th className="px-6 py-3">Details</th>
                <th className="px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No logs yet.
                  </td>
                </tr>
              ) : (
                logs.map((row: any, idx: number) => {
                  const id = row?.id != null ? String(row.id) : `row-${idx}`;
                  const type = getType(row);
                  const action = getAction(row);
                  const operator = getOperator(row);
                  const details = formatDetails(row);
                  const createdAt = getCreatedAt(row);

                  return (
                    <tr key={id} className="border-b border-gray-200 dark:border-gray-800">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{type}</td>
                      <td className="px-6 py-4">{action}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span>{shortenAddress(operator)}</span>
                          {!!operator && (
                            <button
                              onClick={() => navigator.clipboard.writeText(operator)}
                              className="text-xs text-blue-500 hover:underline"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{details || "—"}</td>
                      <td className="px-6 py-4" suppressHydrationWarning>
                        {createdAt ? new Date(createdAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-5">
          <button
            onClick={goPrev}
            disabled={logsLoading || page === 0}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
          >
            Previous
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Page {page + 1}
          </div>
          <button
            onClick={goNext}
            disabled={logsLoading || !hasNext}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}