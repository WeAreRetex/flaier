import { onUnmounted, ref, type Ref } from "vue";

/**
 * Fullscreen controller. Prefers the native Fullscreen API on the provided
 * target element (true edge-to-edge, browser chrome hidden); falls back to a
 * fixed-position overlay when the API is unavailable (e.g. iOS Safari).
 */
export function useFlaierFullscreen(target?: Ref<HTMLElement | null>) {
  const fullscreen = ref(false);
  /** True when the fixed-overlay fallback is in use instead of the native API. */
  const fallbackActive = ref(false);
  let previousBodyOverflow = "";
  let listenersAttached = false;

  function nativeAvailable() {
    return (
      typeof document !== "undefined" &&
      Boolean(document.fullscreenEnabled) &&
      typeof target?.value?.requestFullscreen === "function"
    );
  }

  function handleFullscreenChange() {
    if (typeof document === "undefined") return;

    // Covers both our own exit calls and user-initiated exits (Esc, browser UI).
    if (!document.fullscreenElement && fullscreen.value && !fallbackActive.value) {
      fullscreen.value = false;
    }
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    closeFullscreen();
  }

  function attachListeners() {
    if (listenersAttached || typeof document === "undefined") return;
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    listenersAttached = true;
  }

  function lockBodyScroll(lock: boolean) {
    if (typeof document === "undefined") return;

    if (lock) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
      return;
    }

    document.body.style.overflow = previousBodyOverflow;
    document.removeEventListener("keydown", handleEscape);
  }

  async function openFullscreen() {
    attachListeners();

    if (nativeAvailable()) {
      try {
        await target!.value!.requestFullscreen();
        fallbackActive.value = false;
        fullscreen.value = true;
        return;
      } catch {
        // Permission denied or transient failure — use the overlay fallback.
      }
    }

    fallbackActive.value = true;
    fullscreen.value = true;
    lockBodyScroll(true);
  }

  function closeFullscreen() {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }

    if (fallbackActive.value) {
      lockBodyScroll(false);
    }

    fallbackActive.value = false;
    fullscreen.value = false;
  }

  function toggleFullscreen() {
    if (fullscreen.value) {
      closeFullscreen();
      return;
    }

    void openFullscreen();
  }

  onUnmounted(() => {
    if (typeof document === "undefined") return;

    if (fallbackActive.value) {
      lockBodyScroll(false);
    }

    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  });

  return {
    fullscreen,
    fallbackActive,
    closeFullscreen,
    toggleFullscreen,
  };
}
