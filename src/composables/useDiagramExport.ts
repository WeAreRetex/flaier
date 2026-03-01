export interface DiagramBounds {
  x: number
  y: number
  width: number
  height: number
}

export type DiagramExportFormat = 'png' | 'pdf'

export interface ExportFlowDiagramOptions {
  flowElement: HTMLElement
  theme: 'dark' | 'light'
  bounds: DiagramBounds
  fileNameBase: string
  format: DiagramExportFormat
}

const EXPORT_PADDING_PX = 72
const MAX_EXPORT_SIDE_PX = 6000
const MAX_EXPORT_AREA_PX = 26_000_000

export async function exportFlowDiagram(options: ExportFlowDiagramOptions) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('Diagram export is only available in the browser.')
  }

  const normalizedBounds = normalizeBounds(options.bounds)
  if (!normalizedBounds) {
    throw new Error('Diagram has no measurable bounds to export.')
  }

  const capture = createCaptureStage({
    flowElement: options.flowElement,
    theme: options.theme,
    bounds: normalizedBounds,
  })

  let pngDataUrl = ''

  try {
    const { toPng } = await import('html-to-image')

    pngDataUrl = await toPng(capture.stage, {
      width: capture.width,
      height: capture.height,
      pixelRatio: resolveExportPixelRatio(capture.width, capture.height),
      backgroundColor: capture.backgroundColor,
      cacheBust: true,
    })
  } finally {
    capture.destroy()
  }

  const safeBaseName = sanitizeFileName(options.fileNameBase || 'flow-diagram')

  if (options.format === 'png') {
    downloadDataUrl(pngDataUrl, `${safeBaseName}.png`)
    return
  }

  const pdfBlob = await renderPdfBlob(pngDataUrl, capture.width, capture.height)
  downloadBlob(pdfBlob, `${safeBaseName}.pdf`)
}

function createCaptureStage({
  flowElement,
  theme,
  bounds,
}: {
  flowElement: HTMLElement
  theme: 'dark' | 'light'
  bounds: Required<DiagramBounds>
}) {
  const width = Math.ceil(bounds.width + EXPORT_PADDING_PX * 2)
  const height = Math.ceil(bounds.height + EXPORT_PADDING_PX * 2)
  const sourceRoot = flowElement.closest('.flow-narrator') as HTMLElement | null
  const sourceStyles = getComputedStyle(sourceRoot ?? flowElement)

  const stage = document.createElement('div')
  stage.className = 'flow-narrator'
  stage.dataset.theme = theme
  stage.style.position = 'fixed'
  stage.style.left = '-100000px'
  stage.style.top = '0'
  stage.style.width = `${width}px`
  stage.style.height = `${height}px`
  stage.style.overflow = 'hidden'
  stage.style.pointerEvents = 'none'

  for (let index = 0; index < sourceStyles.length; index += 1) {
    const key = sourceStyles.item(index)
    if (!key.startsWith('--')) continue

    const value = sourceStyles.getPropertyValue(key)
    if (!value) continue
    stage.style.setProperty(key, value)
  }

  const backgroundColor = sourceStyles.getPropertyValue('--color-background').trim() || '#0b1120'
  stage.style.background = backgroundColor

  const flowClone = flowElement.cloneNode(true) as HTMLElement
  flowClone.style.width = `${width}px`
  flowClone.style.height = `${height}px`
  flowClone.style.margin = '0'

  const viewport = flowClone.querySelector('.vue-flow__viewport') as HTMLElement | null
  const exportTransform = `translate(${Math.round(EXPORT_PADDING_PX - bounds.x)}px, ${Math.round(EXPORT_PADDING_PX - bounds.y)}px) scale(1)`

  if (viewport) {
    viewport.style.transformOrigin = '0 0'
    viewport.style.transform = exportTransform
  }

  const zoneOverlays = flowClone.querySelectorAll<HTMLElement>('[data-zone-overlay="true"]')
  for (const overlay of zoneOverlays) {
    overlay.style.transformOrigin = '0 0'
    overlay.style.transform = exportTransform
  }

  stage.appendChild(flowClone)
  document.body.appendChild(stage)

  return {
    stage,
    width,
    height,
    backgroundColor,
    destroy() {
      stage.remove()
    },
  }
}

function normalizeBounds(bounds: DiagramBounds): Required<DiagramBounds> | null {
  if (!Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)) {
    return null
  }

  if (!Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) {
    return null
  }

  const width = Math.max(1, Math.floor(bounds.width))
  const height = Math.max(1, Math.floor(bounds.height))

  return {
    x: Math.floor(bounds.x),
    y: Math.floor(bounds.y),
    width,
    height,
  }
}

function resolveExportPixelRatio(width: number, height: number) {
  let ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1))

  if (width * ratio > MAX_EXPORT_SIDE_PX) {
    ratio = MAX_EXPORT_SIDE_PX / width
  }

  if (height * ratio > MAX_EXPORT_SIDE_PX) {
    ratio = Math.min(ratio, MAX_EXPORT_SIDE_PX / height)
  }

  const areaAtRatio = width * height * ratio * ratio
  if (areaAtRatio > MAX_EXPORT_AREA_PX) {
    ratio = Math.min(ratio, Math.sqrt(MAX_EXPORT_AREA_PX / (width * height)))
  }

  return Math.max(0.45, ratio)
}

async function renderPdfBlob(pngDataUrl: string, widthPx: number, heightPx: number) {
  const { jsPDF } = await import('jspdf')
  const pointPerPixel = 72 / 96
  const pageWidth = Math.max(72, Math.round(widthPx * pointPerPixel))
  const pageHeight = Math.max(72, Math.round(heightPx * pointPerPixel))

  const pdf = new jsPDF({
    unit: 'pt',
    format: [pageWidth, pageHeight],
    compress: true,
  })

  pdf.addImage(pngDataUrl, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
  return pdf.output('blob')
}

function sanitizeFileName(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return cleaned || 'flow-diagram'
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.click()
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)

  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener'
    anchor.click()
  } finally {
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
  }
}
