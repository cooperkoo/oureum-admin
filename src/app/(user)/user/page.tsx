"use client";

import React, { useState } from "react";
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
  const [rmBalance, setRmBalance] = useState<number>(1500);
  const [oumgBalance, setOumgBalance] = useState<number>(1.2);

  const [grams, setGrams] = useState<string>("");
  const [ringgit, setRinggit] = useState<string>("");

  // 自动联动计算
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

  const [minting, setMinting] = useState<"idle" | "processing" | "success">("idle");
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [fakeHash, setFakeHash] = useState<string | null>(null);

  const [activity, setActivity] = useState<Activity[]>([]);

  const canBuy = g > 0 && cost > 0 && rmBalance >= cost && minting !== "processing";

  const startBuyAndMint = () => {
    if (!canBuy) return;
    setMinting("processing");
    setStep(1);

    setTimeout(() => {
      setStep(2);
      setTimeout(() => {
        setStep(3);
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

      {/* Balance */}
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
              ${canBuy
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"}
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
              <div>
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  ✅ Minting Success
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Tx Hash: {fakeHash?.slice(0, 20)}… (demo)
                </div>
                <button onClick={resetFlow} className="mt-3 rounded-lg border px-3 py-1 text-sm">
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Recent Activity</h2>
        <ul className="space-y-2">
          {activity.length === 0 && (
            <li className="text-xs text-gray-500 dark:text-gray-400">No activity yet.</li>
          )}
          {activity.map((a) => (
            <li key={a.id} className="text-sm text-gray-800 dark:text-gray-200">
              {a.when} — {a.detail}
            </li>
          ))}
        </ul>
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