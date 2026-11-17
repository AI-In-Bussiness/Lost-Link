/** Progressive, CSP-safe motion. No inline styles, animation library, or storage. */
export interface MotionPreference {
  paused: boolean;
}

export function bindPageMotion(
  root: HTMLElement,
  preference: MotionPreference,
): () => void {
  const page = root.querySelector<HTMLElement>("main");
  const toggle = root.querySelector<HTMLButtonElement>(".motion-toggle");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const scenes = [...root.querySelectorAll<HTMLElement>(".paper-scene")];
  const reveals = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
  let observer: IntersectionObserver | undefined;
  let disposed = false;

  const active = () => !preference.paused && !reduced.matches;
  const resetTilt = () => {
    for (const scene of scenes) scene.dataset.tilt = "center";
  };
  const showAll = () => {
    for (const reveal of reveals) reveal.classList.add("is-visible");
  };
  const update = () => {
    observer?.disconnect();
    observer = undefined;
    const enabled = active();
    document.documentElement.dataset.motion = enabled ? "active" : "paused";
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
    if (!enabled || !("IntersectionObserver" in window)) {
      page?.classList.remove("motion-ready");
      showAll();
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (disposed) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    page?.classList.add("motion-ready");
    for (const reveal of reveals) {
      if (!reveal.classList.contains("is-visible")) observer.observe(reveal);
    }
  };
  const onToggle = () => {
    preference.paused = !preference.paused;
    update();
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
  // An element reached by keyboard must be visible before the observer runs.
  const onFocus = (event: FocusEvent) => {
    let element = event.target instanceof Element ? event.target : null;
    while (element && root.contains(element)) {
      if (element.hasAttribute("data-reveal"))
        element.classList.add("is-visible");
      element = element.parentElement;
    }
  };
  toggle?.addEventListener("click", onToggle);
  reduced.addEventListener("change", update);
  pointer.addEventListener("change", resetTilt);
  root.addEventListener("focusin", onFocus);
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
    for (const scene of scenes) {
      scene.removeEventListener("pointermove", onPointer);
      scene.removeEventListener("pointerleave", resetTilt);
    }
    page?.classList.remove("motion-ready");
    resetTilt();
    delete document.documentElement.dataset.motion;
  };
}
