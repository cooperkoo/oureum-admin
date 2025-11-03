"use client";

import React, { useMemo, useState } from "react";
import {
  getAdminWallet,
  connectMetaMaskAsAdmin,
  getPriceSnapshot,
  manualPriceUpdate,
  getPausedStatus,
  pauseContract,
  unpauseContract,
  listUsers,
  listAudits,
  fundPreset,
  buyMint,
  sellBurn,
  listGoldLedger,
  createGoldLedger,
  listRedemptions,
  updateRedemption,
  type RedemptionStatus,
} from "@/lib/api";
import type { Address } from "@/lib/api";

import { REDEMPTION_STATUS, type Redemption } from "@/lib/api";

/**
 * Dev Page: quick admin actions and API probes.
 * - Use this page to validate backend endpoints end-to-end.
 * - All admin operations include x-admin-wallet if present.
 */

export default function DevPage() {
  const [log, setLog] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const hasAdmin = useMemo(() => !!getAdminWallet(), []);

  function append(obj: unknown) {
    setLog((prev) => `${prev}\n${JSON.stringify(obj, null, 2)}`);
  }

  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    try {
      const out = await fn();
      append(out as unknown);
    } catch (e) {
      append({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  // Form states
  const [wallet, setWallet] = useState("");
  const [myr, setMyr] = useState<number>(100);
  const [grams, setGrams] = useState<number>(1);
  const [priceBuy, setPriceBuy] = useState<number>(0);

  const [ledgerDate, setLedgerDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [ledgerSource, setLedgerSource] = useState<string>("Test Supplier");
  const [ledgerBatch, setLedgerBatch] = useState<string>("BATCH-001");
  const [ledgerPurity, setLedgerPurity] = useState<string>("999.9");
  const [ledgerGrams, setLedgerGrams] = useState<number>(100);

  const [redemptionId, setRedemptionId] = useState<string>("");
  const [redemptionStatus, setRedemptionStatus] = useState<RedemptionStatus>("APPROVED");

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-xl font-semibold">Dev Tools</h1>
      <p className="text-sm text-gray-500">Quick admin API probes. Wallet: {hasAdmin ? getAdminWallet() : "—"}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Admin Wallet */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Admin Wallet</h2>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-white/5"
              disabled={busy}
              onClick={() => run(connectMetaMaskAsAdmin)}
            >
              Connect MetaMask as Admin
            </button>
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Pricing</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => run(getPriceSnapshot)}>
              GET /api/price/current
            </button>
            <input
              type="number"
              className="w-28 rounded border bg-transparent p-1 text-sm"
              placeholder="myrPerG_buy"
              value={priceBuy}
              onChange={(e) => setPriceBuy(Number(e.target.value))}
            />
            <button
              className="rounded-lg border px-3 py-1 text-sm"
              disabled={busy}
              onClick={() => run(() => manualPriceUpdate({ myrPerG_buy: priceBuy }))}
            >
              POST /api/price/manual-update
            </button>
          </div>
        </div>

        {/* Pause/Unpause */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Pause / Unpause</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => run(getPausedStatus)}>
              GET /api/chain/paused
            </button>
            <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => run(pauseContract)}>
              POST /api/chain/pause
            </button>
            <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => run(unpauseContract)}>
              POST /api/chain/unpause
            </button>
          </div>
        </div>

        {/* Users / Audits */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Users & Audits</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => run(() => listUsers({ limit: 50 }))}>
              GET /api/admin/users
            </button>
            <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => run(() => listAudits({ limit: 20 }))}>
              GET /api/admin/audits
            </button>
          </div>
        </div>

        {/* Credit Preset */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Fund Preset (Credit)</h2>
          <div className="mt-2 flex flex-col gap-2">
            <input
              type="text"
              className="rounded border bg-transparent p-1 text-sm"
              placeholder="0x..."
              value={wallet}
              onChange={(e) => setWallet(e.target.value.trim())}
            />
            <input
              type="number"
              className="rounded border bg-transparent p-1 text-sm"
              placeholder="amount MYR"
              value={myr}
              onChange={(e) => setMyr(Number(e.target.value))}
            />
            <button
              className="rounded-lg border px-3 py-1 text-sm"
              disabled={busy}
              onClick={() => run(() => fundPreset(wallet as Address, myr))}
            >
              POST /api/admin/fund-preset
            </button>
          </div>
        </div>

        {/* Token Ops */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Token Ops (buy→mint / sell→burn)</h2>
          <div className="mt-2 flex flex-col gap-2">
            <input
              type="text"
              className="rounded border bg-transparent p-1 text-sm"
              placeholder="0x..."
              value={wallet}
              onChange={(e) => setWallet(e.target.value.trim())}
            />
            <input
              type="number"
              className="rounded border bg-transparent p-1 text-sm"
              placeholder="grams"
              value={grams}
              onChange={(e) => setGrams(Number(e.target.value))}
            />
            <div className="flex gap-2">
              <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => run(() => buyMint(wallet as Address, grams))}>
                POST /api/token/buy-mint
              </button>
              <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => run(() => sellBurn(wallet as Address, grams))}>
                POST /api/token/sell-burn
              </button>
            </div>
          </div>
        </div>

        {/* Ledger */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Gold Ledger</h2>
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <input type="date" className="rounded border bg-transparent p-1 text-sm" value={ledgerDate} onChange={(e) => setLedgerDate(e.target.value)} />
              <input type="text" className="rounded border bg-transparent p-1 text-sm" placeholder="source" value={ledgerSource} onChange={(e) => setLedgerSource(e.target.value)} />
              <input type="text" className="rounded border bg-transparent p-1 text-sm" placeholder="batch" value={ledgerBatch} onChange={(e) => setLedgerBatch(e.target.value)} />
              <input type="text" className="rounded border bg-transparent p-1 text-sm" placeholder="purity" value={ledgerPurity} onChange={(e) => setLedgerPurity(e.target.value)} />
              <input type="number" className="rounded border bg-transparent p-1 text-sm" placeholder="grams" value={ledgerGrams} onChange={(e) => setLedgerGrams(Number(e.target.value))} />
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => run(listGoldLedger)}>
                GET /api/ledger/gold
              </button>
              <button
                className="rounded-lg border px-3 py-1 text-sm"
                disabled={busy}
                onClick={() =>
                  run(() =>
                    createGoldLedger({
                      date: ledgerDate,
                      source: ledgerSource,
                      batch: ledgerBatch,
                      purity: ledgerPurity,
                      grams: ledgerGrams,
                    })
                  )
                }
              >
                POST /api/ledger/gold
              </button>
            </div>
          </div>
        </div>

        {/* Redemptions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold">Redemptions</h2>
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex gap-2">
              <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => run(() => listRedemptions({ status: REDEMPTION_STATUS.PENDING, limit: 50 }))}>
                GET /api/redemption?status=SUBMITTED
              </button>
              <button className="rounded-lg border px-3 py-1 text-sm" disabled={busy} onClick={() => run(() => listRedemptions({ limit: 50 }))}>
                GET /api/redemption (all)
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                className="rounded border bg-transparent p-1 text-sm"
                placeholder="redemption id"
                value={redemptionId}
                onChange={(e) => setRedemptionId(e.target.value.trim())}
              />
              <select
                className="rounded border bg-transparent p-1 text-sm"
                value={redemptionStatus}
                onChange={(e) => setRedemptionStatus(e.target.value as RedemptionStatus)}
              >
                <option value="APPROVED">APPROVED</option>
                <option value="FULFILLED">FULFILLED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <button
                className="rounded-lg border px-3 py-1 text-sm"
                disabled={busy || !redemptionId}
                onClick={() => run(() => updateRedemption(redemptionId, { status: redemptionStatus }))}
              >
                PATCH /api/redemption/:id
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Console */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold">Console</h2>
        <pre className="mt-3 max-h-96 overflow-auto rounded bg-black/80 p-3 text-xs text-emerald-200">
{log || "// output will appear here"}
        </pre>
      </div>
    </div>
  );
}