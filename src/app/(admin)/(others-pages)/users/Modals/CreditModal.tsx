/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Address } from "@/lib/api";
import { creditAdminUser, getAdminWallet } from "@/lib/api";

type CreditModalProps = {
  open: boolean;
  onClose: () => void;
  target: { address: Address; currentCredit: number };
  defaultNote?: string;
  onSuccess?: () => Promise<void> | void; // optional callback for parent refresh
};

/**
 * CreditModal
 * - Adds RM credit to a target address.
 * - Two-step confirmation to reduce operator mistakes.
 * - Requires an admin wallet (header is auto-injected if present).
 */
export default function CreditModal({
  open,
  onClose,
  target,
  defaultNote = "Bank transfer received",
  onSuccess,
}: CreditModalProps) {
  const [amountRM, setAmountRM] = useState<string>("");
  const [note, setNote] = useState<string>(defaultNote);
  const [error, setError] = useState<string | null>(null);

  // two-step confirmation
  const [confirming, setConfirming] = useState(false);
  const [ack, setAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const valueRM = useMemo(() => Number(amountRM || 0), [amountRM]);
  const newBalance = useMemo(
    () => (Number.isFinite(valueRM) ? target.currentCredit + valueRM : target.currentCredit),
    [valueRM, target.currentCredit]
  );

  useEffect(() => {
    if (!open) {
      // reset on close
      setAmountRM("");
      setNote(defaultNote);
      setError(null);
      setConfirming(false);
      setAck(false);
      setSubmitting(false);
    }
  }, [open, defaultNote]);

  if (!open) return null;

  async function handleSave() {
    try {
      setError(null);

      // basic validations
      if (!getAdminWallet()) {
        setError("Connect admin wallet first.");
        return;
      }
      if (!Number.isFinite(valueRM) || valueRM <= 0) {
        setError("Amount must be > 0");
        return;
      }

      // step 1: review
      if (!confirming) {
        setConfirming(true);
        return;
      }

      // step 2: require explicit acknowledgement
      if (!ack) {
        setError("Please acknowledge the top-up checkbox.");
        return;
      }

      setSubmitting(true);
      await creditAdminUser({
        wallet: target.address,
        amount_myr: valueRM,
        note,
      });

      if (onSuccess) await onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Top-up failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Credit RM (Add funds)
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          After bank receipt, increase RM balance for the selected address.
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Address</label>
            <div className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center font-mono">
              {target.address}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Current RM Credit</label>
              <div className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center">
                RM {target.currentCredit.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Amount (MYR)</label>
              <input
                value={amountRM}
                onChange={(e) => setAmountRM(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 1000"
                disabled={submitting || confirming}
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bank transfer received"
              disabled={submitting || confirming}
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 disabled:opacity-60"
            />
          </div>

          {confirming && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              <div className="font-semibold mb-1">Please review before confirming:</div>
              <ul className="text-sm space-y-0.5">
                <li>
                  Current balance: <span className="font-mono">RM {target.currentCredit.toFixed(2)}</span>
                </li>
                <li>
                  Top-up amount: <span className="font-mono">RM {Number.isFinite(valueRM) ? valueRM.toFixed(2) : "0.00"}</span>
                </li>
                <li>
                  New balance after top-up: <span className="font-mono">RM {newBalance.toFixed(2)}</span>
                </li>
              </ul>
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />
                <span>I understand this will top up the user’s RM credit.</span>
              </label>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              submitting ||
              (confirming && (!Number.isFinite(valueRM) || valueRM <= 0 || !ack))
            }
            className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-semibold shadow-theme-xs ${
              confirming
                ? "border-red-300 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:border-red-800 dark:text-red-300"
                : "border-brand-300 bg-brand-500/10 text-brand-700 hover:bg-brand-500/15 dark:border-brand-800 dark:text-brand-300"
            }`}
            title={confirming && !ack ? "Tick the acknowledgement checkbox to proceed" : undefined}
          >
            {confirming ? (submitting ? "Processing…" : "Confirm Top-up") : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}