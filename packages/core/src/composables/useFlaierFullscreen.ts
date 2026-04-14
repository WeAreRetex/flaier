import { onUnmounted, ref, watch } from "vue";

export function useFlaierFullscreen() {
  const fullscreen = ref(false);
  let previousBodyOverflow = "";

  function closeFullscreen() {
    fullscreen.value = false;
  }

  function toggleFullscreen() {
    fullscreen.value = !fullscreen.value;
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    closeFullscreen();
  }

  watch(fullscreen, (active) => {
    if (typeof document === "undefined") return;

    if (active) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
      return;
    }

    document.body.style.overflow = previousBodyOverflow;
    document.removeEventListener("keydown", handleEscape);
  });

  onUnmounted(() => {
    if (typeof document === "undefined") return;

    document.body.style.overflow = previousBodyOverflow;
    document.removeEventListener("keydown", handleEscape);
  });

  return {
    fullscreen,
    closeFullscreen,
    toggleFullscreen,
  };
}
