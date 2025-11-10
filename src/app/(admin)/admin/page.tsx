// src/app/(admin)/page.tsx
import type { Metadata } from "next";
import { isAdminRequest } from "@/lib/authServer";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient"; // your existing client dashboard

export const metadata: Metadata = {
  title: "Oureum Admin - Dashboard",
  description: "Oureum internal admin",
};

// This is a Server Component. It decides what to render before sending HTML.
// If not admin, we inline-render <SignInForm/> right on "/" with no client redirect.
export default async function Page() {
  const isAdmin = await isAdminRequest();
  if (!isAdmin) {
    redirect("/admin/signin");
  }
  return <DashboardClient />;
}