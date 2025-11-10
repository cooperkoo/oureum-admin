// app/page.tsx
"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-24">
        {/* Brand / Title */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Oureum System
          </h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Internal tools for pricing, gold ledger, OUMG mint/burn ops, and admin workflows.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/admin/signin"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-theme-xs hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-white/[0.03]"
          >
            Enter Admin Portal
          </Link>

          <Link
            href="/user/login"
            className="inline-flex items-center rounded-lg border border-transparent bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-black/90 focus:outline-hidden focus:ring-2 focus:ring-gray-300 dark:bg-white dark:text-gray-900 dark:hover:bg-white/90"
          >
            Go to User App
          </Link>
        </div>

        {/* Footnote */}
        <p className="mt-10 text-center text-xs text-gray-500 dark:text-gray-500">
          Access is restricted. Admin routes require a connected admin wallet.
        </p>
      </div>
    </main>
  );
}