/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/(user)/user/login/page.tsx
"use client";

import React, { useState } from "react";
import {
  loginAndEnsureUser,
  setStoredUserWallet,
  clearStoredUserWallet,
  formatAddress,
} from "@/lib/apiUser";
import { useRouter } from "next/navigation";

export default function UserLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function onConnect() {
    setLoading(true);
    setErrorText(null);
    try {
      const { wallet } = await loginAndEnsureUser();
      setStoredUserWallet(wallet);
      router.replace("/user");
    } catch (e) {
      setErrorText((e as Error)?.message || "Failed to connect wallet.");
    } finally {
      setLoading(false);
    }
  }

  function onGuest() {
    clearStoredUserWallet();
    router.replace("/user"); // 允许游客预览 UI；真正调用时后端会拒绝
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10 dark:bg-gray-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">User Login</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Connect your wallet to access your balances and buy/mint OUMG.
        </p>

        {errorText && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {errorText}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={onConnect}
            disabled={loading}
            className="h-11 w-full rounded-lg bg-emerald-600 text-sm font-semibold text-white shadow-theme-xs hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Connecting…" : "Connect MetaMask"}
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          We never ask for seed phrases. You approve transactions in your wallet. Displayed addresses use the{" "}
          <span className="font-mono">0x1234…abcd</span> short form.
        </p>
      </div>
    </div>
  );
}