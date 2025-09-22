"use client";

import React, { useMemo, useState } from "react";

type Activity = {
  id: string;
  type: "Credit" | "Purchase" | "Mint";
  detail: string;
  when: string;
};

const PRICE_MYR_PER_G = 500; // demo pricing: RM 500 per gram

export default function UserCustodialDemo() {
  // ----- Demo balances (custodial) -----
  const [rmBalance, setRmBalance] = useState<number>(1500);   // user RM credits (custodial)
  const [oumgBalance, setOumgBalance] = useState<number>(1.2); // user OUMG grams

  // ----- Buy form -----
  const [grams, setGrams] = useState<string>("");
  const cost = useMemo(() => {
    const g = Number(grams);
    if (!Number.isFinite(g) || g <= 0) return 0;
    return g * PRICE_MYR_PER_G;
  }, [grams]);

  const [minting, setMinting] = useState<"idle" | "processing" | "success">("idle");
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [fakeHash, setFakeHash] = useState<string | null>(null);

  // Activity feed (local)
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

  const canBuy = grams.trim() !== "" && cost > 0 && rmBalance >= cost && minting !== "processing";

  const startBuyAndMint = () => {
    if (!canBuy) return;
    setMinting("processing");
    setStep(1);

    // Step 1: reserve RM →
    setTimeout(() => {
      setStep(2);
      // Step 2: minting on chain →
      setTimeout(() => {
        setStep(3);
        // Step 3: success →
        setTimeout(() => {
          const g = Number(grams);
          const spend = g * PRICE_MYR_PER_G;

          setRmBalance((v) => Number((v - spend).toFixed(2)));
          setOumgBalance((v) => Number((v + g).toFixed(4)));

          const hash = `0x${Math.random().toString(16).slice(2, 10)}${Math.random()
            .toString(16)
            .slice(2, 10)}`;
          setFakeHash(hash);

          const now = new Date().toLocaleString(undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });

          // push activities
          setActivity((prev) => [
            {
              id: `ACT-${Date.now()}-M`,
              type: "Mint",
              detail: `Minted ${g} g to your wallet (tx ${hash.slice(0, 10)}…)`,
              when: now,
            },
            {
              id: `ACT-${Date.now()}-P`,
              type: "Purchase",
              detail: `Bought ${g} g OUMG (RM ${spend})`,
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
  };

  const pill = (t: Activity["type"]) => {
    switch (t) {
      case "Credit":
        return "border-blue-300 bg-blue-500/10 text-blue-700 dark:border-blue-800 dark:text-blue-400";
      case "Purchase":
        return "border-emerald-300 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400";
      case "Mint":
        return "border-purple-300 bg-purple-500/10 text-purple-700 dark:border-purple-800 dark:text-purple-400";
      default:
        return "border-gray-300 bg-gray-500/10 text-gray-700 dark:border-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Oureum – User Wallet (Custodial Demo)</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View RM credits, buy OUMG at RM {PRICE_MYR_PER_G}/g, and experience a guided mint flow.
          </p>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">RM Credits</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">RM {rmBalance}</div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
            <div
              className="h-2 rounded-full bg-brand-500/70"
              style={{ width: `${Math.min(100, Math.round((rmBalance / (rmBalance + 1)) * 100))}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">OUMG Balance</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{oumgBalance} g</div>
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-white/5">
            <div
              className="h-2 rounded-full bg-emerald-500/70"
              style={{ width: `${Math.min(100, Math.round((oumgBalance / (oumgBalance + 1)) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Buy widget */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Buy OUMG</h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Price (MYR / g)</label>
            <div className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center">
              RM {PRICE_MYR_PER_G}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">OUMG (grams)</label>
            <input
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              inputMode="decimal"
              placeholder="e.g. 2"
              className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Computed Cost (MYR)</label>
            <div className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center">
              {cost ? `RM ${cost}` : "—"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Available: <span className="font-medium text-gray-700 dark:text-gray-300">RM {rmBalance}</span>
          </div>
          <button
            disabled={!canBuy}
            onClick={startBuyAndMint}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold shadow-theme-xs
              ${canBuy
                ? "border border-emerald-300 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:border-emerald-800 dark:text-emerald-400"
                : "border border-gray-200 bg-white text-gray-400 dark:border-gray-800 dark:bg-gray-900"}
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
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">This is a demo flow (no real chain interaction).</div>

                <ol className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${step >= 1 ? "bg-emerald-500" : "bg-gray-300"}`} />
                    Reserve RM balance
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${step >= 2 ? "bg-emerald-500" : "bg-gray-300"}`} />
                    Mint OUMG on chain
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${step >= 3 ? "bg-emerald-500" : "bg-gray-300"}`} />
                    Finalize & update balances
                  </li>
                </ol>

                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                  <div
                    className="h-2 bg-emerald-500/70 transition-[width] duration-500"
                    style={{
                      width: step === 0 ? "0%" : step === 1 ? "33%" : step === 2 ? "66%" : "100%",
                    }}
                  />
                </div>
              </>
            )}

            {minting === "success" && (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    Minting Success
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Tx Hash: {fakeHash?.slice(0, 20)}… (demo)
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={resetFlow}
                    className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/5"
                  >
                    Close
                  </button>
                  <a
                    href="#wallet-info"
                    className="inline-flex items-center rounded-lg border border-blue-300 bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-700 shadow-theme-xs hover:bg-blue-500/15 dark:border-blue-800 dark:text-blue-400"
                    onClick={() => setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50)}
                  >
                    View Info
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity & Info */}
      <div id="wallet-info" className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Activity</h2>
          </div>
          <ul className="p-5 space-y-3">
            {activity.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <span
                  className={`mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${pill(
                    a.type
                  )}`}
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
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            This is a product demo. No real blockchain interaction happens here.
          </p>
        </div>
      </div>
    </div>
  );
}