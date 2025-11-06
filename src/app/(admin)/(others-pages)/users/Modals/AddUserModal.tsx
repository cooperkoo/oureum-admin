/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import type { Address } from "@/lib/api";
import { createAdminUser, getAdminWallet } from "@/lib/api";

type AddUserModalProps = {
  open: boolean;
  onClose: () => void;
  defaultNote?: string;
  onSuccess?: () => Promise<void> | void; // optional callback for parent refresh
};

/** Zero address constant for a quick reject */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * validateEthAddress
 * - Accepts lowercase hex addresses without checksum (developer-friendly).
 * - If the address is mixed-case, requires a valid EIP-55 checksum.
 * - Trims input and returns a normalized address when possible.
 * - Falls back to regex-only if viem/ethers are not available.
 */
async function validateEthAddress(raw: string): Promise<{
  ok: boolean;
  normalized?: Address;
  reason?: string;
}> {
  const addr = (raw || "").trim();

  // Basic shape check first (allows both lower & mixed case here)
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return { ok: false, reason: "Invalid address format (needs 0x + 40 hex chars)." };
  }

  // Reject zero address
  if (addr.toLowerCase() === ZERO_ADDRESS) {
    return { ok: false, reason: "Zero address is not allowed." };
  }

  // Case 1: all lowercase -> accept as-is (no checksum required)
  if (addr === addr.toLowerCase()) {
    return { ok: true, normalized: addr as Address };
  }

  // Case 2: mixed case -> require EIP-55 checksum
  // Try viem first (if installed)
  try {
    // Dynamically import to avoid hard dependency at build time
    const viem = await import("viem");
    // viem.isAddress() verifies checksum when mixed-case
    if (viem.isAddress(addr)) {
      const checksummed = viem.getAddress(addr) as Address;
      return { ok: true, normalized: checksummed };
    }
  } catch {
    // ignore; viem not installed or not available on client
  }

  // Try ethers as a fallback (if installed)
  try {
    const ethersMod: any = await import("ethers");
    if (ethersMod?.getAddress) {
      const checksummed = ethersMod.getAddress(addr) as Address; // throws if invalid checksum
      return { ok: true, normalized: checksummed };
    }
  } catch {
    // ignore; ethers not installed
  }

  // If no libs: do a conservative fallback — reject mixed-case without checksum
  return {
    ok: false,
    reason:
      "Mixed-case address requires EIP-55 checksum (install viem/ethers), or use a lowercase address.",
  };
}

/**
 * AddUserModal
 * - Creates a new whitelisted user with zero RM balance.
 * - Validates Ethereum-like address format + optional EIP-55 checksum.
 * - Requires an admin wallet (header is auto-injected if present).
 */
export default function AddUserModal({
  open,
  onClose,
  defaultNote = "New user",
  onSuccess,
}: AddUserModalProps) {
  const [address, setAddress] = useState<string>("");
  const [note, setNote] = useState<string>(defaultNote);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false); // live feedback for address check

  useEffect(() => {
    if (!open) {
      setAddress("");
      setNote(defaultNote);
      setError(null);
      setSubmitting(false);
      setChecking(false);
    }
  }, [open, defaultNote]);

  if (!open) return null;

  // Optional: live validation (runs when leaving the field or by pressing Save)
  async function runLiveValidation(value: string) {
    setChecking(true);
    const res = await validateEthAddress(value);
    setError(res.ok ? null : res.reason || "Invalid address.");
    setChecking(false);
  }

  async function handleSave() {
    try {
      setError(null);

      if (!getAdminWallet()) {
        setError("Connect admin wallet first.");
        return;
      }

      setChecking(true);
      const res = await validateEthAddress(address);
      setChecking(false);

      if (!res.ok || !res.normalized) {
        setError(res.reason || "Invalid address.");
        return;
      }

      setSubmitting(true);
      await createAdminUser({ wallet: res.normalized as Address, note });
      if (onSuccess) await onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Create user failed");
    } finally {
      setSubmitting(false);
    }
  }

  const hasError = Boolean(error);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add User</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add a new whitelisted address with zero RM balance.
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
              Address
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={(e) => runLiveValidation(e.target.value)}
              placeholder="0x..."
              inputMode="text"
              autoCapitalize="off"
              spellCheck={false}
              className={[
                "h-11 w-full rounded-lg border px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden dark:bg-gray-900 dark:text-white/90 font-mono",
                hasError
                  ? "border-red-300 focus:ring-3 focus:ring-red-500/10 dark:border-red-800"
                  : "border-gray-200 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800",
              ].join(" ")}
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Supports lowercase hex (no checksum) or mixed-case with valid EIP-55 checksum.
            </div>
            {checking && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Validating…</div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="New user"
              className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || checking}
            className="inline-flex items-center rounded-lg border border-brand-300 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-700 shadow-theme-xs hover:bg-brand-500/15 disabled:opacity-60 dark:border-brand-800 dark:text-brand-300"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}