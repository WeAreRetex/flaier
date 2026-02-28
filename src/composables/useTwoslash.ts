import type { HighlighterCore } from 'shiki'

type TwoslashCoreModule = typeof import('@shikijs/twoslash/core')
type TwoslashCdnModule = typeof import('twoslash-cdn')

type SupportedTwoslashLanguage = 'ts' | 'tsx'

const TWOSLASH_HINT_PATTERN = /(?:\^\?|\^\||@errors\b|@log\b|@warn\b|@annotate\b|@include\b)/m
const TWOSLASH_LANGUAGE_ALIASES: Record<string, SupportedTwoslashLanguage> = {
  ts: 'ts',
  typescript: 'ts',
  tsx: 'tsx',
}

interface TwoslashRuntime {
  createTransformerFactory: TwoslashCoreModule['createTransformerFactory']
  rendererRich: TwoslashCoreModule['rendererRich']
  runtime: ReturnType<TwoslashCdnModule['createTwoslashFromCDN']>
}

export interface TwoslashRenderInput {
  highlighter: HighlighterCore
  code: string
  language?: string
  theme: string
}

let twoslashRuntimePromise: Promise<TwoslashRuntime> | null = null

const twoslashHtmlCache = new Map<string, string>()
const twoslashInFlight = new Map<string, Promise<string>>()

export function hasTwoslashHints(code: string) {
  return TWOSLASH_HINT_PATTERN.test(code)
}

export function normalizeTwoslashLanguage(language?: string): SupportedTwoslashLanguage | null {
  const normalized = (language ?? 'typescript').trim().toLowerCase()
  return TWOSLASH_LANGUAGE_ALIASES[normalized] ?? null
}

export async function renderTwoslashHtml({
  highlighter,
  code,
  language,
  theme,
}: TwoslashRenderInput) {
  const normalizedLanguage = normalizeTwoslashLanguage(language)
  if (!normalizedLanguage) {
    throw new Error(`Twoslash is supported only for TypeScript/TSX snippets. Received language: "${language ?? 'typescript'}".`)
  }

  const cacheKey = [theme, normalizedLanguage, code].join('\u0000')
  const cached = twoslashHtmlCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const pending = twoslashInFlight.get(cacheKey)
  if (pending) {
    return pending
  }

  const request = renderTwoslashHtmlUncached({
    highlighter,
    code,
    language: normalizedLanguage,
    theme,
  })

  twoslashInFlight.set(cacheKey, request)

  try {
    const html = await request
    twoslashHtmlCache.set(cacheKey, html)
    return html
  } finally {
    twoslashInFlight.delete(cacheKey)
  }
}

async function renderTwoslashHtmlUncached({
  highlighter,
  code,
  language,
  theme,
}: {
  highlighter: HighlighterCore
  code: string
  language: SupportedTwoslashLanguage
  theme: string
}) {
  const twoslash = await getTwoslashRuntime()

  await twoslash.runtime.prepareTypes(code)

  const transformerTwoslash = twoslash.createTransformerFactory(
    twoslash.runtime.runSync,
    twoslash.rendererRich(),
  )({
    throws: false,
    langs: [language],
    filter: () => true,
  })

  return highlighter.codeToHtml(code, {
    lang: language,
    theme,
    transformers: [transformerTwoslash],
  })
}

async function getTwoslashRuntime() {
  if (!twoslashRuntimePromise) {
    twoslashRuntimePromise = Promise.all([
      import('@shikijs/twoslash/core'),
      import('twoslash-cdn'),
    ]).then(([twoslashCore, twoslashCdn]) => ({
      createTransformerFactory: twoslashCore.createTransformerFactory,
      rendererRich: twoslashCore.rendererRich,
      runtime: twoslashCdn.createTwoslashFromCDN({
        compilerOptions: {
          lib: ['esnext', 'dom', 'dom.iterable'],
        },
      }),
    }))
  }

  return twoslashRuntimePromise
}
