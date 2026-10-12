// The write-direction counterpart to csv-parse.js: rows of plain values in, RFC4180 CSV text out.

// A field needs quoting if it contains the delimiter, a quote, or any line break; an embedded quote
// doubles up ("" ) per the standard escaping rule.
function toCsvField(value) {
  const text = value == null ? '' : String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function toCsvRow(fields) {
  return fields.map(toCsvField).join(',')
}

// CRLF line endings, per RFC4180 - the safest default for spreadsheet apps (Excel in particular).
function stringifyCsv(rows) {
  return rows.map(toCsvRow).join('\r\n') + '\r\n'
}

module.exports = { toCsvField, toCsvRow, stringifyCsv }
