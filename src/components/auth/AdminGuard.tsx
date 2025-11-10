// src/components/auth/AdminGuard.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { readAdminSession } from "@/lib/adminAuth";

/**
 * Admin-only route guard.
 * - Checks localStorage session on mount, on window focus, and on 'storage' events.
 * - Redirects to "/signin" if no valid admin session.
 * - Renders null while deciding to avoid layout flashes.
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [allowed, setAllowed] = React.useState(false);

  const checkSession = React.useCallback(() => {
    const { isAdmin } = readAdminSession();
    if (isAdmin) {
      setAllowed(true);
      setReady(true);
    } else {
      setAllowed(false);
      setReady(true);
      router.replace("/admin/signin");
      router.refresh();
      // Last-resort hard redirect (covers rare caching edge-cases)
      setTimeout(() => {
        if (window.location.pathname !== "/admin/signin") {
          window.location.replace("/admin/signin");
        }
      }, 0);
    }
  }, [router]);

  React.useEffect(() => {
    // Initial check
    checkSession();

    // Re-check on focus (tab activated)
    const onFocus = () => checkSession();
    window.addEventListener("focus", onFocus);

    // Re-check when localStorage changes (even from other tabs)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ou_admin_session_v1") checkSession();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [checkSession]);

  if (!ready) return null;
  if (!allowed) return null;

  return <>{children}</>;
}