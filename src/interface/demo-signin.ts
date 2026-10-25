import type { View, ViewContext } from "./types.ts";
import { e, safeReturnPath, schoolPath } from "./shared.ts";

export function demoSignInView(ctx: ViewContext): View {
  const requested = ctx.url.searchParams.get("returnTo");
  const returnTo = safeReturnPath(requested);
  return {
    title: "Sign in",
    html: `<section class="page-heading"><p class="eyebrow">Your belongings, safely returned</p><h1>Pick up where you left off.</h1><p>Sign in to send a private claim and follow its progress.</p></section>
      <section class="card stack"><h2>Interactive preview</h2><p class="notice">These fictional demo accounts let you explore the workflow. No password or real account is used.</p>
      ${ctx.session ? `<p>Current preview account: <strong>${e(ctx.session.name)}</strong>.</p><a class="button" href="${e(returnTo)}">Continue</a>` : ""}
      ${ctx.demoSignIn ? `<div class="actions"><button type="button" id="demo-student">Continue as demo student</button><button type="button" class="secondary" id="demo-staff">Continue as demo staff</button></div><p class="muted">Student preview: Avery. Staff preview: Cedar Grove front office. Demo account selection does not grant real staff access.</p>` : "<p>Account sign-in is not connected in this interface preview.</p>"}
      <a href="${schoolPath(ctx.orgSlug)}/search">Back to school search</a></section>`,
    bind: (root) => {
      root
        .querySelector("#demo-student")
        ?.addEventListener("click", () =>
          ctx.demoSignIn?.("student", returnTo),
        );
      root
        .querySelector("#demo-staff")
        ?.addEventListener("click", () =>
          ctx.demoSignIn?.(
            "staff",
            requested ? returnTo : schoolPath(ctx.orgSlug) + "/staff",
          ),
        );
    },
  };
}
