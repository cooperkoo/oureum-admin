// src/components/providers/Web3Providers.tsx
"use client";

import React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defineChain } from "viem";

/** Oureum testnet (custom chain) */
const oureum = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 828828),
  name: "Oureum Testnet",
  nativeCurrency: { name: "OUM", symbol: "OUM", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.oureum.com"],
    },
  },
});

/**
 * IMPORTANT (wagmi v2):
 * - `autoConnect` option was removed.
 * - To avoid unexpected auto-reconnect UX, enable `shimDisconnect` on the injected connector.
 *   This stores a "user disconnected" flag and prevents re-connecting on page reloads
 *   unless the user explicitly initiates a new connection.
 */
const config = createConfig({
  chains: [oureum],
  transports: {
    [oureum.id]: http(oureum.rpcUrls.default.http[0]),
  },
  // Only injected connector (MetaMask/OKX/Brave). No WalletConnect or MetaMask SDK.
  connectors: [
    injected({
      shimDisconnect: true, // remember user-initiated disconnects to prevent auto-reconnect
    }),
  ],
  ssr: true,
});

const queryClient = new QueryClient();

export function Web3Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}