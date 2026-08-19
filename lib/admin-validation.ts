// Shared query-param validators for the admin week/month/year views and the matching xlsx export
// route — kept in one spot so the page components and the API route can't drift apart.
import { weekdayOfYmd } from './thursday'

export function isValidThursdayYmd(date: string | null | undefined): date is string {
  return !!date && /^\d{4}-\d{2}-\d{2}$/.test(date) && weekdayOfYmd(date) === 4
}

export function isValidMonth(month: string | null | undefined): month is string {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return false
  const m = Number(month.slice(5, 7))
  return m >= 1 && m <= 12
}

export function isValidYear(year: string | null | undefined): year is string {
  if (!year || !/^\d{4}$/.test(year)) return false
  const y = Number(year)
  return y >= 2000 && y <= 2100
}
