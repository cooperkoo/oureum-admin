"use client";

// app/(admin)/pricing/page.tsx
// Pricing admin page wired to backend pricing endpoints.
// - Shows current price (+ optional buy/sell/spread/bps if backend provides)
// - Lists historical snapshots (handles mixed backend keys safely)
// - Allows manual override with in-modal validation + confirmation
// - Protects actions behind admin wallet (x-admin-wallet)

import React, { useEffect, useMemo, useState } from "react";
import {
  getAdminWallet,
  getPriceSnapshot,
  listPriceSnapshots,
  manualPriceUpdate,
  type PriceSnapshot,
} from "@/lib/api";

// ------------- UI helpers -------------
const PAGE_SIZE = 20;
const FALLBACK_PRICE_MYR_PER_G = 500;

/** Format MYR with graceful fallback. If value is empty/NaN -> "—". */
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

/** Format basis points. If empty/NaN -> "—". */
function fmtBps(n?: unknown) {
  if (n === undefined || n === null || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v} bps`;
}

/** Compact date-time formatting with fallbacks. */
function fmtDateTime(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Resolve "updated at" field from mixed backends (updated/effective/created). */
function resolveUpdatedAt(x: any): string | undefined {
  return (
    x?.updated_at ||
    x?.updatedAt ||
    x?.effective_date ||
    x?.effectiveDate ||
    x?.created_at ||
    x?.createdAt ||
    x?.effectiveAt ||
    undefined
  );
}

/** Prefer user buy -> admin buy -> base price. */
function resolveEffectiveUserBuy(s: PriceSnapshot | null | undefined) {
  if (!s) return undefined;
  return (
    s.user_buy_myr_per_g ??
    s.buy_myr_per_g ??
    s.price_myr_per_g ??
    undefined
  );
}

// ------------- Page -------------
export default function PricingPage() {
  const [adminWallet, setAdminWalletState] = useState<string | null>(null);

  // Current effective snapshot
  const [current, setCurrent] = useState<PriceSnapshot | null>(null);
  const [curLoading, setCurLoading] = useState(true);

  // History
  const [history, setHistory] = useState<PriceSnapshot[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Toast (lightweight)
  const [toast, setToast] = useState<string | null>(null);

  // Modal: edit + confirm
  const [isModalOpen, setIsModalOpen] = useState(false);
  type ModalStep = "edit" | "confirm";
  const [step, setStep] = useState<ModalStep>("edit");

  const [formPrice, setFormPrice] = useState<string>("");
  const [formNote, setFormNote] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveUserBuy =
    resolveEffectiveUserBuy(current) ?? FALLBACK_PRICE_MYR_PER_G;

  // ---------- bootstrap ----------
  useEffect(() => {
    setAdminWalletState(getAdminWallet());
  }, []);

  useEffect(() => {
    let alive = true;
    async function run() {
      setCurLoading(true);
      try {
        const s = await getPriceSnapshot().catch(() => ({} as PriceSnapshot));
        if (!alive) return;
        setCurrent(s || null);
      } finally {
        if (alive) setCurLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadFirst() {
      setHistLoading(true);
      setHistError(null);
      try {
        const r = await listPriceSnapshots({ limit: PAGE_SIZE, offset: 0 });
        if (!alive) return;
        const data = r?.data ?? [];
        setHistory(data);
        setHasMore(data.length === PAGE_SIZE);
        setOffset(data.length);
      } catch (e) {
        if (!alive) return;
        const msg = (e as any)?.message || "Failed to load history";
        setHistError(msg);
      } finally {
        if (alive) setHistLoading(false);
      }
    }
    loadFirst();
    return () => {
      alive = false;
    };
  }, []);

  async function loadMore() {
    if (!hasMore || histLoading) return;
    setHistLoading(true);
    setHistError(null);
    try {
      const r = await listPriceSnapshots({ limit: PAGE_SIZE, offset });
      const data = r?.data ?? [];
      setHistory((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setOffset((o) => o + data.length);
    } catch (e) {
      const msg = (e as any)?.message || "Failed to load more";
      setHistError(msg);
    } finally {
      setHistLoading(false);
    }
  }

  // ---------- modal open/close ----------
  function openModal() {
    // Prefill with current effective price
    setFormPrice(String(effectiveUserBuy ?? FALLBACK_PRICE_MYR_PER_G));
    setFormNote("");
    setModalError(null);
    setStep("edit");
    setIsModalOpen(true);
  }
  function closeModal() {
    if (saving) return;
    setIsModalOpen(false);
    setModalError(null);
  }

  // ---------- validation in modal ----------
  function validate(): { ok: boolean; price?: number; message?: string } {
    const p = Number(formPrice);
    if (!Number.isFinite(p) || p <= 0) {
      return { ok: false, message: "Price must be a positive number." };
    }
    if (formNote && formNote.length > 120) {
      return { ok: false, message: "Note must be at most 120 characters." };
    }
    return { ok: true, price: p };
  }

  // ---------- modal actions ----------
  function onClickSaveNext() {
    const v = validate();
    if (!v.ok) {
      setModalError(v.message || "Invalid input.");
      return;
    }
    // Move to confirm step
    setModalError(null);
    setStep("confirm");
  }

  async function onConfirmApply() {
    const v = validate();
    if (!v.ok) {
      setModalError(v.message || "Invalid input.");
      setStep("edit");
      return;
    }

    try {
      setSaving(true);
      setModalError(null);

      await manualPriceUpdate({ myrPerG: v.price!, note: formNote || undefined });

      // Refresh current + history
      const [curr, hist] = await Promise.all([
        getPriceSnapshot().catch(() => ({} as PriceSnapshot)),
        listPriceSnapshots({ limit: PAGE_SIZE, offset: 0 }),
      ]);

      setCurrent(curr || null);
      setHistory(hist?.data ?? []);
      setHasMore((hist?.data?.length ?? 0) === PAGE_SIZE);
      setOffset(hist?.data?.length ?? 0);

      setIsModalOpen(false);
      setToast("Price updated successfully.");
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      const msg = (e as any)?.message || "Failed to update price.";
      // Keep user at confirm step but show error at top of modal
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ---------- memo current display ----------
  const currentMeta = useMemo(() => {
    const raw: any = current || {};
    return {
      sheet: current?.source === "manual" ? "MANUAL" : current?.source === "cron" ? "CRON" : "N/A",
      price: effectiveUserBuy,
      updatedAt: current?.updated_at || resolveUpdatedAt(raw),
      // Optional details if backend provides
      buy: raw.buy_myr_per_g,
      sell: raw.sell_myr_per_g,
      spreadMyr: raw.spread_myr_per_g,
      spreadBps: raw.spread_bps ?? raw.markup_bps, // support "markup_bps" from snapshots
      raw,
    };
  }, [current, effectiveUserBuy]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Pricing</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage the active gold price (MYR per gram) used by the user app.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openModal}
            disabled={!adminWallet}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
            title={!adminWallet ? "Connect admin wallet to edit" : undefined}
          >
            New Pricing Sheet
          </button>
        </div>
      </div>

      {/* Current pricing card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        {curLoading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading current price…</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Source</div>
                <div className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {currentMeta.sheet}
                </div>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">Effective Price (MYR / gram)</div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {fmtRM(currentMeta.price)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-400">Effective Time</div>
                <div className="mt-1 text-gray-800 dark:text-gray-100">
                  {fmtDateTime(currentMeta.updatedAt)}
                </div>
              </div>
            </div>

            {/* Optional detail grid if backend exposes more fields */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <div className="text-gray-500 dark:text-gray-400">Buy</div>
                <div className="mt-1 font-medium">{fmtRM(currentMeta.buy)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <div className="text-gray-500 dark:text-gray-400">Sell</div>
                <div className="mt-1 font-medium">{fmtRM(currentMeta.sell)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <div className="text-gray-500 dark:text-gray-400">Spread (MYR)</div>
                <div className="mt-1 font-medium">{fmtRM(currentMeta.spreadMyr)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <div className="text-gray-500 dark:text-gray-400">Spread (bps)</div>
                <div className="mt-1 font-medium">{fmtBps(currentMeta.spreadBps)}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Price history */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Price History</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Latest snapshots first. Includes user & internal price fields if provided by backend.
          </p>
        </div>

        {histError && (
          <div className="mx-5 my-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {histError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Base</th>
                <th className="px-5 py-3">Buy</th>
                <th className="px-5 py-3">Sell</th>
                <th className="px-5 py-3">User Buy</th>
                <th className="px-5 py-3">User Sell</th>
                <th className="px-5 py-3">Spread (MYR)</th>
                <th className="px-5 py-3">Spread (bps)</th>
                <th className="px-5 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {histLoading && history.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-center text-gray-500 dark:text-gray-400" colSpan={10}>
                    Loading…
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-center text-gray-500 dark:text-gray-400" colSpan={10}>
                    No snapshots yet.
                  </td>
                </tr>
              ) : (
                history.map((h, idx) => {
                  const raw = h as any;
                  const updated = resolveUpdatedAt(raw) || h.updated_at;
                  // "computed_myr_per_g" appears in snapshots (string). "markup_bps" often equals spread bps.
                  const base = h.price_myr_per_g ?? raw.computed_myr_per_g ?? raw.myrPerG ?? raw.price;
                  const spreadMyr = raw.spread_myr_per_g;
                  const spreadBps = raw.spread_bps ?? raw.markup_bps;

                  return (
                    <tr key={`${updated || "row"}-${idx}`} className="border-b border-gray-200 dark:border-gray-800">
                      <td className="px-5 py-3">{fmtDateTime(updated)}</td>
                      <td className="px-5 py-3">{h.source ?? raw.kind ?? (raw.manual ? "manual" : "—")}</td>
                      <td className="px-5 py-3">{fmtRM(base)}</td>
                      <td className="px-5 py-3">{fmtRM(h.buy_myr_per_g)}</td>
                      <td className="px-5 py-3">{fmtRM(h.sell_myr_per_g)}</td>
                      <td className="px-5 py-3">{fmtRM(h.user_buy_myr_per_g)}</td>
                      <td className="px-5 py-3">{fmtRM(h.user_sell_myr_per_g)}</td>
                      <td className="px-5 py-3">{fmtRM(spreadMyr)}</td>
                      <td className="px-5 py-3">{fmtBps(spreadBps)}</td>
                      <td className="px-5 py-3">{raw.note ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-5">
          {hasMore ? (
            <button
              onClick={loadMore}
              disabled={histLoading}
              className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
            >
              {histLoading ? "Loading…" : "Load More"}
            </button>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">No more snapshots.</span>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-theme-lg dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          {toast}
        </div>
      )}

      {/* Modal (edit + confirm) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

          {/* Dialog */}
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {step === "edit" ? "Create New Pricing Sheet" : "Confirm New Price"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {step === "edit"
                ? "Set the MYR per gram used for OUMG purchases."
                : "Please confirm the price change before applying."}
            </p>

            {modalError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                {modalError}
              </div>
            )}

            {step === "edit" ? (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                    Price (MYR / gram)
                  </label>
                  <input
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    inputMode="decimal"
                    placeholder="500"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  />
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Current effective: {fmtRM(effectiveUserBuy)}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Note (optional)</label>
                  <input
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="Investor demo"
                    maxLength={120}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                  <div>
                    <strong>Heads up:</strong> Confirming will update the active price immediately.
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center justify-between">
                      <span>Old (effective):</span>
                      <span className="font-semibold">{fmtRM(effectiveUserBuy)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>New (to apply):</span>
                      <span className="font-semibold">
                        {fmtRM(Number.isFinite(Number(formPrice)) ? Number(formPrice) : undefined)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span>Note:</span>
                      <span className="font-mono text-xs">{formNote || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
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
                  disabled={saving}
                  className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-theme-xs hover:bg-emerald-500/15 disabled:opacity-60 dark:border-emerald-800 dark:text-emerald-300"
                >
                  {saving ? "Applying…" : "Apply Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}