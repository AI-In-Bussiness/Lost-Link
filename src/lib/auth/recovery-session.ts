import "server-only";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "../supabase/server";
import { readRecoveryGrant, recoveryCookie } from "./recovery";

export async function getRecoverySession() {
  const client = await createSupabaseServerClient();
  if (!client) return null;
  // Never trust getSession's cookie user alone. Verify identity with Auth first.
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session || session.user.id !== user.id) return null;
  const grant = readRecoveryGrant((await cookies()).get(recoveryCookie)?.value, session);
  return grant ? { client, next: grant.next } : null;
}
