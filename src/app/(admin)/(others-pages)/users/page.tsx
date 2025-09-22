"use client";

import React, { useMemo, useState } from "react";

type UserRow = {
  address: string;
  rmCredit: number;     // current RM credit balance
  rmSpent: number;      // cumulative RM spent
  oumgPurchased: number;// cumulative OUMG purchased (grams)
  note?: string;
  updated: string;
};

const DEMO_PRICE_MYR_PER_G = 500; // demo price: RM 500 / gram

export default function UsersPage() {
  // Seed demo data
  const [users, setUsers] = useState<UserRow[]>([
    {
      address: "0x0bf3E5F98d659BCe08C3aeD0AD5F373Ba1cEb24f",
      rmCredit: 5000,
      rmSpent: 1500,
      oumgPurchased: 3, // 3g @ RM500 => RM1500 spent
      note: "Core admin",
      updated: "2025-09-20 11:05",
    },
    {
      address: "0xAbc…789",
      rmCredit: 1200,
      rmSpent: 0,
      oumgPurchased: 0,
      note: "Investor demo",
      updated: "2025-09-19 16:42",
    },
  ]);

  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query) return users;
    const q = query.toLowerCase();
    return users.filter((u) => u.address.toLowerCase().includes(q));
  }, [users, query]);

  // Totals
  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, u) => {
        acc.rmCredit += u.rmCredit;
        acc.rmSpent += u.rmSpent;
        acc.oumgPurchased += u.oumgPurchased;
        return acc;
      },
      { rmCredit: 0, rmSpent: 0, oumgPurchased: 0 }
    );
  }, [filtered]);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "credit" | "purchase">("credit");
  const [target, setTarget] = useState<UserRow | null>(null);

  // Fields
  const [amountRM, setAmountRM] = useState<string>(""); // for credit
  const [newAddress, setNewAddress] = useState<string>("");
  const [note, setNote] = useState<string>("Bank transfer received");
  const [amountOUMG, setAmountOUMG] = useState<string>(""); // for purchase

  const nowStamp = () =>
    new Date().toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const openCredit = (row: UserRow) => {
    setMode("credit");
    setTarget(row);
    setAmountRM("");
    setNote("Bank transfer received");
    setIsOpen(true);
  };

  const openPurchase = (row: UserRow) => {
    setMode("purchase");
    setTarget(row);
    setAmountOUMG("");
    setNote("Recorded by admin (demo)");
    setIsOpen(true);
  };

  const openAddUser = () => {
    setMode("add");
    setNewAddress("");
    setNote("New user");
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setTarget(null);
  };

  const onSave = () => {
    if (mode === "credit") {
      if (!target) return;
      const value = Number(amountRM);
      if (!Number.isFinite(value) || value <= 0) return;

      setUsers((prev) =>
        prev.map((u) =>
          u.address === target.address
            ? {
                ...u,
                rmCredit: Number((u.rmCredit + value).toFixed(2)),
                note,
                updated: nowStamp(),
              }
            : u
        )
      );
      closeModal();
      return;
    }

    if (mode === "purchase") {
      if (!target) return;
      const grams = Number(amountOUMG);
      if (!Number.isFinite(grams) || grams <= 0) return;
      const cost = grams * DEMO_PRICE_MYR_PER_G;

      // If credit is insufficient, still allow in demo? Here we prevent negative.
      if (target.rmCredit < cost) {
        // In demo, just do nothing (or you can alert)
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.address === target.address
            ? {
                ...u,
                rmCredit: Number((u.rmCredit - cost).toFixed(2)),
                rmSpent: Number((u.rmSpent + cost).toFixed(2)),
                oumgPurchased: Number((u.oumgPurchased + grams).toFixed(4)),
                note,
                updated: nowStamp(),
              }
            : u
        )
      );
      closeModal();
      return;
    }

    // add user
    if (mode === "add") {
      const addr = newAddress.trim();
      if (!addr) return;
      if (users.some((u) => u.address.toLowerCase() === addr.toLowerCase()))
        return;

      setUsers((prev) => [
        {
          address: addr,
          rmCredit: 0,
          rmSpent: 0,
          oumgPurchased: 0,
          note,
          updated: nowStamp(),
        },
        ...prev,
      ]);
      closeModal();
      return;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Users
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage whitelisted users, preload RM credits, and record purchases (demo).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden sm:block">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by address…"
                className="h-10 w-[260px] rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          </div>

          <button
            onClick={openAddUser}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
          >
            Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-6 py-3">Address</th>
              <th className="px-6 py-3">RM Credit (MYR)</th>
              <th className="px-6 py-3">RM Spent (MYR)</th>
              <th className="px-6 py-3">OUMG Purchased (g)</th>
              <th className="px-6 py-3">Note</th>
              <th className="px-6 py-3">Last Updated</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.address} className="border-b border-gray-200 dark:border-gray-800">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  {u.address}
                </td>
                <td className="px-6 py-4">RM {u.rmCredit}</td>
                <td className="px-6 py-4">RM {u.rmSpent}</td>
                <td className="px-6 py-4">{u.oumgPurchased}</td>
                <td className="px-6 py-4">{u.note || "—"}</td>
                <td className="px-6 py-4">{u.updated}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openCredit(u)}
                      className="text-sm inline-flex items-center rounded-lg border border-blue-300 bg-blue-500/10 px-3 py-1.5 font-semibold text-blue-700 shadow-theme-xs hover:bg-blue-500/15 dark:border-blue-800 dark:text-blue-400"
                    >
                      Credit RM
                    </button>
                    <button
                      onClick={() => openPurchase(u)}
                      className="text-sm inline-flex items-center rounded-lg border border-green-300 bg-green-500/10 px-3 py-1.5 font-semibold text-green-700 shadow-theme-xs hover:bg-green-500/15 dark:border-green-800 dark:text-green-400"
                    >
                      Record Purchase
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* Totals row */}
            <tr className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
              <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                Totals
              </td>
              <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                RM {totals.rmCredit}
              </td>
              <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                RM {totals.rmSpent}
              </td>
              <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                {totals.oumgPurchased}
              </td>
              <td className="px-6 py-4">—</td>
              <td className="px-6 py-4">—</td>
              <td className="px-6 py-4">—</td>
            </tr>

            {filtered.length === 0 && (
              <tr>
                <td className="px-6 py-8 text-center text-gray-500 dark:text-gray-400" colSpan={7}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          {/* Dialog */}
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {mode === "credit" ? "Credit RM (Add funds)" : mode === "purchase" ? "Record Purchase" : "Add User"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {mode === "credit" &&
                "After bank receipt, increase RM balance for the selected address."}
              {mode === "purchase" &&
                `Deduct RM credit and increase OUMG purchased (RM ${DEMO_PRICE_MYR_PER_G}/g).`}
              {mode === "add" &&
                "Add a new whitelisted address with zero RM balance."}
            </p>

            <div className="mt-5 space-y-4">
              {mode === "credit" && target && (
                <>
                  <div>
                    <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                      Address
                    </label>
                    <div className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center">
                      {target.address}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                      Amount (MYR)
                    </label>
                    <input
                      value={amountRM}
                      onChange={(e) => setAmountRM(e.target.value)}
                      inputMode="decimal"
                      placeholder="e.g. 1000"
                      className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                      Note
                    </label>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Bank transfer received"
                      className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                </>
              )}

              {mode === "purchase" && target && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                        Address
                      </label>
                      <div className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center">
                        {target.address}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                        Price (MYR / g)
                      </label>
                      <div className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center">
                        RM {DEMO_PRICE_MYR_PER_G}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                        OUMG (grams)
                      </label>
                      <input
                        value={amountOUMG}
                        onChange={(e) => setAmountOUMG(e.target.value)}
                        inputMode="decimal"
                        placeholder="e.g. 2"
                        className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                        Computed Cost (MYR)
                      </label>
                      <div className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 flex items-center">
                        {amountOUMG
                          ? `RM ${Number(amountOUMG) * DEMO_PRICE_MYR_PER_G}`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                      Note
                    </label>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Recorded by admin (demo)"
                      className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                </>
              )}

              {mode === "add" && (
                <>
                  <div>
                    <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                      Address
                    </label>
                    <input
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      placeholder="0x..."
                      className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                      Note
                    </label>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="New user"
                      className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="inline-flex items-center rounded-lg border border-brand-300 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-700 shadow-theme-xs hover:bg-brand-500/15 dark:border-brand-800 dark:text-brand-300"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}