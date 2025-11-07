/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { createGoldLedger, type GoldLedgerEntry } from "@/lib/apiGoldLedger";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void; // parent will reload + toast
};

export default function NewGoldEntry({ open, onClose, onSuccess }: Props) {
  const [entry_date, setDate] = useState<string>("");
  const [intake_g, setIntake] = useState<string>("");
  const [purity_bp, setPurity] = useState<string>("9999");
  const [source, setSource] = useState<string>("");
  const [serial, setSerial] = useState<string>("");
  const [batch, setBatch] = useState<string>("");
  const [storage, setStorage] = useState<string>("");
  const [custody, setCustody] = useState<string>("");
  const [insurance, setInsurance] = useState<string>("");
  const [audit_ref, setAuditRef] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // reset form on open
    const today = new Date().toISOString().slice(0, 10);
    setDate(today);
    setIntake("");
    setPurity("9999");
    setSource("");
    setSerial("");
    setBatch("");
    setStorage("");
    setCustody("");
    setInsurance("");
    setAuditRef("");
    setNote("");
    setSubmitting(false);
    setErrorText(null);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorText(null);

    if (!entry_date) {
      setErrorText("Entry date is required.");
      return;
    }
    const g = Number(intake_g);
    if (!Number.isFinite(g) || g <= 0) {
      setErrorText("Intake (g) must be a positive number.");
      return;
    }
    const p = purity_bp.trim() === "" ? null : Number(purity_bp);
    if (p !== null && (!Number.isFinite(p) || p < 0 || p > 10000)) {
      setErrorText("Purity (bp) must be between 0 and 10000.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: GoldLedgerEntry = {
        entry_date,
        intake_g: g,
        purity_bp: p ?? undefined,
        source: source || undefined,
        serial: serial || undefined,
        batch: batch || undefined,
        storage: storage || undefined,
        custody: custody || undefined,
        insurance: insurance || undefined,
        audit_ref: audit_ref || undefined,
        note: note || undefined,
      };
      await createGoldLedger(payload);
      onSuccess();
      onClose();
    } catch (e: any) {
      setErrorText(e?.message || "Create entry failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">New Gold Intake</h3>
          <button
            onClick={onClose}
            className="rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
            disabled={submitting}
          >
            Close
          </button>
        </div>

        {errorText && (
          <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {errorText}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">Entry date</span>
            <input
              type="date"
              required
              value={entry_date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">Intake (g)</span>
            <input
              inputMode="decimal"
              required
              step="0.000001"
              placeholder="e.g. 250.123456"
              value={intake_g}
              onChange={(e) => setIntake(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">Purity (bp)</span>
            <input
              inputMode="numeric"
              min={0}
              max={10000}
              step={1}
              placeholder="9999"
              value={purity_bp}
              onChange={(e) => setPurity(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">Source</span>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Dealer / Mint / Vault…"
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">Serial</span>
            <input
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">Batch</span>
            <input
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">Storage</span>
            <input
              value={storage}
              onChange={(e) => setStorage(e.target.value)}
              placeholder="e.g. Vault A"
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">Custody</span>
            <input
              value={custody}
              onChange={(e) => setCustody(e.target.value)}
              placeholder="Internal / 3rd-party"
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">Insurance</span>
            <input
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              placeholder="policy # / provider"
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">Audit Ref</span>
            <input
              value={audit_ref}
              onChange={(e) => setAuditRef(e.target.value)}
              placeholder="e.g. AUD-2025-001"
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90"
            />
          </label>

          <label className="sm:col-span-2 flex flex-col gap-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">Note</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
              className="rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90"
            />
          </label>

          <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-lg border border-blue-300 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-700 shadow-theme-xs hover:bg-blue-500/15 disabled:opacity-60 dark:border-blue-800 dark:text-blue-400"
            >
              {submitting && (
                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                  <path d="M22 12a10 10 0 0 1-10 10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              )}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}