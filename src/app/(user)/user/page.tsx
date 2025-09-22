"use client";

import React, { useMemo, useState } from "react";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";

type Activity = {
  id: string;
  type: "Credit" | "Purchase" | "Mint";
  detail: string;
  when: string;
};

const PRICE_MYR_PER_G = 500; // demo: RM 500 / g

export default function UserCustodialDemo() {
  return <PageContent />;
}

function PageContent() {
  // Demo balances
  const [rmBalance, setRmBalance] = useState<number>(1500);
  const [oumgBalance, setOumgBalance] = useState<number>(1.2);

  // Two-way inputs
  const [grams, setGrams] = useState<string>("");
  const [ringgit, setRinggit] = useState<string>("");

  // Sync helpers
  const syncByGrams = (g: string) => {
    setGrams(g);
    const val = Number(g);
    setRinggit(val > 0 ? String(val * PRICE_MYR_PER_G) : "");
  };
  const syncByRinggit = (rm: string) => {
    setRinggit(rm);
    const val = Number(rm);
    setGrams(val > 0 ? String(val / PRICE_MYR_PER_G) : "");
  };

  const cost = Number(ringgit) || 0;
  const g = Number(grams) || 0;

  // Minting flow
  const [minting, setMinting] = useState<"idle" | "processing" | "success">("idle");
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [fakeHash, setFakeHash] = useState<string | null>(null);

  // Activity feed
  const [activity, setActivity] = useState<Activity[]>([
    {
      id: "ACT-1003",
      type: "Credit",
      detail: "Admin credited RM 1,000",
      when: "2025-09-20 13:10",
    },
    {
      id: "ACT-1002",
      type: "Purchase",
      detail: "Bought 0.5 g OUMG (RM 250)",
      when: "2025-09-19 17:40",
    },
    {
      id: "ACT-1001",
      type: "Mint",
      detail: "Minted 0.5 g to your wallet",
      when: "2025-09-19 17:40",
    },
  ]);

  const canBuy = g > 0 && cost > 0 && rmBalance >= cost && minting !== "processing";

  const startBuyAndMint = () => {
    if (!canBuy) return;
    setMinting("processing");
    setStep(1);

    // Step 1
    setTimeout(() => {
      setStep(2);
      // Step 2
      setTimeout(() => {
        setStep(3);
        // Step 3
        setTimeout(() => {
          setRmBalance((v) => Number((v - cost).toFixed(2)));
          setOumgBalance((v) => Number((v + g).toFixed(4)));

          const hash = `0x${Math.random().toString(16).slice(2, 10)}${Math.random()
            .toString(16)
            .slice(2, 10)}`;
          setFakeHash(hash);

          const now = new Date().toLocaleString();

          setActivity((prev) => [
            {
              id: `ACT-${Date.now()}-M`,
              type: "Mint",
              detail: `Minted ${g.toFixed(4)} g (tx ${hash.slice(0, 10)}…)`,
              when: now,
            },
            {
              id: `ACT-${Date.now()}-P`,
              type: "Purchase",
              detail: `Bought ${g.toFixed(4)} g OUMG (RM ${cost.toFixed(2)})`,
              when: now,
            },
            ...prev,
          ]);

          setMinting("success");
        }, 600);
      }, 900);
    }, 600);
  };

  const resetFlow = () => {
    setMinting("idle");
    setStep(0);
    setFakeHash(null);
    setGrams("");
    setRinggit("");
  };

  // Projected balances (for Wallet Info)
  const projectedRm = useMemo(
    () => (canBuy ? Number((rmBalance - cost).toFixed(2)) : rmBalance),
    [canBuy, rmBalance, cost]
  );
  const projectedG = useMemo(
    () => (canBuy ? Number((oumgBalance + g).toFixed(4)) : oumgBalance),
    [canBuy, oumgBalance, g]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Oureum – User Wallet (Custodial Demo)
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View RM credits, buy OUMG at RM {PRICE_MYR_PER_G}/g, and experience a guided mint flow.
          </p>
        </div>
        <ThemeToggleButton />
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-8">
        <BalanceCard label="RM Credits" value={`RM ${rmBalance}`} color="brand" />
        <BalanceCard label="OUMG Balance" value={`${oumgBalance} g`} color="emerald" />
      </div>

      {/* Buy & Mint */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Buy & Mint</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Ringgit (MYR)</label>
            <input
              value={ringgit}
              onChange={(e) => syncByRinggit(e.target.value)}
              placeholder="e.g. 1000"
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">OUMG (grams)</label>
            <input
              value={grams}
              onChange={(e) => syncByGrams(e.target.value)}
              placeholder="e.g. 2"
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Available: <span className="font-medium text-gray-700 dark:text-gray-300">RM {rmBalance}</span>
          </div>
          <button
            disabled={!canBuy}
            onClick={startBuyAndMint}
            className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-theme-xs
              ${
                canBuy
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }
            `}
          >
            {minting === "processing" ? "Processing…" : "Buy & Mint"}
          </button>
        </div>

        {/* Minting flow */}
        {minting !== "idle" && (
          <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            {minting === "processing" && (
              <>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Minting in progress</div>
                <ol className="mt-4 space-y-2 text-sm">
                  <li>Step {step >= 1 ? "✅" : "⏳"} Reserve RM balance</li>
                  <li>Step {step >= 2 ? "✅" : "⏳"} Mint OUMG on chain</li>
                  <li>Step {step >= 3 ? "✅" : "⏳"} Finalize & update balances</li>
                </ol>
              </>
            )}
            {minting === "success" && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    ✅ Minting Success
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Tx Hash: {fakeHash?.slice(0, 20)}… (demo)
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={resetFlow}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/5"
                  >
                    Close
                  </button>
                  <a
                    href="#wallet-info"
                    className="rounded-lg border border-blue-300 bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-700 shadow-theme-xs hover:bg-blue-500/15 dark:border-blue-800 dark:text-blue-400"
                    onClick={() =>
                      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50)
                    }
                  >
                    View Info
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity + Wallet Info */}
      <div id="wallet-info" className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-12">
        {/* Activity */}
        <div className="xl:col-span-7 rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Activity</h2>
          </div>
          <ul className="p-5 space-y-3">
            {activity.length === 0 && (
              <li className="text-xs text-gray-500 dark:text-gray-400">No activity yet.</li>
            )}
            {activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <span
                  className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    a.type === "Credit"
                      ? "border-blue-300 bg-blue-500/10 text-blue-700 dark:border-blue-800 dark:text-blue-400"
                      : a.type === "Purchase"
                      ? "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                      : "border-purple-300 bg-purple-500/10 text-purple-700 dark:border-purple-800 dark:text-purple-400"
                  }`}
                >
                  {a.type}
                </span>
                <div className="flex-1">
                  <div className="text-sm text-gray-800 dark:text-gray-200">{a.detail}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{a.when}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Wallet Info */}
        <div className="xl:col-span-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Wallet Info</h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Account Type</dt>
              <dd className="font-medium text-gray-800 dark:text-gray-100">Custodial (demo)</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Price (MYR / g)</dt>
              <dd className="font-medium text-gray-800 dark:text-gray-100">RM {PRICE_MYR_PER_G}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">RM Credits</dt>
              <dd className="font-medium text-gray-800 dark:text-gray-100">RM {rmBalance}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">OUMG</dt>
              <dd className="font-medium text-gray-800 dark:text-gray-100">{oumgBalance} g</dd>
            </div>
          </dl>

          {/* Projected after this purchase (only when canBuy) */}
          {canBuy && (
            <div className="mt-4 rounded-xl border border-gray-200 p-4 text-sm dark:border-gray-800">
              <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Projected After Purchase</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-gray-500 dark:text-gray-400">RM Credits</div>
                  <div className="font-medium text-gray-800 dark:text-gray-100">RM {projectedRm}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400">OUMG</div>
                  <div className="font-medium text-gray-800 dark:text-gray-100">{projectedG} g</div>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Based on current inputs (RM {cost || 0} → {g || 0} g).
              </p>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            This is a product demo. No real blockchain interaction happens here.
          </p>
        </div>
      </div>
    </div>
  );
}

function BalanceCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    brand: "bg-blue-500/70",
    emerald: "bg-emerald-500/70",
  };
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
        <div className={`h-2 rounded-full ${colors[color]}`} style={{ width: "80%" }} />
      </div>
    </div>
  );
}