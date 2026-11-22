// Reads an uploaded CSV off the main thread, so a big file doesn't freeze the
// page, and sends back only its number columns. Nothing leaves the browser.
import Papa from 'papaparse'
import { MAX_ROWS, numberColumns, type Column } from './sound.ts'

export type CsvResult =
  | { ok: true; columns: Column[] }
  | { ok: false; reason: 'rows' | 'numbers' | 'unreadable' }

self.onmessage = (e: MessageEvent<string>) => {
  let reply: CsvResult
  try {
    const parsed = Papa.parse<string[]>(e.data, { skipEmptyLines: true })
    const rows = parsed.data
    if (rows.length > MAX_ROWS + 1) reply = { ok: false, reason: 'rows' }
    else {
      const columns = numberColumns(rows)
      reply = columns.length
        ? { ok: true, columns }
        : { ok: false, reason: 'numbers' }
    }
  } catch {
    reply = { ok: false, reason: 'unreadable' }
  }
  self.postMessage(reply)
}
