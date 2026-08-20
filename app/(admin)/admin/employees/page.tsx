import { asc, or, ilike } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/auth/session'
import { AddEmployee } from './AddEmployee'
import { EmployeeActions } from './EmployeeActions'

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  // Page segments render independently of the (admin) layout, so the layout's requireAdmin()
  // alone does not gate this route — see app/(admin)/admin/page.tsx for the same fix.
  await requireAdmin()
  // Narrow columns even though this table is only ever rendered server-side (passwordHash/
  // tokenVersion never reach a client component here) — defense in depth against a future
  // change accidentally passing `roster` rows into a client component.
  const roster = await db.query.employees.findMany({
    orderBy: asc(employees.employeeId),
    columns: { id: true, employeeId: true, name: true, role: true, active: true, createdAt: true },
    // Parameterized by drizzle; the wildcards are ours, the value is bound.
    where: query
      ? or(ilike(employees.employeeId, `%${query}%`), ilike(employees.name, `%${query}%`))
      : undefined,
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">Employees</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {roster.length} {roster.length === 1 ? 'person' : 'people'}
            {query ? ` matching “${query}”` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="q" className="sr-only">
              Search employees
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search ID or name"
              className="h-9 w-44 rounded-lg border border-border-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />
            <button
              type="submit"
              className="h-9 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-fg transition-colors hover:bg-surface-muted"
            >
              Search
            </button>
          </form>
          <AddEmployee />
        </div>
      </div>
      <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-fg-muted">
              <th className="px-4 py-2.5">ID</th>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Active</th>
              <th className="px-4 py-2.5">Created</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {roster.map((emp) => (
              <tr key={emp.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3 font-mono text-fg">{emp.employeeId}</td>
                <td className="px-4 py-3 text-fg">{emp.name}</td>
                <td className="px-4 py-3"><span className="text-fg">{emp.role === 'admin' ? 'Admin' : 'Employee'}</span></td>
                <td className="px-4 py-3">{emp.active ? <span className="text-fg-muted">Active</span> : <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-fg-subtle">Inactive</span>}</td>
                <td className="px-4 py-3 text-fg">
                  {new Intl.DateTimeFormat('en-GB', {
                    dateStyle: 'medium',
                    timeZone: process.env.APP_TIMEZONE ?? 'Asia/Brunei',
                  }).format(emp.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <EmployeeActions employeePk={emp.id} employeeId={emp.employeeId} active={emp.active} />
                </td>
              </tr>
            ))}
            {roster.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-fg-muted">
                  {query ? (
                    <>
                      Nobody matches “{query}”.{' '}
                      <a href="/admin/employees" className="font-medium text-primary underline underline-offset-4">
                        Clear search
                      </a>
                    </>
                  ) : (
                    'No employees yet — add the first one with the button above.'
                  )}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
