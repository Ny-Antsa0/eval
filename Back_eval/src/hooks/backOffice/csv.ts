// Minimal CSV parsing for small uploads with quoted values.
const parseCsvLine = (line: string, delimiter: string) => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === delimiter && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  values.push(current.trim())
  return values
}

export const parseCsv = (content: string) => {
  const rows = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (rows.length === 0) return []

  const delimiter = rows[0].includes(';') ? ';' : ','
  const headers = parseCsvLine(rows[0], delimiter)

  return rows.slice(1).map((row) => {
    const values = parseCsvLine(row, delimiter)
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      const value = values[index] ?? ''
      if (header) {
        record[header] = value
      }
    })
    return record
  })
}

export const sanitizeRecord = (record: Record<string, string>) => {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== ''),
  )
}
