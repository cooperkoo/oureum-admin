"use client";

import React, { useState } from "react";

type Order = {
  id: string;
  address: string;
  rm: number;
  oumg: number;
  status: "Pending" | "Completed" | "Rejected";
  created: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: "ORD-001",
      address: "0xAbc…789",
      rm: 1000,
      oumg: 2,
      status: "Pending",
      created: "2025-09-20 14:32",
    },
    {
      id: "ORD-002",
      address: "0xDef…456",
      rm: 2500,
      oumg: 5,
      status: "Completed",
      created: "2025-09-19 10:15",
    },
  ]);

  const [selected, setSelected] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (order: Order) => {
    setSelected(order);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
  };

  const handleAction = (action: "approve" | "reject") => {
    if (!selected) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === selected.id
          ? {
              ...o,
              status: action === "approve" ? "Completed" : "Rejected",
            }
          : o
      )
    );
    closeModal();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400";
      case "Pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400";
      case "Rejected":
        return "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track purchase and redemption requests for OUMG.
          </p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-6 py-3">Order ID</th>
              <th className="px-6 py-3">Address</th>
              <th className="px-6 py-3">Amount (RM)</th>
              <th className="px-6 py-3">OUMG</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="border-b border-gray-200 dark:border-gray-800"
              >
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  {o.id}
                </td>
                <td className="px-6 py-4">{o.address}</td>
                <td className="px-6 py-4">RM {o.rm}</td>
                <td className="px-6 py-4">{o.oumg}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusColor(
                      o.status
                    )}`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="px-6 py-4">{o.created}</td>
                <td className="px-6 py-4">
                  {o.status === "Pending" && (
                    <button
                      onClick={() => openModal(o)}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      Review
                    </button>
                  )}
                  {o.status !== "Pending" && (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {isModalOpen && selected && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          {/* Dialog */}
          <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Review Order
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Order ID: {selected.id}
            </p>

            <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <strong>Address:</strong> {selected.address}
              </div>
              <div>
                <strong>Amount (RM):</strong> {selected.rm}
              </div>
              <div>
                <strong>OUMG:</strong> {selected.oumg}
              </div>
              <div>
                <strong>Created:</strong> {selected.created}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.03]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction("reject")}
                className="inline-flex items-center rounded-lg border border-red-300 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-700 shadow-theme-xs hover:bg-red-500/15 dark:border-red-800 dark:text-red-400"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction("approve")}
                className="inline-flex items-center rounded-lg border border-green-300 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-700 shadow-theme-xs hover:bg-green-500/15 dark:border-green-800 dark:text-green-400"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}