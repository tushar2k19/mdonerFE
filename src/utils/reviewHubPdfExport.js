/**
 * Branded PDF export for NewTaskReviewHub (client-side jsPDF).
 * Header/footer: ministry band, gold accent, footer with page X of Y.
 * Table: optional comment excerpt column, grid lines, light R/G/B row fills by status.
 */
import jsPDF from 'jspdf'

const GOLD = [212, 175, 55]
const HEADER_BLACK = [15, 15, 18]
const FOOTER_GRAY = [120, 120, 120]

/** Aligns with reviewHubMatrix.js HUB_STATUS values */
const STATUS_FILL = {
  assigned_commented: [220, 252, 231],
  unassigned_commented: [219, 234, 254],
  assigned_pending: [254, 226, 226]
}

function drawMinistryHeader (doc, pageW, marginX, meta) {
  const bandH = 28
  doc.setFillColor(...HEADER_BLACK)
  doc.rect(0, 0, pageW, bandH, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Government of India', marginX, 8)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Ministry of Development of North Eastern Region', marginX, 16)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(...GOLD)
  const subtitle = meta.subtitle || 'DPR Checklist Analysis Report'
  doc.text(subtitle, marginX, 23)

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.8)
  doc.line(0, bandH, pageW, bandH)

  doc.setTextColor(0, 0, 0)
  return bandH + 6
}

/** Compact brand strip on continuation pages (below top margin). */
function drawContinuationStripe (doc, pageW, marginX, y0, versionLabel) {
  const h = 5
  doc.setFillColor(...HEADER_BLACK)
  doc.rect(marginX, y0, pageW - marginX * 2, h, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(255, 255, 255)
  doc.text(`MDoNER — ${versionLabel} (continued)`, marginX + 2, y0 + 3.5)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.35)
  doc.line(marginX, y0 + h, pageW - marginX, y0 + h)
  doc.setTextColor(0, 0, 0)
  return y0 + h + 4
}

function drawFooter (doc, pageW, pageH, marginX, pageIndex, totalPages, generatedAtStr) {
  const fh = 12
  const y = pageH - marginX - 2
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(marginX, y - fh, pageW - marginX, y - fh)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...FOOTER_GRAY)
  doc.text(`Generated on: ${generatedAtStr}`, marginX, y - 6)

  doc.text(
    `Page ${pageIndex} of ${totalPages}`,
    pageW - marginX,
    y - 6,
    { align: 'right' }
  )

  doc.setFont('helvetica', 'italic')
  const mid = pageW / 2
  doc.text('Ministry of Development of North Eastern Region', mid, y - 1, { align: 'center' })
  doc.setTextColor(0, 0, 0)
}

function splitLines (doc, text, maxW) {
  return doc.splitTextToSize(text == null ? '' : String(text), maxW)
}

function drawWrappedMetaLines (doc, lines, marginX, y0, maxW, linePitch) {
  let y = y0
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(40, 40, 40)
  for (const line of lines) {
    if (!line) continue
    const parts = splitLines(doc, line, maxW)
    for (let i = 0; i < parts.length; i++) {
      doc.text(parts[i], marginX, y)
      y += linePitch
    }
  }
  return y
}

/**
 * @param {Object} opts
 * @param {string} [opts.fileName]
 * @param {Object} opts.meta
 * @param {Array<{ sector, description, nodeLabel, assigneeNames, statusLabel, commentCount, commentExcerpt?, statusKey? }>} opts.rows
 */
export function exportReviewHubPdf (opts = {}) {
  const fileName = opts.fileName || 'review-hub-report.pdf'
  const meta = opts.meta || {}
  const rows = Array.isArray(opts.rows) ? opts.rows : []

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginX = 10
  const marginY = 10
  const footerReserve = 20
  const metaMaxW = pageW - marginX * 2

  const hasExcerpt =
    opts.includeCommentExcerptColumn === true ||
    rows.some((r) => r && String(r.commentExcerpt || '').trim())
  const col = hasExcerpt
    ? {
        sector: 20,
        desc: 52,
        node: 18,
        assignee: 30,
        status: 32,
        comments: 11,
        excerpt: 42
      }
    : {
        sector: 22,
        desc: 75,
        node: 22,
        assignee: 38,
        status: 42,
        comments: 18,
        excerpt: 0
      }

  const tableW =
    col.sector +
    col.desc +
    col.node +
    col.assignee +
    col.status +
    col.comments +
    (hasExcerpt ? col.excerpt : 0)
  const scale = Math.min(1, (pageW - marginX * 2) / tableW)
  const S = (v) => v * scale

  const now = new Date()
  const generatedAtStr = now.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  })

  const versionLabel =
    meta.versionId != null && meta.versionId !== ''
      ? `Version #${meta.versionId}`
      : 'Published pack'

  let y = drawMinistryHeader(doc, pageW, marginX, { subtitle: meta.subtitle })
  const ctxLines = [
    `Published pack: ${versionLabel}${meta.publishedLabel ? ` — ${meta.publishedLabel}` : ''}`,
    meta.scheduleLabel ? `Scheduled meeting date (pointer): ${meta.scheduleLabel}` : null,
    meta.nextReviewLabel ? `Next review target (draft setting): ${meta.nextReviewLabel}` : null
  ].filter(Boolean)
  y = drawWrappedMetaLines(doc, ctxLines, marginX, y, metaMaxW, 4.2)
  y += 4

  const colWidthsScaled = [
    S(col.sector),
    S(col.desc),
    S(col.node),
    S(col.assignee),
    S(col.status),
    S(col.comments)
  ]
  if (hasExcerpt) colWidthsScaled.push(S(col.excerpt))

  const drawTableHeader = (yy) => {
    doc.setFillColor(241, 245, 249)
    doc.rect(marginX, yy, S(tableW), 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(30, 41, 59)
    const labels = hasExcerpt
      ? ['Sector', 'Description', 'Node', 'Assignee', 'Status', '#', 'Latest comment']
      : ['Sector / Div.', 'Description', 'Node', 'Assignee', 'Status', 'Comments']
    let x = marginX
    for (let i = 0; i < labels.length; i++) {
      doc.text(labels[i], x + 1, yy + 4.8)
      x += colWidthsScaled[i]
    }
    doc.setDrawColor(148, 163, 184)
    doc.setLineWidth(0.15)
    x = marginX
    for (let c = 0; c <= colWidthsScaled.length; c++) {
      doc.line(x, yy, x, yy + 7)
      if (c < colWidthsScaled.length) x += colWidthsScaled[c]
    }
    doc.line(marginX, yy + 7, marginX + S(tableW), yy + 7)
    doc.setTextColor(0, 0, 0)
    return yy + 7
  }

  y = drawTableHeader(y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)

  const rowHMin = 6
  const linePitch = 3.15
  const maxY = pageH - marginY - footerReserve

  const estimateRowHeight = (r) => {
    const wSector = colWidthsScaled[0] - 2
    const wDesc = colWidthsScaled[1] - 2
    const wNode = colWidthsScaled[2] - 2
    const wAssign = colWidthsScaled[3] - 2
    const wStatus = colWidthsScaled[4] - 2
    const wExcerpt = hasExcerpt ? colWidthsScaled[6] - 2 : 0
    const descLines = splitLines(doc, r.description, wDesc)
    const assignLines = splitLines(doc, r.assigneeNames, wAssign)
    const statusLines = splitLines(doc, r.statusLabel, wStatus)
    const sectorLines = splitLines(doc, r.sector, wSector)
    const nodeLines = splitLines(doc, r.nodeLabel, wNode)
    const excerptLines =
      hasExcerpt && r.commentExcerpt
        ? splitLines(doc, r.commentExcerpt, wExcerpt)
        : ['']
    const lineCount = Math.max(
      descLines.length,
      assignLines.length,
      statusLines.length,
      sectorLines.length,
      nodeLines.length,
      excerptLines.length,
      1
    )
    return Math.max(rowHMin, lineCount * linePitch + 2)
  }

  const drawRow = (r, yy) => {
    const wSector = colWidthsScaled[0] - 2
    const wDesc = colWidthsScaled[1] - 2
    const wNode = colWidthsScaled[2] - 2
    const wAssign = colWidthsScaled[3] - 2
    const wStatus = colWidthsScaled[4] - 2
    const wExcerpt = hasExcerpt ? colWidthsScaled[6] - 2 : 0

    const sectorLines = splitLines(doc, r.sector, wSector)
    const descLines = splitLines(doc, r.description, wDesc)
    const nodeLines = splitLines(doc, r.nodeLabel, wNode)
    const assignLines = splitLines(doc, r.assigneeNames, wAssign)
    const statusLines = splitLines(doc, r.statusLabel, wStatus)
    const excerptLines =
      hasExcerpt && r.commentExcerpt
        ? splitLines(doc, r.commentExcerpt, wExcerpt)
        : []

    const lineCount = Math.max(
      descLines.length,
      assignLines.length,
      statusLines.length,
      sectorLines.length,
      nodeLines.length,
      excerptLines.length || 1,
      1
    )
    const rh = Math.max(rowHMin, lineCount * linePitch + 2)

    const fill = r.statusKey && STATUS_FILL[r.statusKey]
    if (fill) {
      doc.setFillColor(...fill)
      doc.rect(marginX, yy, S(tableW), rh, 'F')
    }

    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.12)
    doc.rect(marginX, yy, S(tableW), rh, 'S')

    let x = marginX
    for (let c = 0; c < colWidthsScaled.length; c++) {
      doc.line(x, yy, x, yy + rh)
      x += colWidthsScaled[c]
    }
    doc.line(marginX + S(tableW), yy, marginX + S(tableW), yy + rh)

    x = marginX
    doc.setTextColor(15, 23, 42)
    doc.text(sectorLines, x + 1, yy + 3.5)
    x += colWidthsScaled[0]
    doc.text(descLines, x + 1, yy + 3.5)
    x += colWidthsScaled[1]
    doc.text(nodeLines, x + 1, yy + 3.5)
    x += colWidthsScaled[2]
    doc.text(assignLines, x + 1, yy + 3.5)
    x += colWidthsScaled[3]
    doc.text(statusLines, x + 1, yy + 3.5)
    x += colWidthsScaled[4]
    doc.text(String(r.commentCount != null ? r.commentCount : 0), x + 1, yy + 3.5)
    x += colWidthsScaled[5]
    if (hasExcerpt) {
      doc.text(excerptLines.length ? excerptLines : [''], x + 1, yy + 3.5)
    }
    doc.setTextColor(0, 0, 0)
    return rh
  }

  let isFirstPage = true
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const estH = estimateRowHeight(r)
    if (y + estH > maxY) {
      doc.addPage()
      y = marginY
      y = drawContinuationStripe(doc, pageW, marginX, y, versionLabel)
      y = drawTableHeader(y)
      isFirstPage = false
    }
    const rh = drawRow(r, y)
    y += rh
  }
  void isFirstPage

  if (rows.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text('No assigned or commented nodes for this published pack.', marginX, y + 6)
    doc.setTextColor(0, 0, 0)
  }

  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(doc, pageW, pageH, marginX, p, totalPages, generatedAtStr)
  }

  doc.save(fileName)
}
