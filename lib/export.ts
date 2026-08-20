import ExcelJS from 'exceljs'
import { coveredCents, excessCents } from './money'
import { localHm } from './thursday'
import type { weekRows, rangeSummary } from './admin-queries'

export type ExportScope = 'week' | 'month' | 'year'

// Week export row: only claimed employees carry money/time — unclaimed rows are blank cells.
export type WeekExportRow = {
  employeeId: string
  name: string
  claimed: boolean
  time: string | null
  billCents: number | null
  coveredCents: number | null
  excessCents: number | null
}

// Month/year export row: the rangeSummary aggregate shape, one row per active employee.
export type SummaryExportRow = {
  employeeId: string
  name: string
  claimCount: number
  billCents: number
  coveredCents: number
  excessCents: number
}

export type ExportRow = WeekExportRow | SummaryExportRow

const MONEY_FORMAT = '$#,##0.00'

function toDollars(cents: number): number {
  return cents / 100
}

// Maps the weekRows() query result (active employees left-joined to their live claim for the
// date) into export rows. Voided claims never appear here — weekRows already excludes them, so
// the matching employee simply shows as unclaimed.
export function mapWeekRows(rows: Awaited<ReturnType<typeof weekRows>>): WeekExportRow[] {
  return rows.map(({ employee, claim }) => ({
    employeeId: employee.employeeId,
    name: employee.name,
    claimed: claim !== null,
    time: claim ? localHm(claim.claimedAt) : null,
    billCents: claim ? claim.billTotalCents : null,
    coveredCents: claim ? coveredCents(claim.billTotalCents, claim.capCents) : null,
    excessCents: claim ? excessCents(claim.billTotalCents, claim.capCents) : null,
  }))
}

// Maps the rangeSummary() query result (per-employee aggregates over a date range) into export
// rows. Voided claims are excluded upstream by rangeSummary's own join condition.
export function mapSummaryRows(rows: Awaited<ReturnType<typeof rangeSummary>>): SummaryExportRow[] {
  return rows.map((r) => ({
    employeeId: r.employee.employeeId,
    name: r.employee.name,
    claimCount: r.claimCount,
    billCents: r.billCents,
    coveredCents: r.coveredCents,
    excessCents: r.excessCents,
  }))
}

const WEEK_COLUMNS = ['Employee ID', 'Name', 'Claimed', 'Time', 'Bill', 'Covered', 'Excess']
const SUMMARY_COLUMNS = ['Employee ID', 'Name', 'Coupons Claimed', 'Total Bill', 'Total Covered', 'Total Excess']

export async function buildWorkbook(scope: ExportScope, label: string, rows: ExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  const sheet = wb.addWorksheet('Claims')

  const columns = scope === 'week' ? WEEK_COLUMNS : SUMMARY_COLUMNS
  const [billCol, coveredCol, excessCol] = scope === 'week' ? [5, 6, 7] : [4, 5, 6]

  const titleRow = sheet.addRow([`Claims — ${label}`])
  titleRow.font = { bold: true, size: 14 }
  sheet.mergeCells(titleRow.number, 1, titleRow.number, columns.length)

  const headerRow = sheet.addRow(columns)
  headerRow.font = { bold: true }

  let totalBill = 0
  let totalCovered = 0
  let totalExcess = 0
  let totalCount = 0

  for (const row of rows) {
    if (scope === 'week') {
      const r = row as WeekExportRow
      const excelRow = sheet.addRow([
        r.employeeId,
        r.name,
        r.claimed ? 'Yes' : 'No',
        r.time ?? '',
        r.claimed ? toDollars(r.billCents!) : '',
        r.claimed ? toDollars(r.coveredCents!) : '',
        r.claimed ? toDollars(r.excessCents!) : '',
      ])
      if (r.claimed) {
        excelRow.getCell(billCol).numFmt = MONEY_FORMAT
        excelRow.getCell(coveredCol).numFmt = MONEY_FORMAT
        excelRow.getCell(excessCol).numFmt = MONEY_FORMAT
        totalBill += r.billCents!
        totalCovered += r.coveredCents!
        totalExcess += r.excessCents!
        totalCount += 1
      }
    } else {
      const r = row as SummaryExportRow
      const excelRow = sheet.addRow([r.employeeId, r.name, r.claimCount, toDollars(r.billCents), toDollars(r.coveredCents), toDollars(r.excessCents)])
      excelRow.getCell(billCol).numFmt = MONEY_FORMAT
      excelRow.getCell(coveredCol).numFmt = MONEY_FORMAT
      excelRow.getCell(excessCol).numFmt = MONEY_FORMAT
      totalBill += r.billCents
      totalCovered += r.coveredCents
      totalExcess += r.excessCents
      totalCount += r.claimCount
    }
  }

  const totalsValues =
    scope === 'week'
      ? [`Total (${totalCount} claimed)`, '', '', '', toDollars(totalBill), toDollars(totalCovered), toDollars(totalExcess)]
      : [`Total (${totalCount} claims)`, '', '', toDollars(totalBill), toDollars(totalCovered), toDollars(totalExcess)]
  const totalsRow = sheet.addRow(totalsValues)
  totalsRow.font = { bold: true }
  totalsRow.getCell(billCol).numFmt = MONEY_FORMAT
  totalsRow.getCell(coveredCol).numFmt = MONEY_FORMAT
  totalsRow.getCell(excessCol).numFmt = MONEY_FORMAT

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}
