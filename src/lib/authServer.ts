// src/lib/authServer.ts
// Server-side admin check using cookies (App Router).
// Returns true if 'ou_admin=1' cookie is present.

import { cookies } from "next/headers";

export async function isAdminRequest(): Promise<boolean> {
  const jar = await cookies();
  const flag = jar.get("ou_admin")?.value;
  return flag === "1";
}