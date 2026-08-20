import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import ExcelJS from 'exceljs'
import { db } from '@/lib/db/client'
import { employees, claims } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { signSessionToken, SESSION_COOKIE } from '@/lib/auth/token'
import { weekRows } from '@/lib/admin-queries'
import { buildWorkbook, mapWeekRows, mapSummaryRows } from '@/lib/export'

const { cookieStore } = vi.hoisted(() => ({ cookieStore: new Map<string, { value: string }>() }))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name),
    set: (name: string, value: string) => {
      cookieStore.set(name, { value })
    },
    delete: (name: string) => {
      cookieStore.delete(name)
    },
  }),
}))

const { GET } = await import('@/app/api/export/route')

const YMD = '2026-08-20'

beforeEach(async () => {
  cookieStore.clear()
  await db.execute(sql`TRUNCATE claims, employees RESTART IDENTITY CASCADE`)
})

async function makeEmployee(employeeId: string, role: 'employee' | 'admin' = 'employee') {
  const [emp] = await db.insert(employees).values({
    employeeId, name: 'Test', role, passwordHash: await hashPassword('x'), mustChangePassword: false,
  }).returning()
  return emp
}

async function loginAs(emp: { id: number; role: 'employee' | 'admin'; tokenVersion: number }) {
  cookieStore.set(SESSION_COOKIE, {
    value: await signSessionToken({ pk: emp.id, role: emp.role, tv: emp.tokenVersion, mcp: false }),
  })
}

async function reopen(buffer: Uint8Array) {
  const wb = new ExcelJS.Workbook()
  // exceljs's own .d.ts shadows the ambient `Buffer` name with a bare `extends ArrayBuffer`
  // type local to that file, so a real Node Buffer (which doesn't structurally satisfy that
  // shape) fails to typecheck as the `load()` argument — pass a plain ArrayBuffer instead.
  const arrayBuffer = new Uint8Array(buffer).buffer
  await wb.xlsx.load(arrayBuffer)
  return wb.getWorksheet('Claims')!
}

describe('buildWorkbook', () => {
  it('writes a bold header, numeric money cells with the dollar format, and a bold totals row', async () => {
    const rows = mapWeekRows([
      {
        employee: { id: 1, employeeId: 'XLS-0001', name: 'Ada' },
        claim: {
          id: 1, employeePk: 1, claimDate: YMD, claimedAt: new Date('2026-08-20T04:00:00Z'), billTotalCents: 1850, capCents: 1500,
          voided: false, amendedBy: null, amendedAt: null, voidedBy: null, voidedAt: null,
        },
      },
      {
        employee: { id: 2, employeeId: 'XLS-0002', name: 'Bo' },
        claim: null,
      },
    ])

    const buffer = await buildWorkbook('week', YMD, rows)
    const sheet = await reopen(buffer)

    const headerRow = sheet.getRow(2)
    expect(headerRow.getCell(1).text).toBe('Employee ID')
    expect(headerRow.getCell(1).font?.bold).toBe(true)
    expect(headerRow.getCell(5).text).toBe('Bill')

    const claimedDataRow = sheet.getRow(3)
    const billCell = claimedDataRow.getCell(5)
    expect(billCell.value).toBe(18.5)
    expect(billCell.numFmt).toBe('$#,##0.00')

    const unclaimedDataRow = sheet.getRow(4)
    expect(unclaimedDataRow.getCell(3).text).toBe('No')
    expect(unclaimedDataRow.getCell(5).value).toBeFalsy() // no money for an unclaimed row

    const totalsRow = sheet.getRow(5)
    expect(totalsRow.font?.bold).toBe(true)
    expect(totalsRow.getCell(5).value).toBe(18.5) // bill total
    expect(totalsRow.getCell(6).value).toBe(15) // covered total: min(18.50, 15.00)
    expect(totalsRow.getCell(7).value).toBe(3.5) // excess total: 18.50 - 15.00
  })

  it('sums month/year aggregate rows into a totals row', async () => {
    const rows = mapSummaryRows([
      { employee: { id: 1, employeeId: 'XLS-0010', name: 'Ada', active: true }, claimCount: 2, billCents: 4000, coveredCents: 3000, excessCents: 1000 },
      { employee: { id: 2, employeeId: 'XLS-0011', name: 'Bo', active: true }, claimCount: 1, billCents: 1000, coveredCents: 1000, excessCents: 0 },
    ])

    const buffer = await buildWorkbook('month', '2026-08', rows)
    const sheet = await reopen(buffer)

    const headerRow = sheet.getRow(2)
    expect(headerRow.getCell(3).text).toBe('Coupons Claimed')

    const totalsRow = sheet.getRow(5)
    expect(totalsRow.getCell(4).value).toBe(50) // bill total: 40 + 10
    expect(totalsRow.getCell(5).value).toBe(40) // covered total: 30 + 10
    expect(totalsRow.getCell(6).value).toBe(10) // excess total: 10 + 0
  })

  it('excludes a voided claim from the export when built from the real weekRows() query path', async () => {
    const claimedEmp = await makeEmployee('XLS-0020')
    const voidedEmp = await makeEmployee('XLS-0021')

    await db.insert(claims).values({ employeePk: claimedEmp.id, claimDate: YMD, billTotalCents: 1200, capCents: 1500 })
    await db.insert(claims).values({ employeePk: voidedEmp.id, claimDate: YMD, billTotalCents: 9999, capCents: 1500, voided: true })

    const rows = mapWeekRows(await weekRows(YMD))
    const buffer = await buildWorkbook('week', YMD, rows)
    const sheet = await reopen(buffer)

    const cellTexts: string[] = []
    sheet.eachRow((row) => cellTexts.push(String(row.getCell(1).value ?? '')))
    expect(cellTexts).toContain('XLS-0020')
    expect(cellTexts).not.toContain('9999') // the voided claim's bill total never appears anywhere

    // the voided employee's row shows as unclaimed, not with the voided bill amount
    const voidedRowIndex = cellTexts.indexOf('XLS-0021')
    expect(voidedRowIndex).toBeGreaterThan(-1)
    const voidedRow = sheet.getRow(voidedRowIndex + 1)
    expect(voidedRow.getCell(3).text).toBe('No')
  })
})

describe('GET /api/export', () => {
  it('404s an employee-role session', async () => {
    const emp = await makeEmployee('XLS-0030')
    await loginAs(emp)

    let caught: unknown
    try {
      await GET(new Request(`http://localhost/api/export?scope=week&date=${YMD}`))
    } catch (err) {
      caught = err
    }
    expect((caught as { digest?: string }).digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404')
  })

  it('returns 400 for an invalid scope', async () => {
    const admin = await makeEmployee('XLS-0031', 'admin')
    await loginAs(admin)

    const res = await GET(new Request('http://localhost/api/export?scope=bogus'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('returns 400 for a non-Thursday date on scope=week', async () => {
    const admin = await makeEmployee('XLS-0032', 'admin')
    await loginAs(admin)

    const res = await GET(new Request('http://localhost/api/export?scope=week&date=2026-08-21'))
    expect(res.status).toBe(400)
  })

  it('returns a downloadable xlsx buffer for a valid admin week export', async () => {
    const admin = await makeEmployee('XLS-0033', 'admin')
    await makeEmployee('XLS-0034')
    await loginAs(admin)

    const res = await GET(new Request(`http://localhost/api/export?scope=week&date=${YMD}`))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(res.headers.get('Content-Disposition')).toBe(`attachment; filename="claims-${YMD}.xlsx"`)

    const buffer = Buffer.from(await res.arrayBuffer())
    const sheet = await reopen(buffer)
    expect(sheet.getRow(2).getCell(1).text).toBe('Employee ID')
  })

  it('builds filenames with the month/year labels for those scopes', async () => {
    const admin = await makeEmployee('XLS-0035', 'admin')
    await loginAs(admin)

    const monthRes = await GET(new Request('http://localhost/api/export?scope=month&month=2026-08'))
    expect(monthRes.headers.get('Content-Disposition')).toBe('attachment; filename="claims-2026-08.xlsx"')

    const yearRes = await GET(new Request('http://localhost/api/export?scope=year&year=2026'))
    expect(yearRes.headers.get('Content-Disposition')).toBe('attachment; filename="claims-2026.xlsx"')
  })
})
