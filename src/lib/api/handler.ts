import "server-only";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin, siteOrigin } from "@/lib/auth/security";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Action, encodeCursor, endpoints, queryObject, slug, uuid } from "./contracts";
import { BodyError, readJsonBody } from "./body";

import { enhanceSearch } from "@/lib/search/server";
import { eligibleBaseline } from "@/lib/search/eligibility";
import { organizationDisplayName } from "@/lib/organizations/display-name";
import { InventoryChanged } from "@/lib/search/service";

const responseHeaders = { "Cache-Control": "private, no-store" };
const failures: Record<string, { status: number; message: string }> = {
  VALIDATION_ERROR: { status: 400, message: "Check the submitted fields." },
  UNAUTHORIZED: { status: 401, message: "Sign in to continue." },
  FORBIDDEN: { status: 403, message: "This operation is not allowed." },
  NOT_FOUND: { status: 404, message: "Resource not found." },
  CONFLICT: { status: 409, message: "The resource changed or this operation conflicts with its current state." },
  RATE_LIMITED: { status: 429, message: "Too many requests. Please try again later." },
  UNAVAILABLE: { status: 503, message: "This service is temporarily unavailable. Please try again." },
};

export async function handleApi(request: NextRequest, action: Action, params: Record<string, string> = {}) {
  const requestId = randomUUID();
  const fail = (code: string, fields?: Record<string, string>) => {
    const { status, message } = failures[code] ?? failures.UNAVAILABLE;
    return NextResponse.json({ error: { code: failures[code] ? code : "UNAVAILABLE", message, ...(fields ? { fields } : {}), requestId } }, { status, headers: { ...responseHeaders, "X-Request-Id": requestId, ...(code === "RATE_LIMITED" ? { "Retry-After": "3600" } : {}) } });
  };
  try {
    const endpoint: { query: z.ZodType; body?: z.ZodType; authenticated: boolean; created?: boolean } = endpoints[action];
    if (["POST", "PATCH"].includes(request.method) && !isSameOrigin(request.headers.get("origin"), siteOrigin())) return fail("FORBIDDEN");
    if (params.orgSlug !== undefined) slug.parse(params.orgSlug);
    const targetId = params.itemId ?? params.claimId;
    if (targetId !== undefined) uuid.parse(targetId);
    let query;
    try { query = queryObject(request.nextUrl.searchParams); } catch { return fail("VALIDATION_ERROR"); }
    const payload = endpoint.query.parse(query) as Record<string, unknown>;
    if (endpoint.body) Object.assign(payload, endpoint.body.parse(await readJsonBody(request)));
    const client = await createSupabaseServerClient();
    if (!client) return fail("UNAVAILABLE");
    if (endpoint.authenticated) {
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) return fail(error && error.status && error.status >= 500 ? "UNAVAILABLE" : "UNAUTHORIZED");
    }
    const { data, error } = await client.rpc("backend_dispatch", { p_action: action, p_org_slug: params.orgSlug ?? null, p_id: targetId ?? null, p_payload: action === "search" ? {...payload, limit:50} : payload });
    if (error) {
      if (error.code === "P0001" && failures[error.message]) return fail(error.message);
      if (error.code === "23505") return fail("CONFLICT");
      if (["23503", "23514", "22P02"].includes(error.code)) return fail("VALIDATION_ERROR");
      return fail("UNAVAILABLE");
    }
    if (!data || typeof data !== "object" || !("data" in data)) return fail("UNAVAILABLE");
    if (data.page?.nextCursor) data.page.nextCursor = encodeCursor(data.page.nextCursor);
    let result = data;
    if (action === "organization") {
      result = { ...data, data: { ...data.data, name: organizationDisplayName(data.data) } };
    }
    if (action === "search") {
      try { result = await enhanceSearch(client, params.orgSlug, payload, data); }
      catch (error) {
        if (!(error instanceof InventoryChanged)) throw error;
        const fresh = await client.rpc("backend_dispatch", { p_action: action, p_org_slug: params.orgSlug, p_payload: {...payload, limit:50} });
        if (fresh.error || !Array.isArray(fresh.data?.data)) return fail("UNAVAILABLE");
        result = {...fresh.data, data: eligibleBaseline(fresh.data.data, String(payload.query), Number(payload.limit)), search:{mode:"structured",semanticStatus:"unavailable"}};
      }
    }
    return NextResponse.json(result, { status: endpoint.created ? 201 : 200, headers: { ...responseHeaders, "X-Request-Id": requestId } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of error.issues) { const path = issue.path.join(".") || "request"; fields[path] = "Invalid value."; }
      return fail("VALIDATION_ERROR", fields);
    }
    if (error instanceof BodyError) return NextResponse.json({ error: { code: error.code, message: error.message, requestId } }, { status: error.status, headers: { ...responseHeaders, "X-Request-Id": requestId } });
    return fail("UNAVAILABLE");
  }
}
