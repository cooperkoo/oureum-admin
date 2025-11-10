"use client";

import React from "react";
import { useRouter } from "next/navigation";
import SignInForm from "@/components/auth/SignInForm";
import { readAdminSession } from "@/lib/adminAuth";

/**
 * Admin Sign-in Page (Client Component)
 *
 * Behavior:
 * - On mount, checks if there is an existing admin session stored in localStorage.
 * - If a valid admin session exists, the user is immediately redirected
 *   to the dashboard route ("/" or "/admin", depending on your setup).
 * - If no valid session exists, the SignInForm (MetaMask login) is displayed.
 */
export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    // Read the admin session (if any) from localStorage.
    const { isAdmin } = readAdminSession();

    if (isAdmin) {
      // Already logged in → redirect to dashboard.
      // If your dashboard is located at /admin, change to router.replace("/admin").
      router.replace("/admin");
    } else {
      // No session → allow page to show login form.
      setChecked(true);
    }
  }, [router]);

  // Avoid flashing blank page before session check finishes.
  if (!checked) return null;

  // Show MetaMask login form when not authenticated.
  return <SignInForm />;
}