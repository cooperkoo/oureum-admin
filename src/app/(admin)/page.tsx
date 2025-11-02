import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";
import AdminGuard from "@/components/auth/AdminGuard";

export const metadata: Metadata = {
  title: "Oureum Admin - Dashboard",
  description: "Oureum internal admin",
};

export default function Page() {
  return (
    <AdminGuard>
      <DashboardClient />
    </AdminGuard>
  );
}