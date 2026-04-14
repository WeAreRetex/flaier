<template>
  <div class="docs-shell">
    <div class="docs-nav">
      <div class="docs-brand">
        <span class="docs-brand__mark"></span>
        <span>flow-narrator</span>
      </div>

      <div class="docs-nav__links">
        <span class="docs-pill docs-pill--primary">Slidev example</span>
        <span class="docs-pill">Docus styling</span>
      </div>
    </div>

    <div class="docs-grid docs-grid--hero">
      <section class="docs-card docs-card--hero">
        <div class="docs-aside">
          <p class="docs-eyebrow">Storytelling Slide 01</p>
          <h1 class="docs-title">When a support ticket turns into a system story</h1>
          <p class="docs-lede">
            This sample deck mirrors the polished Docus docs surface from <code>apps/docs</code>,
            but swaps static prose for a presentation flow: first the human story, then the
            architecture behind it.
          </p>
        </div>

        <div class="docs-chip-row">
          <span class="docs-chip">Three slides</span>
          <span class="docs-chip docs-chip--accent">Two narrative beats</span>
          <span class="docs-chip">One architecture flow</span>
        </div>
      </section>

      <aside class="docs-card docs-card--stack">
        <div class="docs-kpi">
          <div class="docs-kpi__value">08:45</div>
          <p class="docs-kpi__label">Support sees a rising cluster of checkout issues.</p>
        </div>

        <div class="docs-kpi">
          <div class="docs-kpi__value">09:10</div>
          <p class="docs-kpi__label">A runbook exists, but the routing path is still opaque.</p>
        </div>

        <div class="docs-kpi">
          <div class="docs-kpi__value">09:30</div>
          <p class="docs-kpi__label">
            The team decides to narrate the issue as a flow before changing code.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
