const CODE_NODE_MIN_WIDTH = 520
const CODE_NODE_MAX_WIDTH = 2200
const CODE_NODE_CHARACTER_WIDTH = 8.5
const CODE_NODE_CHROME_WIDTH = 88

export const CODE_NODE_MAX_INLINE_CHARS = Math.floor(
  (CODE_NODE_MAX_WIDTH - CODE_NODE_CHROME_WIDTH) / CODE_NODE_CHARACTER_WIDTH,
)

export function estimateCodeNodeWidth(maxLineLength: number) {
  const safeLineLength = Number.isFinite(maxLineLength)
    ? Math.max(0, Math.floor(maxLineLength))
    : 0

  const estimatedWidth = CODE_NODE_CHROME_WIDTH + safeLineLength * CODE_NODE_CHARACTER_WIDTH

  return Math.min(CODE_NODE_MAX_WIDTH, Math.max(CODE_NODE_MIN_WIDTH, Math.ceil(estimatedWidth)))
}

export function estimateCodeNodeCharsPerLine(nodeWidth: number) {
  const safeWidth = Number.isFinite(nodeWidth)
    ? Math.max(CODE_NODE_MIN_WIDTH, Math.floor(nodeWidth))
    : CODE_NODE_MIN_WIDTH

  return Math.max(44, Math.floor((safeWidth - CODE_NODE_CHROME_WIDTH) / CODE_NODE_CHARACTER_WIDTH))
}
