"use client";

import React, { useState } from "react";

export default function PricingPage() {
  // Demo state (client-side only for VC demo)
  const [currentPrice, setCurrentPrice] = useState<number>(500);
  const [currentSheetId, setCurrentSheetId] = useState<string>("TBD");
  const [effectiveAt, setEffectiveAt] = useState<string>("—");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal form state
  const [formPrice, setFormPrice] = useState<string>("500");
  const [formNote, setFormNote] = useState<string>("Investor demo");

  const onOpen = () => {
    setFormPrice(String(currentPrice));
    setFormNote("Investor demo");
    setIsModalOpen(true);
  };

  const onCancel = () => {
    setIsModalOpen(false);
  };

  const onSave = () => {
    const p = Number(formPrice);
    if (!Number.isFinite(p) || p <= 0) return;
    // Fake a new sheet id and time
    const newId = `PRC-${Date.now()}`;
    const now = new Date();
    const stamp = now.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    setCurrentPrice(p);
    setCurrentSheetId(newId);
    setEffectiveAt(stamp);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Pricing
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage the active gold price (MYR per gram) used by the user app.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpen}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
          >
            New Pricing Sheet
          </button>
        </div>
      </div>

      {/* Current pricing card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Current Sheet
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-100">
              {currentSheetId}
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Effective Price (MYR / gram)
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              RM {currentPrice}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Effective Time
            </div>
            <div className="mt-1 text-gray-800 dark:text-gray-100">
              {effectiveAt}
            </div>
          </div>
        </div>
      </div>

      {/* Modal (themed, simple) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onCancel}
          />
          {/* Dialog */}
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Create New Pricing Sheet
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Set the MYR per gram used for OUMG purchases.
            </p>

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
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                  Note
                </label>
                <input
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Investor demo"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="inline-flex items-center rounded-lg border border-brand-300 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-700 shadow-theme-xs hover:bg-brand-500/15 dark:border-brand-800 dark:text-brand-300"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}