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
      <div id="sign-in-errors" class="error-summary" role="alert" tabindex="-1" hidden></div>
      ${ctx.demoSignIn ? `<div class="actions"><button type="button" id="demo-student">Continue as demo student</button><button type="button" class="secondary" id="demo-staff">Continue as demo staff</button></div><p class="muted">Student preview: Avery. Staff preview: ${e(ctx.orgName || "Cedar Grove School")} office. Demo account selection does not grant real staff access.</p>` : "<p>Account sign-in is not connected in this interface preview.</p>"}
      <a href="${schoolPath(ctx.orgSlug)}/search">Back to school search</a></section>`,
    bind: (root) => {
      const signIn = async (kind: "student" | "staff", path: string) => {
        const buttons = [
          ...root.querySelectorAll<HTMLButtonElement>(
            "#demo-student, #demo-staff",
          ),
        ];
        buttons.forEach((button) => (button.disabled = true));
        try {
          await ctx.demoSignIn?.(kind, path);
        } catch {
          if (!root.isConnected) return;
          const box = root.querySelector<HTMLElement>("#sign-in-errors")!;
          box.textContent =
            "Sign-in is unavailable. Your item is still saved in this page’s return link. Try again.";
          box.hidden = false;
          box.focus();
        } finally {
          buttons.forEach((button) => (button.disabled = false));
        }
      };
      root
        .querySelector("#demo-student")
        ?.addEventListener("click", () => void signIn("student", returnTo));
      root
        .querySelector("#demo-staff")
        ?.addEventListener(
          "click",
          () =>
            void signIn(
              "staff",
              requested ? returnTo : schoolPath(ctx.orgSlug) + "/staff",
            ),
        );
    },
  };
}
