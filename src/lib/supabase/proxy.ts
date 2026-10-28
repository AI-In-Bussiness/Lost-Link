import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { publicSupabaseConfiguration, sessionCookieOptions } from './config';

export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = publicSupabaseConfiguration();
  if (!config) return response;
  const { url, key } = config;
  const client = createServerClient(url, key, {
    cookieOptions: sessionCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Refresh through Auth; no authorization decision relies on unverified getSession().
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
