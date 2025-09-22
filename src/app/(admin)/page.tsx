import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Oureum Admin - Dashboard",
  description: "Oureum internal admin",
};

export default function Page() {
  return <DashboardClient />;
}