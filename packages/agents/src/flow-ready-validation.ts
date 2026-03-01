import type { FlowElement, FlowSpec } from './shared'
import { isObject } from './shared'

export interface FlowReadinessResult {
  errors: string[]
  warnings: string[]
}

const FLOW_COMPONENT_TYPES = new Set([
  'FlowTimeline',
  'ArchitectureNode',
  'TriggerNode',
  'CodeNode',
  'DecisionNode',
  'PayloadNode',
  'ErrorNode',
  'DescriptionNode',
  'LinkNode',
])

const TWOSLASH_SUPPORTED_LANGUAGES = new Set(['typescript', 'ts', 'tsx'])
const TWOSLASH_HINT_PATTERN = /(?:\^\?|\^\||@errors\b|@log\b|@warn\b|@annotate\b|@include\b)/m
const TWOSLASH_AMBIENT_GLOBAL_CANDIDATES = [
  'WeakRef',
  'FinalizationRegistry',
  'DisposableStack',
  'AsyncDisposableStack',
  'SuppressedError',
] as const
const EDGE_TRANSITION_KINDS = new Set([
  'default',
  'success',
  'error',
  'warning',
  'retry',
  'async',
])
const ARCHITECTURE_NODE_KINDS = ['service', 'database', 'queue', 'cache', 'gateway', 'external', 'compute']

interface NormalizedTransition {
  to: string
  label?: string
  description?: string
  kind?: string
}

export function validateFlowNarratorReadiness(spec: FlowSpec): FlowReadinessResult {
  const errors: string[] = []
  const warnings: string[] = []
  const entries = Object.entries(spec.elements)

  if (entries.length === 0) {
    errors.push('Spec has no elements.')
    return { errors, warnings }
  }

  const root = spec.elements[spec.root]
  if (!isFlowElement(root)) {
    errors.push(`Root element "${spec.root}" does not exist or has an invalid shape.`)
    return { errors, warnings }
  }

  if (root.type !== 'FlowTimeline') {
    errors.push(`Root element "${spec.root}" must be type "FlowTimeline".`)
  }

  const rootMode = getFlowTimelineMode(root)

  const elementKeys = new Set(entries.map(([key]) => key))
  const childrenByKey = new Map<string, string[]>()
  const incomingCount = new Map<string, number>()

  for (const [key] of entries) {
    incomingCount.set(key, 0)
  }

  for (const [key, rawElement] of entries) {
    if (!isFlowElement(rawElement)) {
      errors.push(`Element "${key}" must include string type, object props, and optional children array.`)
      continue
    }

    const element = rawElement

    if (!FLOW_COMPONENT_TYPES.has(element.type)) {
      errors.push(`Element "${key}" has unsupported type "${element.type}".`)
    }

    if (key !== spec.root && element.type === 'FlowTimeline') {
      errors.push(`Element "${key}" is FlowTimeline but only the root element can be FlowTimeline.`)
    }

    validateElementProps(key, element, errors, warnings)

    const children = normalizeChildren(key, element.children, spec.root, elementKeys, errors)
    const transitions = normalizeTransitions(
      key,
      element.props.transitions,
      spec.root,
      elementKeys,
      errors,
      warnings,
    )
    const outgoing = mergeOutgoingTargets(children, transitions.map((transition) => transition.to))

    childrenByKey.set(key, outgoing)

    for (const child of outgoing) {
      incomingCount.set(child, (incomingCount.get(child) ?? 0) + 1)
    }
  }

  const rootChildren = childrenByKey.get(spec.root) ?? []
  if (rootChildren.length === 0) {
    warnings.push('Root FlowTimeline has no children, so no node timeline can be traversed.')
  }

  if (rootMode === 'architecture') {
    const architectureNodeCount = entries
      .filter(([key, element]) => key !== spec.root && isFlowElement(element) && element.type === 'ArchitectureNode')
      .length

    if (architectureNodeCount === 0) {
      warnings.push('FlowTimeline mode="architecture" has no ArchitectureNode elements; add architecture components for clearer infrastructure storytelling.')
    }
  }

  const reachable = new Set<string>()
  const queue = [...rootChildren]

  while (queue.length > 0) {
    const nodeKey = queue.shift()
    if (!nodeKey || reachable.has(nodeKey)) continue
    reachable.add(nodeKey)

    for (const child of childrenByKey.get(nodeKey) ?? []) {
      if (!reachable.has(child)) {
        queue.push(child)
      }
    }
  }

  for (const [key] of entries) {
    if (key === spec.root) continue

    if (!reachable.has(key)) {
      warnings.push(`Element "${key}" is unreachable from root children.`)
    }

    const incoming = incomingCount.get(key) ?? 0
    if (incoming === 0 && !rootChildren.includes(key)) {
      warnings.push(`Element "${key}" has no incoming edge and is not listed as a root child.`)
    }
  }

  validateStateShape(spec.state, errors, warnings)

  return { errors, warnings }
}

function validateElementProps(
  key: string,
  element: FlowElement,
  errors: string[],
  warnings: string[],
) {
  if (!isObject(element.props)) {
    errors.push(`Element "${key}" props must be an object.`)
    return
  }

  const props = element.props

  if (element.type !== 'FlowTimeline') {
    validateSourceAnchorProp(key, props.sourceAnchor, errors, warnings)
  }

  switch (element.type) {
    case 'FlowTimeline': {
      expectRequiredString(props, 'title', key, errors)
      expectOptionalString(props, 'description', key, errors)
      expectOptionalEnum(props, 'mode', ['narrative', 'architecture'], key, errors)
      expectOptionalEnum(props, 'direction', ['horizontal', 'vertical'], key, errors)
      expectOptionalEnum(props, 'layoutEngine', ['dagre', 'manual'], key, errors)
      expectOptionalPositiveNumber(props, 'minHeight', key, errors, 1)
      expectOptionalPositiveNumber(props, 'layoutRankSep', key, errors, 1)
      expectOptionalPositiveNumber(props, 'layoutNodeSep', key, errors, 1)
      expectOptionalPositiveNumber(props, 'layoutEdgeSep', key, errors, 1)
      break
    }

    case 'ArchitectureNode': {
      expectRequiredString(props, 'label', key, errors)
      expectOptionalString(props, 'description', key, errors)
      expectOptionalString(props, 'technology', key, errors)
      expectOptionalEnum(props, 'kind', ARCHITECTURE_NODE_KINDS, key, errors)
      break
    }

    case 'TriggerNode': {
      expectRequiredString(props, 'label', key, errors)
      expectOptionalString(props, 'description', key, errors)
      expectOptionalString(props, 'color', key, errors)
      break
    }

    case 'CodeNode': {
      expectRequiredString(props, 'label', key, errors)
      expectRequiredString(props, 'code', key, errors)
      expectOptionalString(props, 'file', key, errors)
      expectOptionalString(props, 'language', key, errors)
      expectOptionalString(props, 'comment', key, errors)
      expectOptionalString(props, 'story', key, errors)
      expectOptionalBoolean(props, 'wrapLongLines', key, errors)
      expectOptionalBoolean(props, 'twoslash', key, errors)

      const language = typeof props.language === 'string'
        ? props.language.trim().toLowerCase()
        : 'typescript'
      const twoslash = props.twoslash

      if (twoslash === true) {
        if (!TWOSLASH_SUPPORTED_LANGUAGES.has(language)) {
          warnings.push(
            `Element "${key}" enables twoslash with language "${language}"; prefer TypeScript/TSX snippets for reliable twoslash output.`,
          )
        }
      }

      const magicMoveSteps = props.magicMoveSteps
      const validStepCodes: string[] = []

      if (magicMoveSteps !== undefined) {
        if (!Array.isArray(magicMoveSteps)) {
          errors.push(`Element "${key}" prop "magicMoveSteps" must be an array when provided.`)
          break
        }

        for (const [index, step] of magicMoveSteps.entries()) {
          if (!isObject(step)) {
            errors.push(`Element "${key}" magicMoveSteps[${index}] must be an object.`)
            continue
          }

          if (!isNonEmptyString(step.code)) {
            errors.push(`Element "${key}" magicMoveSteps[${index}] must include non-empty string "code".`)
          } else {
            validStepCodes.push(step.code)
          }

          for (const optionalKey of ['title', 'comment', 'story', 'speaker'] as const) {
            if (step[optionalKey] !== undefined && typeof step[optionalKey] !== 'string') {
              errors.push(
                `Element "${key}" magicMoveSteps[${index}] "${optionalKey}" must be a string when provided.`,
              )
            }
          }
        }
      }

      const code = typeof props.code === 'string' ? props.code : ''
      if (code.length < 8) {
        warnings.push(`Element "${key}" has very short code content; consider a more representative snippet.`)
      }

      const allCodeVariants = [code, ...validStepCodes]
      const finalCode = validStepCodes.length > 0
        ? validStepCodes[validStepCodes.length - 1] ?? code
        : code
      const hasAnyTwoslashHints = allCodeVariants.some((snippet) => hasTwoslashHints(snippet))
      const finalCodeHasTwoslashHints = hasTwoslashHints(finalCode)

      if (hasAnyTwoslashHints && !TWOSLASH_SUPPORTED_LANGUAGES.has(language)) {
        warnings.push(
          `Element "${key}" includes twoslash markers but language is "${language}"; use TypeScript/TSX for reliable twoslash output.`,
        )
      }

      if (twoslash === true && !hasAnyTwoslashHints) {
        warnings.push(
          `Element "${key}" sets twoslash=true but has no twoslash markers (for example // ^?); add markers to show meaningful callouts.`,
        )
      }

      if (twoslash === false && hasAnyTwoslashHints) {
        warnings.push(
          `Element "${key}" includes twoslash markers but twoslash is explicitly disabled (twoslash=false).`,
        )
      }

      const twoslashInspectionEnabled = twoslash === true || (twoslash !== false && hasAnyTwoslashHints)
      if (twoslashInspectionEnabled && validStepCodes.length > 0 && hasAnyTwoslashHints && !finalCodeHasTwoslashHints) {
        warnings.push(
          `Element "${key}" has twoslash markers only in non-final magicMoveSteps; move markers to the final step code so the post-animation twoslash frame shows callouts.`,
        )
      }

      if (twoslashInspectionEnabled && TWOSLASH_SUPPORTED_LANGUAGES.has(language)) {
        const undeclaredAmbientGlobals = findUndeclaredTwoslashAmbientGlobals(finalCode)
        if (undeclaredAmbientGlobals.length > 0) {
          warnings.push(
            `Element "${key}" twoslash snippet references ambient globals (${undeclaredAmbientGlobals.join(', ')}) without local declaration/import. Browser twoslash can miss those libs; inline minimal declarations or avoid those globals in teaching snippets.`,
          )
        }
      }

      break
    }

    case 'DecisionNode': {
      expectRequiredString(props, 'label', key, errors)
      expectOptionalString(props, 'condition', key, errors)
      expectOptionalString(props, 'description', key, errors)
      break
    }

    case 'PayloadNode': {
      expectRequiredString(props, 'label', key, errors)
      expectOptionalString(props, 'payload', key, errors)
      expectOptionalString(props, 'before', key, errors)
      expectOptionalString(props, 'after', key, errors)
      expectOptionalString(props, 'description', key, errors)
      expectOptionalEnum(props, 'format', ['json', 'yaml', 'text'], key, errors)

      if (!isNonEmptyString(props.payload) && !isNonEmptyString(props.before) && !isNonEmptyString(props.after)) {
        warnings.push(
          `Element "${key}" is PayloadNode without payload content; include "payload" or a "before"/"after" snapshot.`,
        )
      }

      break
    }

    case 'ErrorNode': {
      expectRequiredString(props, 'label', key, errors)
      expectRequiredString(props, 'message', key, errors)
      expectOptionalString(props, 'code', key, errors)
      expectOptionalString(props, 'cause', key, errors)
      expectOptionalString(props, 'mitigation', key, errors)
      break
    }

    case 'DescriptionNode': {
      expectRequiredString(props, 'label', key, errors)
      expectRequiredString(props, 'body', key, errors)
      break
    }

    case 'LinkNode': {
      expectRequiredString(props, 'label', key, errors)
      expectRequiredString(props, 'href', key, errors)
      expectOptionalString(props, 'description', key, errors)
      break
    }

    default:
      break
  }
}

function normalizeChildren(
  key: string,
  children: unknown,
  rootKey: string,
  elementKeys: Set<string>,
  errors: string[],
) {
  if (children === undefined) {
    return []
  }

  if (!Array.isArray(children)) {
    errors.push(`Element "${key}" children must be an array when provided.`)
    return []
  }

  const normalized: string[] = []

  for (const [index, child] of children.entries()) {
    if (!isNonEmptyString(child)) {
      errors.push(`Element "${key}" children[${index}] must be a non-empty string.`)
      continue
    }

    if (!elementKeys.has(child)) {
      errors.push(`Element "${key}" children[${index}] points to missing element "${child}".`)
      continue
    }

    if (child === rootKey) {
      errors.push(`Element "${key}" children[${index}] cannot point to root element "${rootKey}".`)
      continue
    }

    normalized.push(child)
  }

  return normalized
}

function normalizeTransitions(
  key: string,
  transitions: unknown,
  rootKey: string,
  elementKeys: Set<string>,
  errors: string[],
  warnings: string[],
): NormalizedTransition[] {
  if (transitions === undefined) {
    return []
  }

  if (!Array.isArray(transitions)) {
    errors.push(`Element "${key}" prop "transitions" must be an array when provided.`)
    return []
  }

  const normalized: NormalizedTransition[] = []
  const seenTargets = new Set<string>()

  for (const [index, transition] of transitions.entries()) {
    if (!isObject(transition)) {
      errors.push(`Element "${key}" transitions[${index}] must be an object.`)
      continue
    }

    const to = transition.to
    if (!isNonEmptyString(to)) {
      errors.push(`Element "${key}" transitions[${index}].to must be a non-empty string.`)
      continue
    }

    if (!elementKeys.has(to)) {
      errors.push(`Element "${key}" transitions[${index}] points to missing element "${to}".`)
      continue
    }

    if (to === rootKey) {
      errors.push(`Element "${key}" transitions[${index}] cannot point to root element "${rootKey}".`)
      continue
    }

    if (seenTargets.has(to)) {
      warnings.push(`Element "${key}" has duplicate transition metadata for target "${to}".`)
      continue
    }

    const label = transition.label
    if (label !== undefined && typeof label !== 'string') {
      errors.push(`Element "${key}" transitions[${index}].label must be a string when provided.`)
      continue
    }

    const description = transition.description
    if (description !== undefined && typeof description !== 'string') {
      errors.push(`Element "${key}" transitions[${index}].description must be a string when provided.`)
      continue
    }

    const kind = transition.kind
    if (kind !== undefined) {
      if (typeof kind !== 'string' || !EDGE_TRANSITION_KINDS.has(kind)) {
        errors.push(
          `Element "${key}" transitions[${index}].kind must be one of: ${Array.from(EDGE_TRANSITION_KINDS).join(', ')}.`,
        )
        continue
      }
    }

    seenTargets.add(to)
    normalized.push({
      to,
      label: typeof label === 'string' ? label : undefined,
      description: typeof description === 'string' ? description : undefined,
      kind: typeof kind === 'string' ? kind : undefined,
    })
  }

  if (normalized.length > 1 && normalized.some((transition) => !isNonEmptyString(transition.label))) {
    warnings.push(
      `Element "${key}" has multiple transitions without labels; add labels so branch choices are explicit.`,
    )
  }

  return normalized
}

function mergeOutgoingTargets(children: string[], transitionTargets: string[]) {
  const outgoing: string[] = []
  const seen = new Set<string>()

  for (const target of [...transitionTargets, ...children]) {
    if (seen.has(target)) continue
    seen.add(target)
    outgoing.push(target)
  }

  return outgoing
}

function validateSourceAnchorProp(
  elementKey: string,
  sourceAnchor: unknown,
  errors: string[],
  warnings: string[],
) {
  if (sourceAnchor === undefined) {
    return
  }

  if (typeof sourceAnchor === 'string') {
    if (!isNonEmptyString(sourceAnchor)) {
      errors.push(`Element "${elementKey}" prop "sourceAnchor" must be a non-empty string when provided.`)
      return
    }

    if (!/:\d+(?::\d+)?$/.test(sourceAnchor.trim())) {
      warnings.push(
        `Element "${elementKey}" sourceAnchor string should include line context (for example "src/service.ts:42").`,
      )
    }

    return
  }

  if (!isObject(sourceAnchor)) {
    errors.push(`Element "${elementKey}" prop "sourceAnchor" must be a string or object when provided.`)
    return
  }

  const path = sourceAnchor.path
  if (!isNonEmptyString(path)) {
    errors.push(`Element "${elementKey}" sourceAnchor.path must be a non-empty string.`)
    return
  }

  const line = sourceAnchor.line
  if (line !== undefined) {
    if (!isPositiveInteger(line)) {
      errors.push(`Element "${elementKey}" sourceAnchor.line must be an integer > 0 when provided.`)
      return
    }
  }

  const column = sourceAnchor.column
  if (column !== undefined) {
    if (!isPositiveInteger(column)) {
      errors.push(`Element "${elementKey}" sourceAnchor.column must be an integer > 0 when provided.`)
      return
    }

    if (line === undefined) {
      warnings.push(`Element "${elementKey}" sourceAnchor.column is set without sourceAnchor.line; add line for precise anchors.`)
    }
  }

  const label = sourceAnchor.label
  if (label !== undefined && typeof label !== 'string') {
    errors.push(`Element "${elementKey}" sourceAnchor.label must be a string when provided.`)
    return
  }

  const href = sourceAnchor.href
  if (href !== undefined && typeof href !== 'string') {
    errors.push(`Element "${elementKey}" sourceAnchor.href must be a string when provided.`)
    return
  }

  if (line === undefined) {
    warnings.push(
      `Element "${elementKey}" sourceAnchor.path is missing line context; include sourceAnchor.line for clearer code jumps.`,
    )
  }
}

function getFlowTimelineMode(root: FlowElement) {
  return root.props.mode === 'architecture' ? 'architecture' : 'narrative'
}

function validateStateShape(state: unknown, errors: string[], warnings: string[]) {
  if (state === undefined) {
    warnings.push('Spec state is missing; state.currentStep and state.playing will be inferred at runtime.')
    return
  }

  if (!isObject(state)) {
    errors.push('Spec state must be an object when provided.')
    return
  }

  const currentStep = state.currentStep
  if (currentStep !== undefined) {
    if (typeof currentStep !== 'number' || !Number.isFinite(currentStep) || currentStep < 0) {
      errors.push('state.currentStep must be a finite number >= 0 when provided.')
    }
  }

  const playing = state.playing
  if (playing !== undefined && typeof playing !== 'boolean') {
    errors.push('state.playing must be a boolean when provided.')
  }
}

function expectRequiredString(
  props: Record<string, unknown>,
  key: string,
  elementKey: string,
  errors: string[],
) {
  if (!isNonEmptyString(props[key])) {
    errors.push(`Element "${elementKey}" prop "${key}" must be a non-empty string.`)
  }
}

function expectOptionalString(
  props: Record<string, unknown>,
  key: string,
  elementKey: string,
  errors: string[],
) {
  const value = props[key]
  if (value !== undefined && typeof value !== 'string') {
    errors.push(`Element "${elementKey}" prop "${key}" must be a string when provided.`)
  }
}

function expectOptionalBoolean(
  props: Record<string, unknown>,
  key: string,
  elementKey: string,
  errors: string[],
) {
  const value = props[key]
  if (value !== undefined && typeof value !== 'boolean') {
    errors.push(`Element "${elementKey}" prop "${key}" must be a boolean when provided.`)
  }
}

function expectOptionalPositiveNumber(
  props: Record<string, unknown>,
  key: string,
  elementKey: string,
  errors: string[],
  min: number,
) {
  const value = props[key]
  if (value === undefined) {
    return
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    errors.push(`Element "${elementKey}" prop "${key}" must be a number >= ${min} when provided.`)
  }
}

function expectOptionalEnum(
  props: Record<string, unknown>,
  key: string,
  values: string[],
  elementKey: string,
  errors: string[],
) {
  const value = props[key]
  if (value === undefined) {
    return
  }

  if (typeof value !== 'string' || !values.includes(value)) {
    errors.push(`Element "${elementKey}" prop "${key}" must be one of: ${values.join(', ')}.`)
  }
}

function isFlowElement(value: unknown): value is FlowElement {
  if (!isObject(value)) return false

  const type = value.type
  const props = value.props
  const children = value.children

  if (typeof type !== 'string') return false
  if (!isObject(props)) return false
  if (children !== undefined && !Array.isArray(children)) return false

  return true
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function findUndeclaredTwoslashAmbientGlobals(code: string) {
  const normalizedCode = stripComments(code)

  return TWOSLASH_AMBIENT_GLOBAL_CANDIDATES.filter((globalName) => {
    if (!referencesAmbientGlobal(normalizedCode, globalName)) {
      return false
    }

    return !declaresOrImportsIdentifier(normalizedCode, globalName)
  })
}

function referencesAmbientGlobal(code: string, identifier: string) {
  const escaped = escapeRegExp(identifier)

  return [
    new RegExp(`\\bnew\\s+${escaped}\\b`),
    new RegExp(`\\btypeof\\s+${escaped}\\b`),
    new RegExp(`\\binstanceof\\s+${escaped}\\b`),
    new RegExp(`\\b${escaped}\\s*<`),
    new RegExp(`\\b${escaped}\\s*\\(`),
    new RegExp(`:\\s*${escaped}\\b`),
    new RegExp(`\\bas\\s+${escaped}\\b`),
    new RegExp(`\\bsatisfies\\s+${escaped}\\b`),
    new RegExp(`\\bglobalThis\\.${escaped}\\b`),
  ].some((pattern) => pattern.test(code))
}

function declaresOrImportsIdentifier(code: string, identifier: string) {
  const escaped = escapeRegExp(identifier)

  return [
    new RegExp(`\\b(?:const|let|var|function|class|interface|type|enum)\\s+${escaped}\\b`),
    new RegExp(`\\bdeclare\\s+(?:const|let|var|function|class|interface|type|enum)\\s+${escaped}\\b`),
    new RegExp(`\\bimport\\s+[^;\\n]*\\b${escaped}\\b`),
  ].some((pattern) => pattern.test(code))
}

function stripComments(code: string) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '\n')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasTwoslashHints(code: string) {
  return TWOSLASH_HINT_PATTERN.test(code)
}
