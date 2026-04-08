/**
 * Shared jsPDF + html2canvas export for NewTentativeDashboard / NewFinalDashboard.
 * Single implementation keeps column math, header row, and raster width in sync.
 */
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * @param {Object} opts
 * @param {string} [opts.fileName='dashboard.pdf']
 * @param {string} [opts.rowSelector='.table-row']
 * @param {Document|HTMLElement} [opts.root=document]
 * @param {(rowClone: HTMLElement) => void} [opts.prepareRowClone] — e.g. strip Status/Actions on Tentative
 * @param {(rowClone: HTMLElement) => void} [opts.positionReviewerBadgesForClone]
 * @param {number[]} [opts.columnWidths] — relative widths for 7 exported columns
 * @param {() => void | Promise<void>} [opts.onStart]
 * @param {() => void} [opts.onEnd] — always called (finally), including early exit
 */
export async function exportMeetingDashboardPdf (opts = {}) {
  const {
    fileName = 'dashboard.pdf',
    rowSelector = '.table-row',
    root = document,
    prepareRowClone = () => {},
    positionReviewerBadgesForClone,
    columnWidths = [4, 9, 9, 135, 8, 9, 8],
    onStart,
    onEnd
  } = opts

  let ended = false
  const safeEnd = () => {
    if (!ended) {
      ended = true
      if (typeof onEnd === 'function') onEnd()
    }
  }

  try {
    if (typeof onStart === 'function') await onStart()

    const orientation = 'l'
    const pdf = new jsPDF(orientation, 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const marginX = 5
    const marginY = 10
    const usableWidth = pageWidth - marginX * 2
    const bodyWidthMm = usableWidth
    let position = marginY

    pdf.setFontSize(12)
    pdf.setFont('Arial', 'bold')

    const headerText = 'DASHBOARD MEETING POINTS (MDoNER)'
    const headerWidth = pdf.getTextWidth(headerText)
    pdf.setFillColor(255, 255, 0)
    pdf.rect(104, 6, headerWidth + 1.25, 6, 'F')
    pdf.text(headerText, pageWidth / 2, marginY, { align: 'center' })

    const today = new Date()
    const options = { timeZone: 'Asia/Kolkata' }
    const formattedDate = today.toLocaleDateString('en-IN', options)
      .replace(/\//g, '.')
      .replace(/\b(\d)\b/g, '0$1')
    pdf.setFillColor(255, 255, 0)
    pdf.rect(pageWidth - marginX - 30.2, marginY - 4.5, 30.2, 6, 'F')
    pdf.text(`As on ${formattedDate}`, pageWidth - marginX, marginY, { align: 'right' })

    position += 1

    const headers = [
      'S No.',
      'Sector/Division',
      'Description',
      'Action to be Taken',
      'Original Date',
      'Responsibility',
      'Review Date'
    ]
    const sumWidths = columnWidths.reduce((a, b) => a + b, 0)
    const scalingFactor = usableWidth / sumWidths
    const scaledColumnWidths = columnWidths.map(w => w * scalingFactor)
    const headerOffsets = [0, 7.5, 17.5, -5, -27.5, -16.5, -7.5]

    const drawBlueTableHeaderRow = (yMm) => {
      let xPos = marginX
      pdf.setFontSize(7.5)
      pdf.setFont('Arial', 'bold')
      for (let hi = 0; hi < headers.length; hi++) {
        const cellWidth = scaledColumnWidths[hi]
        pdf.setFillColor(59, 130, 246)
        pdf.rect(xPos, yMm, cellWidth, 8, 'F')
        xPos += cellWidth
      }
      xPos = marginX
      for (let hi = 0; hi < headers.length; hi++) {
        const cellWidth = scaledColumnWidths[hi]
        const textX = xPos + cellWidth / 2 + (headerOffsets[hi] || 0)
        pdf.setTextColor(0, 0, 0)
        pdf.text(headers[hi], textX + 3, yMm + 5.5, { align: 'center' })
        xPos += cellWidth
      }
      return yMm + 8
    }

    position = drawBlueTableHeaderRow(position)

    const rows = root.querySelectorAll(rowSelector)
    if (!rows.length) return

    const normalizeRowCloneForPdfCapture = (el) => {
      el.style.setProperty('border', 'none', 'important')
      el.style.setProperty('box-shadow', 'none', 'important')
      el.style.setProperty('margin', '0', 'important')
      el.style.setProperty('border-radius', '0', 'important')
    }

    /**
     * CSS px per mm at 96dpi (W3C). Using px for the off-screen wrapper avoids browser mm rounding
     * vs html2canvas's fixed pixel width — a common cause of empty right gutter and header misalignment.
     */
    const CSS_PX_PER_MM = 96 / 25.4
    const targetTablePx = Math.round(bodyWidthMm * CSS_PX_PER_MM)

    for (let i = 0; i < rows.length; i++) {
      const rowClone = rows[i].cloneNode(true)
      prepareRowClone(rowClone)

      normalizeRowCloneForPdfCapture(rowClone)

      const tableInRow = rowClone.querySelector('table')
      if (!tableInRow) continue

      // Remove any runtime colgroup from live UI; PDF capture injects a canonical one.
      tableInRow.querySelectorAll('colgroup:not([data-pdf-export-cols])').forEach((cg) => cg.remove())

      // Percent widths match jsPDF blue header (same ratios as scaledColumnWidths / bodyWidthMm).
      const colPercents = scaledColumnWidths.map((wmm) =>
        ((wmm / bodyWidthMm) * 100).toFixed(6)
      )

      let colgroup = tableInRow.querySelector('colgroup[data-pdf-export-cols]')
      if (!colgroup) {
        colgroup = document.createElement('colgroup')
        colgroup.setAttribute('data-pdf-export-cols', '1')
        colPercents.forEach((pct) => {
          const col = document.createElement('col')
          col.style.width = `${pct}%`
          colgroup.appendChild(col)
        })
        tableInRow.insertBefore(colgroup, tableInRow.firstChild)
      } else {
        const cols = colgroup.querySelectorAll('col')
        colPercents.forEach((pct, idx) => {
          if (cols[idx]) cols[idx].style.width = `${pct}%`
        })
      }

      const tds = tableInRow.querySelectorAll('tr > td:not(table table td)')
      tds.forEach((td, index) => {
        const pct = colPercents[index]
        td.style.setProperty('width', `${pct}%`, 'important')
        td.style.setProperty('max-width', `${pct}%`, 'important')
        td.style.boxSizing = 'border-box'
        td.style.wordBreak = 'break-word'
        td.style.overflowWrap = 'break-word'
        td.style.whiteSpace = 'pre-line'
        /* Top-align: inline middle previously beat Tentative .table-row td (no !important), unlike Final. */
        td.style.setProperty('vertical-align', 'top', 'important')
        td.style.fontSize = '10px'
        td.style.lineHeight = '1.3'
        td.style.padding = '2px 4px'
      })

      const actionColumn = tableInRow.querySelector('td:nth-child(4)')
      if (actionColumn) {
        const ap = colPercents[3]
        actionColumn.style.setProperty('width', `${ap}%`, 'important')
        actionColumn.style.setProperty('max-width', `${ap}%`, 'important')
        actionColumn.style.setProperty('min-width', '0', 'important')
        actionColumn.style.wordBreak = 'break-word'
        actionColumn.style.overflowWrap = 'break-word'
        actionColumn.style.whiteSpace = 'pre-line'
        actionColumn.style.fontSize = '10px'
        actionColumn.style.lineHeight = '1.3'
        actionColumn.style.setProperty('vertical-align', 'top', 'important')
        const inlineTags = ['SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'FONT', 'A', 'SUB', 'SUP']
        actionColumn.querySelectorAll('*').forEach(el => {
          el.style.wordBreak = 'break-word'
          el.style.overflowWrap = 'break-word'
          if (!inlineTags.includes(el.tagName.toUpperCase())) {
            el.style.whiteSpace = 'pre-line'
            el.style.maxWidth = '100%'
          }
          el.style.fontSize = '10px'
          el.style.lineHeight = '1.3'
        })
      }

      rowClone.classList.add('pdf-capture-mode')
      tableInRow.style.tableLayout = 'fixed'
      tableInRow.style.width = '100%'
      tableInRow.style.maxWidth = '100%'
      tableInRow.style.borderCollapse = 'collapse'
      tableInRow.style.boxSizing = 'border-box'

      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.background = '#fff'
      tempDiv.style.width = `${targetTablePx}px`
      tempDiv.style.boxSizing = 'border-box'
      rowClone.style.width = `${targetTablePx}px`
      rowClone.style.maxWidth = `${targetTablePx}px`
      rowClone.style.boxSizing = 'border-box'
      tempDiv.appendChild(rowClone)
      document.body.appendChild(tempDiv)

      await new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      })
      if (typeof positionReviewerBadgesForClone === 'function') {
        positionReviewerBadgesForClone(rowClone)
      }
      await new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      })

      const cloneRect = rowClone.getBoundingClientRect()
      const avoidCutIntervals = []
      const textFragments = []

      const collectTextFragments = () => {
        const walker = document.createTreeWalker(rowClone, NodeFilter.SHOW_TEXT, null, false)
        let node
        while ((node = walker.nextNode())) {
          let text = node.nodeValue.trim()
          if (text.length === 0) continue

          const parent = node.parentElement
          if (!parent) continue
          const style = window.getComputedStyle(parent)
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue
          if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) continue

          const range = document.createRange()
          range.selectNodeContents(node)
          let rects = Array.from(range.getClientRects())

          if (rects.length === 0) {
            const pRect = parent.getBoundingClientRect()
            if (pRect.height > 0 && pRect.width > 0) {
              rects = [pRect]
            }
          }

          if (rects.length === 0) continue

          text = text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-')
          text = text.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')

          if (rects.length === 1) {
            const rect = rects[0]
            if (rect.height > 0) {
              textFragments.push({
                text,
                top: rect.top - cloneRect.top,
                bottom: rect.bottom - cloneRect.top,
                left: rect.left - cloneRect.left,
                width: rect.width,
                height: rect.height
              })
            }
          } else {
            const lines = text.split(/\s*\n\s*/).filter(l => l.trim().length > 0)
            if (lines.length === rects.length) {
              for (let j = 0; j < rects.length; j++) {
                const rect = rects[j]
                if (rect.height > 0) {
                  textFragments.push({
                    text: lines[j].trim(),
                    top: rect.top - cloneRect.top,
                    bottom: rect.bottom - cloneRect.top,
                    left: rect.left - cloneRect.left,
                    width: rect.width,
                    height: rect.height
                  })
                }
              }
            } else {
              const charsPerRect = Math.ceil(text.length / rects.length)
              for (let j = 0; j < rects.length; j++) {
                const rect = rects[j]
                if (rect.height > 0) {
                  const chunk = text.substring(j * charsPerRect, (j + 1) * charsPerRect).trim()
                  if (chunk) {
                    textFragments.push({
                      text: chunk,
                      top: rect.top - cloneRect.top,
                      bottom: rect.bottom - cloneRect.top,
                      left: rect.left - cloneRect.left,
                      width: rect.width,
                      height: rect.height
                    })
                  }
                }
              }
            }
          }
        }
      }
      collectTextFragments()

      const bgDivs = []
      const cloneStyle = window.getComputedStyle(rowClone)
      const borderTop = parseFloat(cloneStyle.borderTopWidth) || 0
      const borderLeft = parseFloat(cloneStyle.borderLeftWidth) || 0

      rowClone.querySelectorAll('td:nth-child(4) *').forEach(el => {
        const style = window.getComputedStyle(el)
        const bgColor = style.backgroundColor

        if (style.display === 'inline' && bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          const range = document.createRange()
          range.selectNodeContents(el)
          const rects = Array.from(range.getClientRects())

          rects.forEach(rect => {
            if (rect.height > 0 && rect.width > 0) {
              const bgDiv = document.createElement('div')
              bgDiv.style.position = 'absolute'
              bgDiv.style.left = `${rect.left - cloneRect.left - borderLeft}px`
              bgDiv.style.top = `${rect.top - cloneRect.top - borderTop}px`
              bgDiv.style.width = `${rect.width}px`
              bgDiv.style.height = `${rect.height}px`
              bgDiv.style.backgroundColor = bgColor
              bgDiv.style.zIndex = '0'
              bgDiv.style.pointerEvents = 'none'
              bgDivs.push(bgDiv)
            }
          })

          el.style.setProperty('background-color', 'transparent', 'important')
          el.style.position = 'relative'
          el.style.zIndex = '1'
        }
      })

      rowClone.style.position = 'relative'
      rowClone.style.zIndex = '0'
      bgDivs.forEach(div => rowClone.appendChild(div))

      const addRects = (elements) => {
        elements.forEach(el => {
          const rect = el.getBoundingClientRect()
          if (rect.height > 0) {
            avoidCutIntervals.push({
              top: rect.top - cloneRect.top,
              bottom: rect.bottom - cloneRect.top
            })
          }
        })
      }

      addRects(rowClone.querySelectorAll('td:nth-child(4) table tr'))
      addRects(rowClone.querySelectorAll('td:nth-child(4) img'))
      addRects(rowClone.querySelectorAll('.reviewer-badge-parallel'))

      const actionTd = rowClone.querySelector('td:nth-child(4)')
      if (actionTd) {
        const walker = document.createTreeWalker(actionTd, NodeFilter.SHOW_TEXT, null, false)
        let node
        while ((node = walker.nextNode())) {
          if (node.nodeValue.trim().length > 0) {
            const range = document.createRange()
            range.selectNodeContents(node)
            const rects = range.getClientRects()
            for (let j = 0; j < rects.length; j++) {
              if (rects[j].height > 0) {
                avoidCutIntervals.push({
                  top: rects[j].top - cloneRect.top,
                  bottom: rects[j].bottom - cloneRect.top
                })
              }
            }
          }
        }
      }

      avoidCutIntervals.sort((a, b) => a.top - b.top)

      try {
        // Do not pass a fixed `width`: if it exceeds the laid-out element width, html2canvas
        // produces a wide bitmap with empty space on the right; addImage then scales that to
        // bodyWidthMm and columns no longer line up with the vector header.
        const canvas = await html2canvas(rowClone, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          allowTaint: true,
          letterRendering: true,
          fontFamilyCSS: '*',
          onclone: (clonedDoc) => {
            clonedDoc.body.style.overflow = 'visible'
            clonedDoc.body.style.position = 'static'
          }
        })

        let renderedHeight = 0
        const scaleY = canvas.height / cloneRect.height
        const maxAllowedGap = (((pageHeight - 10) * canvas.width) / bodyWidthMm) * 0.3

        while (renderedHeight < canvas.height) {
          let sliceHeightPx = Math.min(
            ((pageHeight - position - 10) * canvas.width) / bodyWidthMm,
            canvas.height - renderedHeight
          )

          let targetCutY = renderedHeight + sliceHeightPx

          if (targetCutY < canvas.height) {
            let bestCutY = targetCutY
            for (let k = 0; k < avoidCutIntervals.length; k++) {
              const interval = avoidCutIntervals[k]
              const topCanvas = interval.top * scaleY
              const bottomCanvas = interval.bottom * scaleY

              if (targetCutY > topCanvas + 1 && targetCutY < bottomCanvas - 1) {
                const gapCreated = targetCutY - topCanvas
                if (gapCreated <= maxAllowedGap && topCanvas > renderedHeight + 2) {
                  bestCutY = topCanvas
                  break
                }
              }
            }

            if (bestCutY !== targetCutY) {
              targetCutY = bestCutY
              sliceHeightPx = targetCutY - renderedHeight
            }
          }

          const sliceCanvas = document.createElement('canvas')
          sliceCanvas.width = canvas.width
          sliceCanvas.height = sliceHeightPx
          const sliceCtx = sliceCanvas.getContext('2d')
          sliceCtx.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)

          const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 1.0)
          const sliceImgHeight = (sliceHeightPx * bodyWidthMm) / canvas.width

          pdf.addImage(sliceImgData, 'JPEG', marginX, position, bodyWidthMm, sliceImgHeight)

          const scaleX = canvas.width / cloneRect.width
          textFragments.forEach(frag => {
            const fragTopCanvas = frag.top * scaleY
            const fragBottomCanvas = frag.bottom * scaleY
            if (fragBottomCanvas > renderedHeight + 1 && fragTopCanvas < renderedHeight + sliceHeightPx - 1) {
              const xMm = marginX + (frag.left * scaleX / canvas.width) * bodyWidthMm
              const widthMm = Math.max(
                0.5,
                (frag.width * scaleX / canvas.width) * bodyWidthMm
              )
              const lineBoxCanvasPx = frag.height * scaleY
              let fontSizePt = lineBoxCanvasPx * (82 / 96) * 0.92 * 1.1
              fontSizePt = Math.max(2.5, Math.min(7.15, fontSizePt))

              pdf.setFont('helvetica', 'normal')
              pdf.setFontSize(fontSizePt)
              const yMm = position + ((fragTopCanvas - renderedHeight) / sliceHeightPx) * sliceImgHeight
              pdf.text(String(frag.text), xMm, yMm, {
                renderingMode: 3,
                baseline: 'top',
                maxWidth: widthMm
              })
            }
          })

          renderedHeight += sliceHeightPx
          position += sliceImgHeight

          if (renderedHeight < canvas.height) {
            pdf.addPage(orientation, 'a4')
            position = marginY
            pdf.setFontSize(12)
            pdf.setFont('Arial', 'bold')
            const ht = 'DASHBOARD MEETING POINTS (MDoNER)'
            const hw = pdf.getTextWidth(ht)
            pdf.setFillColor(255, 255, 0)
            pdf.rect(104, 6, hw + 1.25, 6, 'F')
            pdf.text(ht, pageWidth / 2, marginY, { align: 'center' })
            const today2 = new Date()
            const fd = today2.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
              .replace(/\//g, '.')
              .replace(/\b(\d)\b/g, '0$1')
            pdf.setFillColor(255, 255, 0)
            pdf.rect(pageWidth - marginX - 30.2, marginY - 4.5, 30.2, 6, 'F')
            pdf.text(`As on ${fd}`, pageWidth - marginX, marginY, { align: 'right' })
            position += 1
            position = drawBlueTableHeaderRow(position)
          }
        }
        document.body.removeChild(tempDiv)
      } catch (error) {
        console.error(`Row ${i} error:`, error)
        document.body.removeChild(tempDiv)
      }
    }

    pdf.save(fileName)
  } catch (error) {
    console.error('PDF generation failed:', error)
    throw error
  } finally {
    safeEnd()
  }
}

/**
 * Remove Status (8) and Actions (9) from the main row — NewTentativeDashboard only.
 */
export function stripTentativePdfExtraColumns (rowClone) {
  const tableInRow = rowClone.querySelector('table')
  const mainRow = tableInRow && tableInRow.rows[0]
  if (mainRow && mainRow.children.length >= 9) {
    mainRow.removeChild(mainRow.children[8])
    mainRow.removeChild(mainRow.children[7])
  }
}
