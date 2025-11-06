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

/** Format "details" column from various possible backend shapes */
function formatDetails(row: any): string {
  // New audits shape: detail (jsonb)
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
      if (parts.length) return parts.join(" · ");
      return JSON.stringify(d);
    } catch {
      return String(row.detail);
    }
  }

  // Legacy token_ops_audit shape: tx_hash + note
  const legacyParts: string[] = [];
  if (row?.tx_hash) legacyParts.push(`tx=${String(row.tx_hash).slice(0, 10)}…`);
  if (row?.note) legacyParts.push(`note=${row.note}`);
  if (legacyParts.length) return legacyParts.join(" · ");

  return "";
}

/** For "Type" column: prefer row.type else fallback to TOKEN_OPS */
function getType(row: any): string {
  return row?.type ? String(row.type) : "TOKEN_OPS";
}

/** For "Action" column: prefer row.action, uppercase */
function getAction(row: any): string {
  return row?.action ? String(row.action).toUpperCase() : "";
}

/** For "Operator" column: audits.operator or legacy admin_wallet */
function getOperator(row: any): string {
  return row?.operator ?? row?.admin_wallet ?? "";
}

/** For "Timestamp" column */
function getCreatedAt(row: any): string {
  return row?.created_at ?? row?.createdAt ?? "";
}

export default function TokenOpsPage() {
  // Session/admin
  const [mounted, setMounted] = useState(false);
  const [adminWallet, setAdminWallet] = useState<string | null>(null);

  // Contract status
  const [statusLoading, setStatusLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Button loading state
  const [actionLoading, setActionLoading] = useState<"pause" | "resume" | null>(null);

  // Logs
  const [logsLoading, setLogsLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]); // accept both audits/legacy shapes

  // Error banner
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
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

  // Refresh logs (for initial load and after actions)
  async function refreshLogs() {
    setLogsLoading(true);
    try {
      const res = await getTokenOpsLogs({ limit: 100, offset: 0 });
      setLogs((res as any)?.data || []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load logs";
      setErrorText(msg);
    } finally {
      setLogsLoading(false);
    }
  }

  // Initial logs load
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await refreshLogs();
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Filter to TOKEN_OPS only if backend returns mixed types
  const tokenOpsLogs = useMemo(() => {
    return (logs || []).filter((row) => getType(row) === "TOKEN_OPS");
  }, [logs]);

  async function handleTogglePause() {
    if (!adminWallet) {
      alert("Please connect an admin wallet first.");
      return;
    }
    setErrorText(null);
    const goingToPause = !isPaused;
    setActionLoading(goingToPause ? "pause" : "resume");

    try {
      const action: TokenOpsAction = isPaused
        ? await resumeContract()
        : await pauseContract();

      // Update status from action result
      setIsPaused(action.action === "pause");

      // IMPORTANT: do NOT append a fake row; re-fetch from DB to get real id
      await refreshLogs();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pause/Resume request failed";
      setErrorText(msg);
    } finally {
      setActionLoading(null);
    }
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
            Manage contract state and view operation logs.
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

      {/* Logs table: Type / Action / Operator / Details / Timestamp */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Recent Token Ops
          </h2>
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
              ) : tokenOpsLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    No logs yet.
                  </td>
                </tr>
              ) : (
                tokenOpsLogs.map((row: any, idx: number) => {
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
      </div>
    </div>
  );
}