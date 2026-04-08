/**
 * Client-side normalizer for complex Word/LibreOffice tables.
 *
 * LibreOffice HTML exports insert many empty <tr></tr> rows for vertical
 * spacing. Browsers allocate a real row for each <tr>, which breaks
 * rowspan/colspan alignment. This module strips those phantom rows and
 * marks the table so CSS can treat it as a "preserved layout" table.
 */

const PRESERVE_CLASS = 'dashboard-import-table'
const WRAPPER_STYLE = 'overflow-x: auto; max-width: 100%;'

/**
 * Returns true when an HTML string contains a table with merged cells
 * (rowspan/colspan) or explicit column definitions (<col>/<colgroup>).
 */
export function hasComplexTable (html) {
  if (!html || typeof html !== 'string') return false
  if (!html.includes('<table')) return false
  return /\b(rowspan|colspan)\s*=/.test(html) ||
    /<col[\s/>]/.test(html) ||
    /<colgroup[\s/>]/.test(html)
}

/**
 * Normalize complex table HTML:
 *  1. Remove <tr> elements that have zero <td>/<th> children.
 *  2. Add `dashboard-import-table` class to complex tables.
 *  3. Wrap in a horizontal-scroll div.
 *
 * Simple tables (no rowspan/colspan/col) pass through unchanged.
 */
export function normalizeComplexTableHtml (html) {
  if (!hasComplexTable(html)) return html

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html')
  let changed = false

  doc.querySelectorAll('table').forEach(table => {
    if (!isComplexTable(table)) return

    changed = true

    // 1. Strip empty rows
    table.querySelectorAll('tr').forEach(tr => {
      if (tr.querySelectorAll('td, th').length === 0) {
        tr.remove()
      }
    })

    // 2. Add marker class
    if (!table.classList.contains(PRESERVE_CLASS)) {
      table.classList.add(PRESERVE_CLASS)
    }

    // 3. Ensure collapse + auto layout
    const existing = table.getAttribute('style') || ''
    if (!existing.includes('border-collapse')) {
      table.setAttribute('style', existing + (existing ? ' ' : '') + 'border-collapse: collapse; table-layout: auto; max-width: 100%;')
    }

    // 4. Wrap in scroll container if not already wrapped
    const parent = table.parentElement
    if (!(parent && parent.tagName === 'DIV' && (parent.getAttribute('style') || '').includes('overflow-x: auto'))) {
      const wrapper = doc.createElement('div')
      wrapper.setAttribute('style', WRAPPER_STYLE)
      table.parentNode.insertBefore(wrapper, table)
      wrapper.appendChild(table)
    }
  })

  if (!changed) return html
  return doc.body.innerHTML
}

function isComplexTable (table) {
  return table.querySelector('[rowspan], [colspan]') !== null ||
    table.querySelector('colgroup, col') !== null ||
    table.querySelector('td table, th table') !== null
}

/**
 * Sanitize pasted HTML for use in the rich editor.
 * Keeps structural elements needed for tables but strips scripts,
 * event handlers, and other dangerous content.
 */
export function sanitizePastedHtml (html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html')

  // Remove scripts and dangerous elements
  doc.querySelectorAll('script, style, link, meta, iframe, object, embed, form, input, button, select, textarea').forEach(el => el.remove())

  // Strip event handler attributes from all elements
  doc.querySelectorAll('*').forEach(el => {
    const attrs = Array.from(el.attributes)
    attrs.forEach(attr => {
      if (attr.name.startsWith('on') || attr.name === 'id') {
        el.removeAttribute(attr.name)
      }
    })
  })

  return doc.body.innerHTML
}
