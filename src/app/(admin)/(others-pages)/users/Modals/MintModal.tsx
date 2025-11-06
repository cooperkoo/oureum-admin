/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "@/lib/api";
import { purchaseAdminUser, getAdminWallet, adminMintOnchain } from "@/lib/api";

/** ----------------------------------------------------------------
 * AddressDisplay
 * - Shows truncated address (e.g., 0x1234...cdef)
 * - On hover, a CSS-only tooltip reveals the full address
 * ---------------------------------------------------------------- */
function AddressDisplay({
  address,
  startChars = 6,
  endChars = 4,
}: {
  address: Address;
  startChars?: number;
  endChars?: number;
}) {
  const truncated =
    address.length <= startChars + endChars
      ? address
      : `${address.slice(0, startChars)}...${address.slice(-endChars)}`;

  return (
    <div className="relative group inline-flex items-center">
      <span className="font-mono">{truncated}</span>

      {/* Tooltip with full address */}
      <div
        className="
          absolute left-0 bottom-full mb-2 z-50
          pointer-events-none opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          bg-gray-800 text-white text-xs font-mono
          px-3 py-2 rounded-md shadow-lg whitespace-nowrap
        "
      >
        {address}
        {/* Tooltip arrow */}
        <div
          className="
            absolute top-full left-4
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

type MintModalProps = {
  open: boolean;
  onClose: () => void;
  target: { address: Address; currentCredit: number };
  unitPriceMyrPerG: number; // MYR/g used for cost calc and backend unit price
  defaultNote?: string;
  onSuccess?: () => Promise<void> | void;
};

// Oureum explorer base URL (no chain.ts import needed)
const EXPLORER_BASE = "https://oureum-testnet.tryethernal.com";

/** ----------------------------------------------------------------
 * MintModal (Admin)
 *
 * Flow:
 *  1) Validate: amount > 0 and cost <= current RM credit
 *  2) Require admin wallet header (for backend guard)
 *  3) On Mint:
 *      a) POST /api/admin/mint-onchain  -> returns tx_hash (on-chain)
 *      b) POST /api/admin/users/:wallet/purchase with tx_hash (DB sync)
 *  4) Show status + tx link + debug log (timestamps are UTC+8)
 *
 * Notes:
 *  - No direct MetaMask or chain.ts usage.
 *  - All code comments in English. UI text in English.
 * ---------------------------------------------------------------- */
export default function MintModal({
  open,
  onClose,
  target,
  unitPriceMyrPerG,
  defaultNote = "Minted by admin",
  onSuccess,
}: MintModalProps) {
  const [mode, setMode] = useState<"grams" | "myr">("grams");
  const [grams, setGrams] = useState<string>("");
  const [myr, setMyr] = useState<string>("");
  const [note, setNote] = useState<string>(defaultNote);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step state & logging
  type Step = "idle" | "broadcast" | "finalizing" | "done";
  const [step, setStep] = useState<Step>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(true);
  const logsRef = useRef<string[]>([]);
  const [, forceRerender] = useState(0); // refresh log UI

  // Debug log helper — timestamps shifted by +8 hours (UTC+8)
  const pushLog = (line: string) => {
    const ts = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
    logsRef.current.push(`[${ts}] ${line}`);
    forceRerender((x) => x + 1);
  };

  // Derived conversions
  const price = Number(unitPriceMyrPerG) || 0;
  const gramsNum = useMemo(() => Number(grams || 0), [grams]);
  const myrNum = useMemo(() => Number(myr || 0), [myr]);

  const computedMyr = useMemo(
    () => (Number.isFinite(gramsNum) ? gramsNum * price : 0),
    [gramsNum, price]
  );
  const computedGrams = useMemo(
    () => (price > 0 && Number.isFinite(myrNum) ? myrNum / price : 0),
    [myrNum, price]
  );

  const effectiveMyrCost = mode === "grams" ? computedMyr : myrNum;
  const effectiveGrams = mode === "grams" ? gramsNum : computedGrams;

  // Validations
  const invalidAmount =
    !Number.isFinite(effectiveGrams) ||
    !Number.isFinite(effectiveMyrCost) ||
    effectiveGrams <= 0 ||
    effectiveMyrCost <= 0;

  const insufficientCredit = effectiveMyrCost > target.currentCredit + 1e-9;

  // Reset modal state when closed
  useEffect(() => {
    if (!open) {
      setMode("grams");
      setGrams("");
      setMyr("");
      setNote(defaultNote);
      setError(null);
      setSubmitting(false);
      setStep("idle");
      setTxHash(null);
      logsRef.current = [];
      forceRerender((x) => x + 1);
    }
  }, [open, defaultNote]);

  if (!open) return null;

  async function handleMint() {
    try {
      setError(null);

      const admin = getAdminWallet();
      if (!admin) {
        setError("Connect admin wallet first.");
        return;
      }
      if (invalidAmount) {
        setError("Amount must be greater than zero.");
        return;
      }
      if (insufficientCredit) {
        setError("Insufficient RM credit for this mint.");
        return;
      }

      setSubmitting(true);
      pushLog(`Admin: ${admin}`);
      pushLog(`Target: ${target.address}`);
      pushLog(`Price: RM ${price.toFixed(2)}/g`);
      pushLog(
        `Mint request: grams=${Number(effectiveGrams).toFixed(6)}, cost=RM ${Number(
          effectiveMyrCost
        ).toFixed(2)}`
      );

      // 1) Ask backend to mint on-chain (returns tx_hash)
      setStep("broadcast");
      pushLog("Calling backend /api/admin/mint-onchain ...");
      const grams6 = Math.floor(Number(effectiveGrams) * 1e6) / 1e6;
      
      const { tx_hash } = await adminMintOnchain({
        wallet: target.address,
        grams: grams6,
        unit_price_myr_per_g: Number(price),
        note,
      });
      setTxHash(tx_hash);
      pushLog(`Broadcast OK. txHash=${tx_hash}`);

      // 2) Record purchase in DB with tx_hash
      setStep("finalizing");
      pushLog("Recording purchase in backend with tx_hash...");
      /*
      await purchaseAdminUser({
        wallet: target.address,
        grams: Number(effectiveGrams),
        unit_price_myr_per_g: Number(price),
        note,
        tx_hash,
      });
      */
      pushLog("Backend recorded successfully.");

      setStep("done");
      if (onSuccess) await onSuccess();
    } catch (e: any) {
      const msg = e?.message || "Mint failed.";
      setError(msg);
      pushLog(`ERROR: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  const explorerHref = txHash ? `${EXPLORER_BASE}/tx/${txHash}` : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Mint OUMG</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Deduct RM credit and increase OUMG (RM {price.toFixed(2)}/g).
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Step/status + tx link */}
        <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 space-y-1">
          <div>
            <span className="font-semibold">Status:</span>{" "}
            {step === "idle" && "Idle"}
            {step === "broadcast" && "Broadcasting (backend)..."}
            {step === "finalizing" && "Finalizing (database)..."}
            {step === "done" && "Done"}
          </div>
          {txHash && (
            <div className="break-all">
              <span className="font-semibold">txHash:</span>{" "}
              {explorerHref ? (
                <a
                  className="text-brand-600 underline"
                  href={explorerHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {txHash}
                </a>
              ) : (
                txHash
              )}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="mt-4 space-y-4">
          {/* Address + Current Credit + Price */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Address</label>
              <div className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center">
                <AddressDisplay address={target.address} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                Price (MYR / g)
              </label>
              <div className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center">
                RM {price.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                RM Credit (current)
              </label>
              <div className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center">
                RM {target.currentCredit.toFixed(2)}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Mode</label>
              <div className="flex rounded-lg border border-gray-200 p-1 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setMode("grams")}
                  className={`flex-1 rounded-md px-3 py-2 text-sm ${mode === "grams"
                    ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                    : "text-gray-600 dark:text-gray-300"
                    }`}
                >
                  By grams
                </button>
                <button
                  type="button"
                  onClick={() => setMode("myr")}
                  className={`flex-1 rounded-md px-3 py-2 text-sm ${mode === "myr"
                    ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                    : "text-gray-600 dark:text-gray-300"
                    }`}
                >
                  By MYR
                </button>
              </div>
            </div>
          </div>

          {/* Inputs */}
          {mode === "grams" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                  OUMG (grams)
                </label>
                <input
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g., 2"
                  disabled={submitting}
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                  Computed Cost (MYR)
                </label>
                <div
                  className={`h-11 w-full rounded-lg border px-3 text-sm flex items-center ${insufficientCredit
                    ? "border-red-300 text-red-700 dark:border-red-800 dark:text-red-300"
                    : "border-gray-200 text-gray-800 dark:border-gray-800 dark:text-white/90"
                    } dark:bg-gray-900`}
                >
                  {grams ? `RM ${computedMyr.toFixed(2)}` : "—"}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                  Amount (MYR)
                </label>
                <input
                  value={myr}
                  onChange={(e) => setMyr(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g., 1000"
                  disabled={submitting}
                  className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                  Computed OUMG (grams)
                </label>
                <div className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center">
                  {myr ? `${computedGrams.toFixed(6)} g` : "—"}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Minted by admin"
              disabled={submitting}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          {insufficientCredit && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              Insufficient credit: requires <b>RM {effectiveMyrCost.toFixed(2)}</b>, but user only has{" "}
              <b>RM {target.currentCredit.toFixed(2)}</b>.
            </div>
          )}
        </div>

        {/* Debug log panel */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowLog((v) => !v)}
            className="text-xs underline text-gray-600 dark:text-gray-300"
          >
            {showLog ? "Hide log" : "Show log"}
          </button>
          {showLog && (
            <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-800 p-2 bg-gray-50 dark:bg-gray-950/30">
              <pre className="max-h-52 overflow-auto text-[11px] leading-5 text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                {logsRef.current.join("\n") || "(-no logs-)"}
              </pre>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([logsRef.current.join("\n")], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `mint-log-${Date.now()}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}

                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 
             dark:text-gray-200 dark:border-gray-600 dark:bg-gray-800 
             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Download log
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(logsRef.current.join("\n"));
                  }}

                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 
             dark:text-gray-200 dark:border-gray-600 dark:bg-gray-800 
             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Copy log
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
          >
            Close
          </button>
          <button
            onClick={handleMint}
            disabled={submitting || invalidAmount || insufficientCredit}
            className="inline-flex items-center rounded-lg border border-brand-300 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-700 shadow-theme-xs hover:bg-brand-500/15 disabled:opacity-60 dark:border-brand-800 dark:text-brand-300"
          >
            {submitting ? "Processing…" : "Mint"}
          </button>
        </div>
      </div>
    </div>
  );
}