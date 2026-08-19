import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/session'
import { weekRows, rangeSummary } from '@/lib/admin-queries'
import { isValidThursdayYmd, isValidMonth, isValidYear } from '@/lib/admin-validation'
import { lastDayOfMonthYmd } from '@/lib/thursday'
import { buildWorkbook, mapWeekRows, mapSummaryRows } from '@/lib/export'

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

function xlsxResponse(buffer: Uint8Array, label: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="claims-${label}.xlsx"`,
    },
  })
}

export async function GET(request: Request) {
  await requireAdmin() // 404s non-admins

  const { searchParams } = new URL(request.url)
  const scope = searchParams.get('scope')

  if (scope === 'week') {
    const date = searchParams.get('date')
    if (!isValidThursdayYmd(date)) return badRequest('Invalid or missing date; expected a Thursday as YYYY-MM-DD.')
    const rows = mapWeekRows(await weekRows(date))
    const buffer = await buildWorkbook('week', date, rows)
    return xlsxResponse(buffer, date)
  }

  if (scope === 'month') {
    const month = searchParams.get('month')
    if (!isValidMonth(month)) return badRequest('Invalid or missing month; expected YYYY-MM.')
    const [year, m] = month.split('-').map(Number)
    const firstDay = `${month}-01`
    const lastDay = lastDayOfMonthYmd(year, m)
    const rows = mapSummaryRows(await rangeSummary(firstDay, lastDay))
    const buffer = await buildWorkbook('month', month, rows)
    return xlsxResponse(buffer, month)
  }

  if (scope === 'year') {
    const year = searchParams.get('year')
    if (!isValidYear(year)) return badRequest('Invalid or missing year; expected YYYY.')
    const rows = mapSummaryRows(await rangeSummary(`${year}-01-01`, `${year}-12-31`))
    const buffer = await buildWorkbook('year', year, rows)
    return xlsxResponse(buffer, year)
  }

  return badRequest('Invalid or missing scope; expected week, month, or year.')
}
