"use client";

import React, { useState } from "react";

type Log = {
  id: string;
  action: "Mint" | "Burn" | "Pause" | "Resume";
  operator: string;
  details: string;
  timestamp: string;
};

export default function TokenOpsPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<Log[]>([
    {
      id: "LOG-001",
      action: "Mint",
      operator: "0xAdmin…789",
      details: "Minted 500 OUMG",
      timestamp: "2025-09-20 13:45",
    },
    {
      id: "LOG-002",
      action: "Burn",
      operator: "0xAdmin…789",
      details: "Burned 200 OUMG",
      timestamp: "2025-09-19 09:12",
    },
  ]);

  const handleTogglePause = () => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);

    setLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        action: newPaused ? "Pause" : "Resume",
        operator: "0xAdmin…789",
        details: newPaused ? "Contract paused" : "Contract resumed",
        timestamp: new Date().toLocaleString(),
      },
      ...prev,
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Token Ops
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage OUM & OUMG contract state and review audit logs.
          </p>
        </div>
      </div>

      {/* Status card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Contract Status
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-800 dark:text-gray-100">
              {isPaused ? "Paused" : "Active"}
            </div>
          </div>

          <button
            onClick={handleTogglePause}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium shadow-theme-xs ${
              isPaused
                ? "border border-green-300 bg-green-500/10 text-green-700 hover:bg-green-500/15 dark:border-green-800 dark:text-green-400"
                : "border border-red-300 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:border-red-800 dark:text-red-400"
            }`}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Recent Audit Logs
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Operator</th>
                <th className="px-6 py-3">Details</th>
                <th className="px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-200 dark:border-gray-800"
                >
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {log.id}
                  </td>
                  <td className="px-6 py-4">{log.action}</td>
                  <td className="px-6 py-4">{log.operator}</td>
                  <td className="px-6 py-4">{log.details}</td>
                  <td className="px-6 py-4">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}