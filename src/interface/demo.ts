/** DEVELOPMENT ENTRY ONLY. The application module never imports this composition root. */
import {
  createEmptyMockStore,
  createMockApi,
  createMockStore,
} from "../mocks/client.ts";
import type { Persona } from "../mocks/contracts.ts";
import type { Session } from "./types.ts";
import { demoSignInView } from "./demo-signin.ts";
import { mountLostLink } from "./app.ts";

const host = location.hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(host))
  throw new Error("Mock preview is local only.");
let store = createMockStore();
let persona: Persona = "anonymous";
let scenario = "normal";
const personas = document.querySelector<HTMLSelectElement>("#demo-persona")!;
const scenarios = document.querySelector<HTMLSelectElement>("#demo-scenario")!;
const session = (): Session | null =>
  persona === "anonymous"
    ? null
    : {
        name:
          persona === "student"
            ? "Avery"
            : persona === "otherStudent"
              ? "Jordan"
              : "School staff",
        email:
          persona === "otherStudent"
            ? "jordan@example.invalid"
            : "avery@example.invalid",
        staffOrgSlugs:
          persona === "staff"
            ? ["cedar-grove"]
            : persona === "otherStaff"
              ? ["maple-hill"]
              : [],
      };
const app = mountLostLink(document.querySelector<HTMLElement>("#app")!, {
  signInView: demoSignInView,
  getApi: () =>
    createMockApi(store, {
      persona,
      latencyMs: scenario === "slow" ? 1800 : 120,
      aiUnavailable: scenario === "aiUnavailable",
      ...(scenario === "network" || scenario === "rateLimit"
        ? { failure: scenario }
        : {}),
    }),
  getSession: session,
  signOut: () => {
    persona = "anonymous";
    personas.value = persona;
  },
  demoSignIn: (kind, returnTo) => {
    persona = kind;
    personas.value = kind;
    app.navigate(returnTo);
  },
});
personas.addEventListener("change", () => {
  persona = personas.value as Persona;
  app.refresh();
});
scenarios.addEventListener("change", () => {
  const wasEmpty = scenario === "empty";
  scenario = scenarios.value;
  if (scenario === "empty") store = createEmptyMockStore();
  else if (wasEmpty) store = createMockStore();
  app.refresh();
});
document.querySelector("#demo-reset")!.addEventListener("click", () => {
  store = createMockStore();
  scenario = "normal";
  scenarios.value = scenario;
  app.refresh();
});
