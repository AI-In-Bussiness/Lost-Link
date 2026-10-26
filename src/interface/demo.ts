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
import { createDemoPhotos } from "./demo-photos.ts";
const localPhotos = createDemoPhotos();
window.addEventListener("beforeunload", () => localPhotos.reset());

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
    localPhotos.wrap(
      createMockApi(store, {
        persona,
        latencyMs: scenario === "slow" ? 1800 : 120,
        aiUnavailable: scenario === "aiUnavailable",
        ...(scenario === "network" || scenario === "rateLimit"
          ? { failure: scenario }
          : {}),
      }),
    ),
  photoUpload: localPhotos.service,
  getSession: session,
  signOut: () => {
    persona = "anonymous";
    personas.value = persona;
  },
  demoSignIn: (kind, returnTo) => {
    if (scenario === "network" || scenario === "rateLimit")
      throw new Error("Demo sign-in unavailable");
    persona =
      kind === "staff" && returnTo.startsWith("/o/maple-hill/")
        ? "otherStaff"
        : kind;
    personas.value = persona;
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
  if (scenario === "empty") {
    localPhotos.reset();
    store = createEmptyMockStore();
  } else if (wasEmpty) {
    localPhotos.reset();
    store = createMockStore();
  }
  app.refresh();
});
document.querySelector("#demo-reset")!.addEventListener("click", () => {
  localPhotos.reset();
  store = createMockStore();
  scenario = "normal";
  scenarios.value = scenario;
  app.refresh();
});
