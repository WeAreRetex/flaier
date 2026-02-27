import { computed, watch, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'

interface TimelineOptions {
  totalSteps: Ref<number>
  interval?: number
}

/**
 * Timeline playback controls.
 * Manages currentStep, playing state, and auto-advance logic.
 */
export function useTimeline(options: TimelineOptions) {
  const { totalSteps, interval = 3000 } = options

  const currentStep = ref(0)
  const playing = ref(false)

  let timer: ReturnType<typeof setInterval> | null = null

  function clearTimer() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  watch(playing, (isPlaying) => {
    clearTimer()
    if (isPlaying) {
      timer = setInterval(() => {
        if (currentStep.value < totalSteps.value - 1) {
          currentStep.value++
        } else {
          playing.value = false
        }
      }, interval)
    }
  })

  onUnmounted(clearTimer)

  const progress = computed(() =>
    totalSteps.value > 1
      ? currentStep.value / (totalSteps.value - 1)
      : 0,
  )

  return {
    currentStep,
    playing,
    totalSteps,
    progress,

    next() {
      if (currentStep.value < totalSteps.value - 1) {
        currentStep.value++
      }
    },
    prev() {
      if (currentStep.value > 0) {
        currentStep.value--
      }
    },
    goTo(step: number) {
      currentStep.value = Math.max(0, Math.min(step, totalSteps.value - 1))
    },
    togglePlay() {
      playing.value = !playing.value
    },
  }
}
