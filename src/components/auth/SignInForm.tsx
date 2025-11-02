// src/components/auth/SigninForm.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  normalizeAddress,
  isAdminAddress,
  saveAdminSession,
  clearAdminSession,
  readAdminSession,
  requestMetaMaskAddress,
  API_BASE,
} from "@/lib/adminAuth";

/**
 * Admin Sign-In (explicit-only):
 * - No auto-verify; only runs when user clicks the button.
 * - Uses window.ethereum directly (no WalletConnect / SDK).
 * - Shows a clear warning if NEXT_PUBLIC_API_BASE is not set.
 */
export default function SignInForm() {
  const router = useRouter();
  const [checking, setChecking] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  // If already logged in, go Dashboard
  React.useEffect(() => {
    const { isAdmin } = readAdminSession();
    if (isAdmin) router.replace("/");
  }, [router]);

  async function handleSignIn() {
    setError("");
    try {
      if (!API_BASE) {
        throw new Error(
          "Backend API base is not configured. Please set NEXT_PUBLIC_API_BASE."
        );
      }

      setChecking(true);

      // 1) Ask MetaMask for address explicitly on click
      const addr = await requestMetaMaskAddress();
      const w = normalizeAddress(addr);
      if (!w) throw new Error("Invalid wallet address returned by MetaMask.");

      // 2) Backend verification via x-admin-wallet header
      const ok = await isAdminAddress(w);
      if (ok) {
        saveAdminSession(w);
        router.replace("/"); // go dashboard
      } else {
        clearAdminSession();
        throw new Error("This wallet is not in the admin whitelist.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to sign in with MetaMask.");
    } finally {
      setChecking(false);
    }
  }

  const apiBaseMissing = !API_BASE;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex">
      {/* Left section (form) */}
      <div className="flex flex-col flex-1 lg:w-1/2 w-full">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6">
          <div className="mb-8">
            <h1 className="mb-2 font-semibold text-gray-900 text-3xl dark:text-white">
              Admin Sign In
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Connect with a whitelisted wallet to access the Admin Portal.
            </p>
          </div>

          {/* Environment warning if API base is missing */}
          {apiBaseMissing && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="font-semibold">NEXT_PUBLIC_API_BASE is not set</div>
              <div className="mt-1">
                Please set <code className="px-1 rounded bg-black/5 dark:bg-white/10">NEXT_PUBLIC_API_BASE</code>
                &nbsp;(e.g. <code className="px-1 rounded bg-black/5 dark:bg-white/10">http://localhost:4000</code> or
                &nbsp;<code className="px-1 rounded bg-black/5 dark:bg-white/10">https://api.oureum.com</code>) in your environment.
              </div>
            </div>
          )}

          {/* MetaMask sign-in button */}
          <button
            onClick={handleSignIn}
            disabled={checking || apiBaseMissing}
            className="w-full rounded-xl px-6 py-3.5 font-semibold text-gray-900 dark:text-white
                       bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                       shadow-sm transition-all duration-200
                       hover:bg-gray-50 dark:hover:bg-gray-700/60
                       disabled:opacity-60 disabled:cursor-not-allowed
                       inline-flex items-center justify-center gap-3"
            aria-label="Sign in with MetaMask"
          >
            <MetaMaskFox className="h-6 w-6" />
            {checking ? "Connecting…" : "Sign in with MetaMask"}
          </button>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Right decoration area */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-gray-50 dark:bg-gray-900/50">
        <div className="w-full max-w-md">{/* optional illustration */}</div>
      </div>
    </div>
  );
}

/** Minimal MetaMask Fox SVG (no external asset) */
function MetaMaskFox(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 318 318" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path fill="#E2761B" d="M274 35l-98 73 18-41 80-32zM44 35l98 73-18-41L44 35zM250 230l-26 39 56 15 16-53-46-1zM68 230l26 39-56 15-16-53 46-1z" />
      <path fill="#E4761B" d="M140 210h38l5 32-24 15-24-15 5-32zM238 207l-60-44 34-15 26 59zM80 207l60-44-34-15-26 59z" />
      <path fill="#D7C1B3" d="M178 257l-18 11-18-11 18-13 18 13z" />
      <path fill="#233447" d="M125 173l33 25-5 12-28-37zM193 173l-33 25 5 12 28-37z" />
      <path fill="#E2761B" d="M112 188l-30-18 22-10 8 28zM206 188l30-18-22-10-8 28z" />
    </svg>
  );
}