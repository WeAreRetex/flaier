<template>
  <div class="docs-shell">
    <div class="docs-nav">
      <div class="docs-brand">
        <span class="docs-brand__mark"></span>
        <span>Flaier</span>
      </div>

      <div class="docs-nav__links">
        <span class="docs-pill">Storytelling slide 02</span>
      </div>
    </div>

    <div class="docs-grid docs-grid--story">
      <section class="docs-card docs-card--story">
        <div class="docs-aside">
          <p class="docs-eyebrow">Story Beat</p>
          <h2 class="docs-section-title">
            The system becomes easier to reason about when each handoff gets a voice
          </h2>
          <p class="docs-lede">
            Instead of jumping straight into logs, the team writes the journey down as a sequence of
            actors, decisions, and side effects. That single shift turns a vague incident into an
            explainable shape.
          </p>
        </div>

        <div class="docs-story-list">
          <div class="docs-step">
            <div class="docs-step__number">1</div>
            <div>
              <div class="docs-step__title">Capture the symptom</div>
              <p class="docs-step__body">
                Support records what the customer saw, what changed, and which path felt slow or
                wrong.
              </p>
            </div>
          </div>

          <div class="docs-step">
            <div class="docs-step__number">2</div>
            <div>
              <div class="docs-step__title">Name the boundary</div>
              <p class="docs-step__body">
                The team marks where the story crosses from UI, to API, to async work, to durable
                state.
              </p>
            </div>
          </div>

          <div class="docs-step">
            <div class="docs-step__number">3</div>
            <div>
              <div class="docs-step__title">Turn the story into a reusable artifact</div>
              <p class="docs-step__body">
                Now the same narrative can become docs, a live demo, or an architecture review slide
                without rewriting it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <aside class="docs-card docs-card--story-side">
        <p class="docs-caption">Spec fragment</p>
        <pre class="docs-code"><code>{
  "title": "Support Story",
  "mode": "narrative",
  "beats": [
    "symptom",
    "handoff",
    "decision",
    "follow-up"
  ]
}</code></pre>

        <p class="docs-note">
          The key idea is not the JSON shape. It is the discipline of giving the story a stable form
          so it can survive handoffs between support, product, and engineering.
        </p>

        <ul class="docs-list">
          <li>
            Story-first explanations match the tone of the docs site, but work better for live
            walkthroughs.
          </li>
          <li>
            Each step can later map to a node, transition, and owner without losing the original
            narrative.
          </li>
          <li>
            The final architecture slide keeps the same visual system, so the deck feels like an
            extension of the docs.
          </li>
        </ul>
      </aside>
    </div>
  </div>
</template>
