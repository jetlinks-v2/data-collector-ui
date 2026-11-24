import { readPointClipboard } from './pointBatchClipboard'

export interface PointImportSheet { name: string; rows: string[][] }

/** Parse locally and hand the same cell matrix to the draft mapper; no upload or save occurs. */
export async function readPointImport(file: File): Promise<PointImportSheet[]> {
  if (/\.csv$/i.test(file.name)) return [{ name: file.name, rows: readPointClipboard(await file.text(), ',') }]
  if (!/\.xlsx$/i.test(file.name)) throw new Error('importFormat')
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  return workbook.worksheets.filter(sheet => sheet.actualRowCount).map(sheet => {
    let width = 0, lastRow = 0
    sheet.eachRow(row => row.eachCell((cell, column) => { if (cell.value != null) { width = Math.max(width, column); lastRow = Math.max(lastRow, row.number) } }))
    const rows = Array.from({ length: lastRow }, (_, index) => Array.from({ length: width }, (_, column) => {
      const cell = sheet.getCell(index + 1, column + 1)
      // Respect an explicit zero-padded Excel format without treating addresses as numbers.
      return typeof cell.value === 'number' && Number.isInteger(cell.value) && /^0+$/.test(cell.numFmt || '')
        ? String(cell.value).padStart(cell.numFmt.length, '0') : cell.text || ''
    }))
    return { name: sheet.name, rows }
  })
}
