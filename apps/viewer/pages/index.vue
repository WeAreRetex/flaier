<script setup lang="ts">
import { computed, ref } from "vue";

interface ViewerManifestFlow {
  id: string;
  title?: string;
  description?: string;
  src: string;
}

interface ViewerManifest {
  version?: number;
  defaultFlowId?: string;
  flows: ViewerManifestFlow[];
}

const reloadToken = ref(0);
const manifestSource = computed(() => `/api/flows/manifest?reload=${reloadToken.value}`);

const {
  data: manifest,
  pending,
  error,
  refresh,
} = await useFetch<ViewerManifest>(() => manifestSource.value);

const flowCount = computed(() => manifest.value?.flows?.length ?? 0);

function reloadFromDisk() {
  reloadToken.value += 1;
  void refresh();
}
</script>

<template>
  <div class="viewer-page">
    <header class="viewer-header">
      <div>
        <p class="kicker">Flow Narrator Viewer Layer</p>
        <h1 class="title">Local Spec Explorer</h1>
        <p class="subtitle">
          {{ flowCount }} flow{{ flowCount === 1 ? "" : "s" }} discovered from disk.
        </p>
      </div>

      <button class="reload-button" type="button" :disabled="pending" @click="reloadFromDisk">
        {{ pending ? "Reloading..." : "Reload from Disk" }}
      </button>
    </header>

    <main class="viewer-main">
      <div v-if="error" class="status-card status-error">
        {{ error.message }}
      </div>

      <div v-else-if="pending && flowCount === 0" class="status-card">
        Loading local flow manifest...
      </div>

      <FlowNarratorMdc v-else :src="manifestSource" :interval="3200" />
    </main>
  </div>
</template>

<style scoped>
.viewer-page {
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 100vh;
  background: radial-gradient(circle at 20% 0%, #1e293b 0%, #0b1120 50%, #050913 100%);
  color: #e2e8f0;
}

.viewer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem 0.75rem;
}

.kicker {
  margin: 0;
  color: #94a3b8;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.title {
  margin: 0.25rem 0 0;
  font-size: 1.25rem;
  line-height: 1.1;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #94a3b8;
  font-size: 0.82rem;
}

.reload-button {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
  border-radius: 0.6rem;
  font-size: 0.8rem;
  padding: 0.55rem 0.75rem;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.reload-button:hover:not(:disabled) {
  border-color: rgba(125, 211, 252, 0.7);
  background: rgba(15, 23, 42, 0.95);
}

.reload-button:disabled {
  cursor: default;
  opacity: 0.65;
}

.viewer-main {
  min-height: 0;
  padding: 0 0.75rem 0.75rem;
}

.status-card {
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 0.9rem;
  background: rgba(15, 23, 42, 0.7);
  padding: 1rem;
}

.status-error {
  border-color: rgba(248, 113, 113, 0.6);
  color: #fecaca;
}
</style>
