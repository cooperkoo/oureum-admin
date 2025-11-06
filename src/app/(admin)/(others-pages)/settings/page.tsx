"use client";

import React, { useState } from "react";

export default function SettingsPage() {
  // Demo state for editable texts (now disabled)
  const [title, setTitle] = useState("Oureum Admin");
  const [subtitle, setSubtitle] = useState("Internal control panel");
  const [disclaimer, setDisclaimer] = useState(
    "For demo purposes only. Not financial advice."
  );

  const handleSave = () => {
    // Disabled: no-op
    alert("Settings are read-only in this view.");
  };

  const DISABLED = true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View admin info and update display texts.
          </p>
        </div>
      </div>

      {/* Admin Addresses */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Admin Addresses
        </h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 font-mono break-all">
          <li>0x0bf3e5f98d659bce08c3aed0ad5f373ba1ceb24f</li>
          <li>0x21dd60982155a0182d94bcaaacc1c61550c99c69</li>
          <li>0x0bf3e5f98d659bce08c3aed0ad5f373ba1ceb24f</li>
        </ul>
      </div>

      {/* Network Info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Network Info
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Chain ID</dt>
            <dd className="font-medium text-gray-800 dark:text-gray-100">
              828828
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Network</dt>
            <dd className="font-medium text-gray-800 dark:text-gray-100">
              Oureum Testnet (L1)
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500 dark:text-gray-400">RPC URL</dt>
            <dd className="font-medium text-gray-800 dark:text-gray-100">
              https://testnet-rpc.oureum.com
            </dd>
          </div>
        </dl>
      </div>

      {/* Display Texts (all disabled) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Display Texts
        </h2>
        <div className="space-y-4 opacity-80">
          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
              App Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={DISABLED}
              readOnly
              className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 dark:border-gray-800 dark:bg-gray-800/50 dark:text-white/90"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
              Subtitle
            </label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              disabled={DISABLED}
              readOnly
              className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 dark:border-gray-800 dark:bg-gray-800/50 dark:text-white/90"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
              Disclaimer
            </label>
            <textarea
              value={disclaimer}
              onChange={(e) => setDisclaimer(e.target.value)}
              rows={3}
              disabled={DISABLED}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 dark:border-gray-800 dark:bg-gray-800/50 dark:text-white/90"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={DISABLED}
            aria-disabled={DISABLED}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-400 shadow-theme-xs cursor-not-allowed dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-500"
            title="Read-only"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}