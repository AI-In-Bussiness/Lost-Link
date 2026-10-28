import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabaseConfiguration, sessionCookieOptions } from './config';

export function supabaseConfiguration() {
  return publicSupabaseConfiguration();
}

export async function createSupabaseServerClient() {
  const config = supabaseConfiguration();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: sessionCookieOptions(),
    // Keep each signup/resend verifier separate so a later or throttled request
    // cannot replace the verifier needed by a link already in the user's inbox.
    auth: { experimental: { appendPkceFlowIdToRedirects: true } },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; route handlers handle refresh.
        }
      },
    },
  });
}
