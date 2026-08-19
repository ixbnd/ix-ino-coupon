const DEFAULT_TZ = () => process.env.APP_TIMEZONE ?? 'Asia/Brunei'

export function localYmd(now: Date, tz = DEFAULT_TZ()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function weekdayOfYmd(ymd: string): number {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay() // 4 = Thursday
}
export function isThursday(now: Date, tz = DEFAULT_TZ()): boolean {
  return weekdayOfYmd(localYmd(now, tz)) === 4
}
export function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export function nextThursdayYmd(now: Date, tz = DEFAULT_TZ()): string {
  let d = addDaysYmd(localYmd(now, tz), 1)
  while (weekdayOfYmd(d) !== 4) d = addDaysYmd(d, 1)
  return d
}
export function thursdaysInMonth(year: number, month: number): string[] {
  const out: string[] = []
  let d = `${year}-${String(month).padStart(2, '0')}-01`
  while (d.slice(5, 7) === String(month).padStart(2, '0')) {
    if (weekdayOfYmd(d) === 4) out.push(d)
    d = addDaysYmd(d, 1)
  }
  return out
}
export function formatYmdLong(ymd: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${ymd}T00:00:00Z`)).replace(/^(\w+) /, '$1, ')
}
export function localHm(d: Date, tz = DEFAULT_TZ()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
}
