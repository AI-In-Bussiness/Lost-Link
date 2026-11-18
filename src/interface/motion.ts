/** Shared, progressively enhanced motion for mounted and native page shells. */
export interface MotionPreference {
  paused: boolean;
}

const preferenceKey = "lostlink:motion-paused";
const sharedPreference: MotionPreference = { paused: false };
const bindings = new Map<symbol, () => void>();
let preferenceLoaded = false;
let currentOwner: symbol | undefined;

/** Store only the user's tab-scoped animation choice, never page or form data. */
export function getMotionPreference(): MotionPreference {
  if (!preferenceLoaded && typeof window !== "undefined") {
    preferenceLoaded = true;
    try {
      sharedPreference.paused =
        sessionStorage.getItem(preferenceKey) === "true";
    } catch {
      // Storage restrictions must not prevent navigation or motion controls.
    }
  }
  return sharedPreference;
}

function savePreference(preference: MotionPreference) {
  try {
    if (preference.paused) sessionStorage.setItem(preferenceKey, "true");
    else sessionStorage.removeItem(preferenceKey);
  } catch {
    // The in-memory preference still works when storage is unavailable.
  }
}

export function bindPageMotion(
  root: HTMLElement,
  preference: MotionPreference = getMotionPreference(),
): () => void {
  const owner = Symbol("paper-motion");
  const page = root.querySelector<HTMLElement>("main");
  const toggle = root.querySelector<HTMLButtonElement>(".motion-toggle");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const scenes = [...root.querySelectorAll<HTMLElement>(".paper-scene")];
  const sceneElements = new Set<Element>(scenes);
  const reveals = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
  let observer: IntersectionObserver | undefined;
  let disposed = false;
  let firstUpdate = true;

  const active = () => !preference.paused && !reduced.matches;
  const resetTilt = () => {
    for (const scene of scenes) scene.dataset.tilt = "center";
  };
  const showAll = () => {
    for (const reveal of reveals) reveal.classList.add("is-visible");
  };
  const update = () => {
    if (disposed) return;
    observer?.disconnect();
    observer = undefined;
    const enabled = active();
    if (currentOwner === owner) {
      document.documentElement.dataset.motion = enabled ? "active" : "paused";
    }
    root.classList.add("motion-bound");
    root.classList.toggle("motion-enabled", enabled);
    if (firstUpdate && enabled) page?.classList.add("page-enter");
    if (!enabled) page?.classList.remove("page-enter");
    firstUpdate = false;
    if (toggle) {
      toggle.hidden = false;
      toggle.disabled = reduced.matches;
      toggle.setAttribute("aria-pressed", String(!enabled));
      toggle.textContent = reduced.matches
        ? "Motion reduced"
        : preference.paused
          ? "Resume animations"
          : "Pause animations";
      toggle.title = reduced.matches
        ? "Animations are paused by your device’s reduced motion preference."
        : "Control decorative animation on LostLink.";
    }
    resetTilt();
    if (!enabled || typeof IntersectionObserver === "undefined") {
      page?.classList.remove("motion-ready");
      showAll();
      for (const scene of scenes) {
        scene.classList.toggle("is-in-view", enabled);
      }
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (disposed) return;
        for (const entry of entries) {
          if (sceneElements.has(entry.target)) {
            entry.target.classList.toggle("is-in-view", entry.isIntersecting);
            continue;
          }
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    page?.classList.add("motion-ready");
    for (const scene of scenes) observer.observe(scene);
    for (const reveal of reveals) {
      if (!reveal.classList.contains("is-visible")) observer.observe(reveal);
    }
  };
  const onToggle = () => {
    preference.paused = !preference.paused;
    savePreference(preference);
    for (const sync of bindings.values()) sync();
  };
  const onPointer = (event: PointerEvent) => {
    if (!active() || !pointer.matches || event.pointerType === "touch") return;
    const scene = event.currentTarget as HTMLElement;
    const bounds = scene.getBoundingClientRect();
    const position = (event.clientX - bounds.left) / bounds.width;
    const direction =
      position < 0.38 ? "left" : position > 0.62 ? "right" : "center";
    if (scene.dataset.tilt !== direction) scene.dataset.tilt = direction;
  };
  // Keyboard and anchor targets remain readable while a reveal is settling.
  const onFocus = (event: FocusEvent) => {
    let element = event.target instanceof Element ? event.target : null;
    while (element && root.contains(element)) {
      if (element.hasAttribute("data-reveal"))
        element.classList.add("is-visible");
      element = element.parentElement;
    }
  };
  const onEntered = (event: AnimationEvent) => {
    if (event.animationName === "ink-arrive")
      page?.classList.remove("page-enter");
  };
  bindings.set(owner, update);
  currentOwner = owner;
  toggle?.addEventListener("click", onToggle);
  reduced.addEventListener("change", update);
  pointer.addEventListener("change", resetTilt);
  root.addEventListener("focusin", onFocus);
  page?.addEventListener("animationend", onEntered);
  for (const scene of scenes) {
    scene.addEventListener("pointermove", onPointer);
    scene.addEventListener("pointerleave", resetTilt);
  }
  update();
  return () => {
    disposed = true;
    observer?.disconnect();
    toggle?.removeEventListener("click", onToggle);
    reduced.removeEventListener("change", update);
    pointer.removeEventListener("change", resetTilt);
    root.removeEventListener("focusin", onFocus);
    page?.removeEventListener("animationend", onEntered);
    for (const scene of scenes) {
      scene.removeEventListener("pointermove", onPointer);
      scene.removeEventListener("pointerleave", resetTilt);
      scene.classList.remove("is-in-view");
    }
    page?.classList.remove("motion-ready", "page-enter");
    root.classList.remove("motion-bound", "motion-enabled");
    resetTilt();
    bindings.delete(owner);
    // An older React shell can finish teardown after its replacement mounts.
    if (currentOwner === owner) {
      currentOwner = [...bindings.keys()].at(-1);
      if (currentOwner) bindings.get(currentOwner)?.();
      else delete document.documentElement.dataset.motion;
    }
  };
}
