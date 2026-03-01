import type { HighlighterCore } from 'shiki'

type TwoslashCoreModule = typeof import('@shikijs/twoslash/core')
type TwoslashCdnModule = typeof import('twoslash-cdn')
type FetchInput = Parameters<typeof fetch>[0]
type FetchInit = Parameters<typeof fetch>[1]
type TwoslashFetcher = (input: FetchInput, init?: FetchInit) => Promise<Response>

type SupportedTwoslashLanguage = 'ts' | 'tsx'

interface TypeScriptFileTreeEntry {
  name?: string
}

interface TypeScriptFileTree {
  files?: TypeScriptFileTreeEntry[]
}

const TWOSLASH_HINT_PATTERN = /(?:\^\?|\^\||@errors\b|@log\b|@warn\b|@annotate\b|@include\b)/m
const TWOSLASH_LANGUAGE_ALIASES: Record<string, SupportedTwoslashLanguage> = {
  ts: 'ts',
  typescript: 'ts',
  tsx: 'tsx',
}
const PLAYGROUND_TYPESCRIPT_LIB_HOST = 'playgroundcdn.typescriptlang.org'
const PLAYGROUND_TYPESCRIPT_LIB_PATH_PATTERN = /^\/cdn\/([^/]+)\/typescript\/lib\/(.+)$/
const JSDELIVR_TYPESCRIPT_LIB_BASE_URL = 'https://cdn.jsdelivr.net/npm/typescript@'
const JSDELIVR_TYPESCRIPT_FILE_TREE_API_BASE_URL = 'https://data.jsdelivr.com/v1/package/npm/typescript@'

const typeScriptLibsByVersion = new Map<string, Promise<Set<string> | null>>()

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
    const twoslashFetcher = createTwoslashCdnFetcher(fetch)

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
        fetcher: twoslashFetcher as typeof fetch,
      }),
    }))
  }

  return twoslashRuntimePromise
}

function createTwoslashCdnFetcher(nativeFetch: typeof fetch): TwoslashFetcher {
  return async (input, init) => {
    const libRequest = parsePlaygroundTypeScriptLibRequest(input)
    if (!libRequest) {
      return nativeFetch(input, init)
    }

    const knownLibs = await getTypeScriptLibFileSet(libRequest.version, nativeFetch)
    if (knownLibs && !knownLibs.has(libRequest.fileName)) {
      return emptyTypeScriptLibResponse()
    }

    const jsdelivrUrl = `${JSDELIVR_TYPESCRIPT_LIB_BASE_URL}${libRequest.version}/lib/${libRequest.fileName}`
    const response = await nativeFetch(jsdelivrUrl, init)
    if (response.ok) {
      return response
    }

    if (knownLibs) {
      return emptyTypeScriptLibResponse()
    }

    return response
  }
}

function parsePlaygroundTypeScriptLibRequest(input: FetchInput) {
  const requestUrl = getRequestUrl(input)
  if (!requestUrl) {
    return null
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(requestUrl)
  } catch {
    return null
  }

  if (parsedUrl.hostname !== PLAYGROUND_TYPESCRIPT_LIB_HOST) {
    return null
  }

  const match = parsedUrl.pathname.match(PLAYGROUND_TYPESCRIPT_LIB_PATH_PATTERN)
  if (!match) {
    return null
  }

  const version = match[1]
  const fileName = match[2]
  if (!version || !fileName) {
    return null
  }

  return {
    version,
    fileName: decodeURIComponent(fileName),
  }
}

function getRequestUrl(input: FetchInput) {
  if (typeof input === 'string') {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url
  }

  return null
}

async function getTypeScriptLibFileSet(version: string, fetcher: typeof fetch) {
  let pending = typeScriptLibsByVersion.get(version)
  if (!pending) {
    pending = fetcher(`${JSDELIVR_TYPESCRIPT_FILE_TREE_API_BASE_URL}${version}/flat`, {
      cache: 'force-cache',
    })
      .then(async (response) => {
        if (!response.ok) {
          return null
        }

        const payload = (await response.json()) as TypeScriptFileTree
        const files = payload.files ?? []
        const knownLibs = new Set<string>()

        for (const file of files) {
          if (!file.name || !file.name.startsWith('/lib/')) {
            continue
          }

          knownLibs.add(file.name.slice('/lib/'.length))
        }

        return knownLibs
      })
      .catch(() => null)

    typeScriptLibsByVersion.set(version, pending)
  }

  return pending
}

function emptyTypeScriptLibResponse() {
  return new Response('', {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
    },
  })
}
