"use client";

import React from "react";

/** Simple page-level skeleton loader for User pages (light/dark friendly). */
export default function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-64 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
        </div>

        {/* Balance skeletons */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
              <div className="mt-3 h-7 w-40 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
              <div className="mt-4 h-2 w-full animate-pulse rounded bg-gray-100 dark:bg-white/5" />
            </div>
          ))}
        </div>

        {/* Main cards skeleton */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-12">
          <div className="xl:col-span-7 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
            <div className="mt-4 space-y-3">
              {[...Array(4)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-12 w-full animate-pulse rounded-xl border border-gray-200 dark:border-gray-800"
                />
              ))}
            </div>
          </div>
          <div className="xl:col-span-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
            <div className="mt-4 space-y-3">
              {[...Array(4)].map((_, idx) => (
                <div key={idx} className="h-10 w-full animate-pulse rounded bg-gray-100 dark:bg-white/5" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}