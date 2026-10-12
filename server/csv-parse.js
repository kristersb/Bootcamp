// Dependency-free RFC4180-ish parser: text in, grid of strings out. No header or domain knowledge -
// that belongs to whoever calls this (see server/routes/testCases.js).
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // strip a leading UTF-8 BOM

  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0
  const len = text.length

  while (i < len) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"' // escaped quote
          i += 2
          continue
        }
        inQuotes = false // closing quote
        i += 1
        continue
      }
      field += ch // anything inside quotes is literal, including , and newlines
      i += 1
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }
    if (ch === '\r' || ch === '\n') {
      row.push(field)
      rows.push(row)
      field = ''
      row = []
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1
      continue
    }
    field += ch
    i += 1
  }

  // A file with no trailing newline still has one unflushed field/row.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // A final newline otherwise leaves one bogus empty row at the end.
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop()
  }

  return rows
}

module.exports = { parseCsv }
