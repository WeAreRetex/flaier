<script setup lang="ts">
import { FlowNarrator } from '../src'

const source = './flow-specs/manifest.json'
</script>

<template>
  <div style="width: 100vw; height: 100vh; display: grid; position: relative;" class="h-screen w-screen bg-background">
    <FlowNarrator :src="source" :interval="3500" />
  </div>
</template>
