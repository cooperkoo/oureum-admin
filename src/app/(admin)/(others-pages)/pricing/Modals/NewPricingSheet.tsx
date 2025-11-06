"use client";

// Modal for creating a new pricing sheet with two input modes:
// 1) Direct Buy/Sell (default) → persists pair (myrPerG_buy / myrPerG_sell)
// 2) Base + Spread (MYR or bps) → persists single base (myrPerG)
// Includes edit/confirm steps, validation, and API call.

import React, { useEffect, useMemo, useState } from "react";
import { manualPriceUpdate } from "@/lib/api";

type ModalStep = "edit" | "confirm";
type Mode = "direct" | "base-spread";

function toNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function fmtRM(n?: unknown) {
  if (n === undefined || n === null || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

/** Derive full set from direct inputs (buy/sell). */
function deriveFromDirect(buyStr: string, sellStr: string) {
  const buy = toNum(buyStr);
  const sell = toNum(sellStr);
  if (buy == null || sell == null || buy <= 0 || sell <= 0) return null;

  const base = round6((buy + sell) / 2);
  const spreadMYR = round6(Math.abs(buy - sell));
  const spreadBps = base > 0 ? Math.round((spreadMYR / base) * 10_000) : 0;

  return {
    base,
    buy,
    sell,
    userBuy: buy,
    userSell: sell,
    spreadMYR,
    spreadBps,
  };
}

/** Derive full set from base + spread (either MYR or bps). */
function deriveFromBaseSpread(baseStr: string, spreadMyrStr: string, spreadBpsStr: string) {
  const base = toNum(baseStr);
  const sMYR = toNum(spreadMyrStr);
  const sBps = toNum(spreadBpsStr);

  if (base == null || base <= 0) return null;

  let spreadMYR: number | null = null;
  if (sMYR != null && sMYR >= 0) {
    spreadMYR = sMYR;
  } else if (sBps != null && sBps >= 0) {
    spreadMYR = round6(base * (sBps / 10_000));
  } else {
    // If no spread provided, default 0
    spreadMYR = 0;
  }

  const half = (spreadMYR as number) / 2;
  const buy = round6(base + half);
  const sell = round6(base - half);
  const spreadBps = base > 0 ? Math.round(((spreadMYR as number) / base) * 10_000) : 0;

  return {
    base,
    buy,
    sell,
    userBuy: buy,
    userSell: sell,
    spreadMYR: round6(spreadMYR as number),
    spreadBps,
  };
}

export default function NewPricingSheet({
  open,
  currentEffectivePrice,
  onClose,
  onSuccess,
}: {
  open: boolean;
  currentEffectivePrice: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<ModalStep>("edit");
  const [mode, setMode] = useState<Mode>("direct"); // default = direct
  const [note, setNote] = useState<string>("");

  // Direct mode inputs
  const [buy, setBuy] = useState<string>("");
  const [sell, setSell] = useState<string>("");

  // Base+Spread mode inputs
  const [base, setBase] = useState<string>("");
  const [spreadMyr, setSpreadMyr] = useState<string>("");
  const [spreadBpsInput, setSpreadBpsInput] = useState<string>("");

  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset and prefill when opened
  useEffect(() => {
    if (!open) return;
    setMode("direct"); // ensure default tab is Direct
    setBuy("");
    setSell("");
    setBase(String(currentEffectivePrice || 500));
    setSpreadMyr("");
    setSpreadBpsInput("");
    setNote("");
    setModalError(null);
    setStep("edit");
  }, [open, currentEffectivePrice]);

  // Live preview (computed) for both modes
  const preview = useMemo(() => {
    if (mode === "direct") {
      return deriveFromDirect(buy, sell);
    }
    return deriveFromBaseSpread(base, spreadMyr, spreadBpsInput);
  }, [mode, buy, sell, base, spreadMyr, spreadBpsInput]);

  function validate(): { ok: boolean; message?: string } {
    if (!preview) {
      return { ok: false, message: "Please fill valid numbers for the selected mode." };
    }
    const { buy: b, sell: s } = preview;
    if (b == null || s == null || b <= 0 || s <= 0) {
      return { ok: false, message: "Buy and Sell must be positive numbers." };
    }
    if (note && note.length > 120) {
      return { ok: false, message: "Note must be at most 120 characters." };
    }
    return { ok: true };
  }

  function onClickSaveNext() {
    const v = validate();
    if (!v.ok) {
      setModalError(v.message || "Invalid input.");
      return;
    }
    setModalError(null);
    setStep("confirm");
  }

  async function onConfirmApply() {
    const v = validate();
    if (!v.ok || !preview) {
      setModalError(v.message || "Invalid input.");
      setStep("edit");
      return;
    }

    try {
      setSaving(true);
      setModalError(null);

      if (mode === "direct") {
        // Persist pair
        await manualPriceUpdate({
          myrPerG_buy: preview.buy!,
          myrPerG_sell: preview.sell!,
          note: note || undefined,
        });
      } else {
        // Persist base only (backend will derive sides by env BPS in some stacks, but we store base)
        await manualPriceUpdate({
          myrPerG: preview.base!,
          note: note || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Failed to update price.";
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {step === "edit" ? "Create New Pricing Sheet" : "Confirm New Price"}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {step === "edit"
            ? "Choose an input mode and set prices (MYR/gram)."
            : "Please confirm the price change before applying."}
        </p>

        {modalError && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {modalError}
          </div>
        )}

        {step === "edit" ? (
          <>
            {/* Mode switch — Direct first, Base+Spread second */}
            <div className="mt-5 inline-flex rounded-lg border border-gray-200 p-1 text-sm dark:border-gray-800">
              <button
                type="button"
                onClick={() => setMode("direct")}
                className={`rounded-md px-3 py-1.5 ${
                  mode === "direct"
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                }`}
              >
                Direct Buy/Sell
              </button>

              <button
                type="button"
                onClick={() => setMode("base-spread")}
                className={`rounded-md px-3 py-1.5 ${
                  mode === "base-spread"
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                }`}
              >
                Base + Spread
              </button>
            </div>

            {/* Inputs */}
            {mode === "direct" ? (
              // ---- Direct Buy/Sell ----
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                    Buy (MYR / gram)
                  </label>
                  <input
                    value={buy}
                    onChange={(e) => setBuy(e.target.value)}
                    inputMode="decimal"
                    placeholder="520"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                    Sell (MYR / gram)
                  </label>
                  <input
                    value={sell}
                    onChange={(e) => setSell(e.target.value)}
                    inputMode="decimal"
                    placeholder="515"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
              </div>
            ) : (
              // ---- Base + Spread ----
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                    Base (MYR / gram)
                  </label>
                  <input
                    value={base}
                    onChange={(e) => setBase(e.target.value)}
                    inputMode="decimal"
                    placeholder="517"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  />
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Current effective: {fmtRM(currentEffectivePrice)}
                  </div>
                </div>

                <div className="sm:col-span-1">
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                    Spread (MYR)
                  </label>
                  <input
                    value={spreadMyr}
                    onChange={(e) => setSpreadMyr(e.target.value)}
                    inputMode="decimal"
                    placeholder="5.00"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                    Spread (bps)
                  </label>
                  <input
                    value={spreadBpsInput}
                    onChange={(e) => setSpreadBpsInput(e.target.value)}
                    inputMode="numeric"
                    placeholder="97"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  />
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    If both MYR and bps are provided, MYR is used.
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            <div className="mt-5">
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                Note (optional)
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Investor demo"
                maxLength={120}
                className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            {/* Live preview */}
            <div className="mt-6 rounded-xl border border-gray-200 p-4 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300">
              <div className="font-semibold mb-2 text-gray-800 dark:text-gray-100">
                Preview (not saved yet)
              </div>
              {!preview ? (
                <div className="text-gray-500 dark:text-gray-400">
                  Fill valid numbers to see preview.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Base</div>
                    <div className="mt-0.5 font-medium">{fmtRM(preview.base)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Buy</div>
                    <div className="mt-0.5 font-medium">{fmtRM(preview.buy)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Sell</div>
                    <div className="mt-0.5 font-medium">{fmtRM(preview.sell)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">User Buy</div>
                    <div className="mt-0.5 font-medium">{fmtRM(preview.userBuy)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">User Sell</div>
                    <div className="mt-0.5 font-medium">{fmtRM(preview.userSell)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Spread (MYR)</div>
                    <div className="mt-0.5 font-medium">{fmtRM(preview.spreadMYR)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Spread (bps)</div>
                    <div className="mt-0.5 font-medium">{preview.spreadBps} bps</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Note</div>
                    <div className="mt-0.5 font-mono text-xs">{note || "—"}</div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // Confirm step
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <div>
                <strong>Heads up:</strong> Confirming will update the active price immediately.
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              {!preview ? (
                <div className="text-gray-500 dark:text-gray-400">No valid values.</div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Old (effective):</span>
                    <span className="font-semibold">{fmtRM(currentEffectivePrice)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Base</div>
                      <div className="mt-0.5 font-medium">{fmtRM(preview.base)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Buy</div>
                      <div className="mt-0.5 font-medium">{fmtRM(preview.buy)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Sell</div>
                      <div className="mt-0.5 font-medium">{fmtRM(preview.sell)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Spread (MYR)</div>
                      <div className="mt-0.5 font-medium">{fmtRM(preview.spreadMYR)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Spread (bps)</div>
                      <div className="mt-0.5 font-medium">{preview.spreadBps} bps</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Note</div>
                      <div className="mt-0.5 font-mono text-xs">{note || "—"}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={() => !saving && (step === "edit" ? onClose() : setStep("edit"))}
            disabled={saving}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
          >
            {step === "edit" ? "Cancel" : "Back"}
          </button>

          {step === "edit" ? (
            <button
              onClick={onClickSaveNext}
              disabled={saving}
              className="inline-flex items-center rounded-lg border border-brand-300 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-700 shadow-theme-xs hover:bg-brand-500/15 disabled:opacity-60 dark:border-brand-800 dark:text-brand-300"
            >
              Review & Confirm
            </button>
          ) : (
            <button
              onClick={onConfirmApply}
              disabled={saving || !preview}
              className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-theme-xs hover:bg-emerald-500/15 disabled:opacity-60 dark:border-emerald-800 dark:text-emerald-300"
            >
              {saving ? "Applying…" : "Apply Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}