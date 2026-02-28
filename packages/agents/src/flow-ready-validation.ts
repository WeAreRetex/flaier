import type { FlowElement, FlowSpec } from './shared'
import { isObject } from './shared'

export interface FlowReadinessResult {
  errors: string[]
  warnings: string[]
}

const FLOW_COMPONENT_TYPES = new Set([
  'FlowTimeline',
  'TriggerNode',
  'CodeNode',
  'DescriptionNode',
  'LinkNode',
])

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
    childrenByKey.set(key, children)

    for (const child of children) {
      incomingCount.set(child, (incomingCount.get(child) ?? 0) + 1)
    }
  }

  const rootChildren = childrenByKey.get(spec.root) ?? []
  if (rootChildren.length === 0) {
    warnings.push('Root FlowTimeline has no children, so no node timeline can be traversed.')
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

  switch (element.type) {
    case 'FlowTimeline': {
      expectRequiredString(props, 'title', key, errors)
      expectOptionalString(props, 'description', key, errors)
      expectOptionalEnum(props, 'direction', ['horizontal', 'vertical'], key, errors)
      expectOptionalEnum(props, 'layoutEngine', ['dagre', 'manual'], key, errors)
      expectOptionalPositiveNumber(props, 'minHeight', key, errors, 1)
      expectOptionalPositiveNumber(props, 'layoutRankSep', key, errors, 1)
      expectOptionalPositiveNumber(props, 'layoutNodeSep', key, errors, 1)
      expectOptionalPositiveNumber(props, 'layoutEdgeSep', key, errors, 1)
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

      const magicMoveSteps = props.magicMoveSteps
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
