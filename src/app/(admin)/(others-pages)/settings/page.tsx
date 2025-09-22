"use client";

import React, { useState } from "react";

export default function SettingsPage() {
  // Demo state for editable texts
  const [title, setTitle] = useState("Oureum Admin");
  const [subtitle, setSubtitle] = useState("Internal control panel");
  const [disclaimer, setDisclaimer] = useState(
    "For demo purposes only. Not financial advice."
  );

  const handleSave = () => {
    alert("Settings saved (demo only).");
  };

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
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>0x0bf3E5F98d659BCe08C3aeD0AD5F373Ba1cEb24f</li>
          <li>0xAdmin…789</li>
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
              72888
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Network</dt>
            <dd className="font-medium text-gray-800 dark:text-gray-100">
              Oureum Testnet (L1)
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">RPC URL</dt>
            <dd className="font-medium text-gray-800 dark:text-gray-100">
              https://rpc.oureum.test
            </dd>
          </div>
        </dl>
      </div>

      {/* Display Texts */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Display Texts
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
              App Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
              Subtitle
            </label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
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
              className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            className="inline-flex items-center rounded-lg border border-brand-300 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-700 shadow-theme-xs hover:bg-brand-500/15 dark:border-brand-800 dark:text-brand-300"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}