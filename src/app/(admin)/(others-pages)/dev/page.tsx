// app/(admin)/dev/page.tsx
"use client";

import React from "react";
import { fetchJson, connectMetaMaskAsAdmin, getAdminWallet, API_BASE } from "@/lib/api";

/** Lightweight dev page:
 * - Show current price from backend
 * - Connect MetaMask and faucet RM to self (admin-only)
 */
export default function DevPage() {
  const [admin, setAdmin] = React.useState<string | null>(null);
  const [price, setPrice] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [log, setLog] = React.useState<string>("");

  React.useEffect(() => {
    setAdmin(getAdminWallet());
  }, []);

  const readPrice = async () => {
    setBusy(true);
    setLog("");
    try {
      const data = await fetchJson<{ data: any }>("/api/price/current");
      setPrice(data.data);
      setLog("Fetched /api/price/current successfully.");
    } catch (e: any) {
      setLog(`Price error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const connectAdmin = async () => {
    setBusy(true);
    setLog("");
    try {
      const addr = await connectMetaMaskAsAdmin();
      setAdmin(addr);
      setLog(`Admin connected: ${addr}`);
    } catch (e: any) {
      setLog(`Connect error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const faucetSelf = async () => {
    if (!admin) {
      setLog("Please connect MetaMask as admin first.");
      return;
    }
    setBusy(true);
    setLog("");
    try {
      // POST /api/admin/faucet-rm { wallet, amount }
      const resp = await fetchJson<{ success: boolean; newBalance: number }>(
        "/api/admin/faucet-rm",
        {
          method: "POST",
          admin: true,
          body: { wallet: admin, amount: 200 },
        }
      );
      setLog(`Faucet success. New RM balance: ${resp.newBalance}`);
    } catch (e: any) {
      setLog(`Faucet error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Oureum Dev Panel</h1>

      <div className="mb-4 text-sm text-gray-600">
        Backend: <code>{API_BASE}</code>
      </div>

      <div className="space-y-4">
        <section className="p-4 border rounded-md">
          <h2 className="font-medium mb-2">1) Current Price</h2>
          <button
            onClick={readPrice}
            disabled={busy}
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            Read /api/price/current
          </button>
          {price && (
            <pre className="mt-3 text-sm bg-gray-100 p-3 rounded overflow-auto">
{JSON.stringify(price, null, 2)}
            </pre>
          )}
        </section>

        <section className="p-4 border rounded-md">
          <h2 className="font-medium mb-2">2) Admin Actions</h2>
          <div className="text-sm mb-2">
            Admin wallet:{" "}
            <code>{admin || "(not connected)"}</code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={connectAdmin}
              disabled={busy}
              className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50"
            >
              Connect MetaMask as Admin
            </button>
            <button
              onClick={faucetSelf}
              disabled={busy || !admin}
              className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50"
            >
              Faucet RM 200 to Me
            </button>
          </div>
        </section>

        {log && (
          <div className="p-3 text-sm bg-yellow-50 rounded border">
            {log}
          </div>
        )}
      </div>
    </div>
  );
}