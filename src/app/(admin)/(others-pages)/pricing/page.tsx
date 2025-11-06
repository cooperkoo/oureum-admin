"use client";

// Pricing admin page wired to backend pricing endpoints.
// - Shows current price (+ optional buy/sell/spread/bps if backend provides)
// - Lists historical snapshots (handles mixed backend keys safely)
// - Opens modal (NewProcingSheet) to set a new price
// - Protects actions behind admin wallet (x-admin-wallet)

import React, { useEffect, useMemo, useState } from "react";
import {
  getAdminWallet,
  getPriceSnapshot,
  listPriceSnapshots,
  type PriceSnapshot,
} from "@/lib/api";
import NewPricingSheet from "./Modals/NewPricingSheet";

const PAGE_SIZE = 20;
const FALLBACK_PRICE_MYR_PER_G = 500;

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

function fmtBps(n?: unknown) {
  if (n === undefined || n === null || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v} bps`;
}

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

function resolveEffectiveUserBuy(s: PriceSnapshot | null | undefined) {
  if (!s) return undefined;
  return (
    s.user_buy_myr_per_g ??
    s.buy_myr_per_g ??
    s.price_myr_per_g ??
    undefined
  );
}

export default function PricingPage() {
  const [adminWallet, setAdminWalletState] = useState<string | null>(null);

  const [current, setCurrent] = useState<PriceSnapshot | null>(null);
  const [curLoading, setCurLoading] = useState(true);

  const [history, setHistory] = useState<PriceSnapshot[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const [toast, setToast] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const effectiveUserBuy =
    resolveEffectiveUserBuy(current) ?? FALLBACK_PRICE_MYR_PER_G;

  // Bootstrap admin wallet
  useEffect(() => {
    setAdminWalletState(getAdminWallet());
  }, []);

  // Load current
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

  // Load history first page
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

  function openModal() {
    setIsModalOpen(true);
  }
  function closeModal() {
    setIsModalOpen(false);
  }

  // After modal applies a new price, refresh lists and show toast
  async function handleModalSuccess() {
    const [curr, hist] = await Promise.all([
      getPriceSnapshot().catch(() => ({} as PriceSnapshot)),
      listPriceSnapshots({ limit: PAGE_SIZE, offset: 0 }),
    ]);
    setCurrent(curr || null);
    setHistory(hist?.data ?? []);
    setHasMore((hist?.data?.length ?? 0) === PAGE_SIZE);
    setOffset(hist?.data?.length ?? 0);

    setToast("Price updated successfully.");
    setTimeout(() => setToast(null), 2000);
  }

  const currentMeta = useMemo(() => {
    const raw: any = current || {};
    return {
      sheet: current?.source ? current.source.toUpperCase() : "N/A",
      price: effectiveUserBuy,
      updatedAt: current?.updated_at || resolveUpdatedAt(raw),
      buy: raw.buy_myr_per_g,
      sell: raw.sell_myr_per_g,
      spreadMyr: raw.spread_myr_per_g,
      spreadBps: raw.spread_bps ?? raw.markup_bps,
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

      {/* Modal */}
      <NewPricingSheet
        open={isModalOpen}
        currentEffectivePrice={effectiveUserBuy}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}