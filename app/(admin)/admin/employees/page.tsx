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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <form method="get" className="flex flex-1 items-center gap-2">
            <label htmlFor="q" className="sr-only">
              Search employees
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search ID or name"
              className="h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-base text-fg placeholder:text-fg-subtle focus:outline-none sm:h-9 sm:w-44 sm:text-sm"
            />
            <button
              type="submit"
              className="h-11 shrink-0 rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-muted sm:h-9 sm:px-3"
            >
              Search
            </button>
          </form>
          <AddEmployee />
        </div>
      </div>
      <div className="rounded-card border border-border bg-surface shadow-card">
        {/* Phones: a card per person. Six columns do not fit, and the actions
            need a thumb-sized target rather than a table cell. */}
        <ul className="divide-y divide-border sm:hidden">
          {roster.map((emp) => (
            <li key={emp.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{emp.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-fg-muted">{emp.employeeId}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    {emp.role === 'admin' ? (
                      <span className="rounded-full bg-brand-subtle px-2 py-0.5 font-medium text-fg">Admin</span>
                    ) : null}
                    {emp.active ? null : (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium text-fg-subtle">
                        Inactive
                      </span>
                    )}
                    <span className="text-fg-subtle">
                      Added{' '}
                      {new Intl.DateTimeFormat('en-GB', {
                        dateStyle: 'medium',
                        timeZone: process.env.APP_TIMEZONE ?? 'Asia/Brunei',
                      }).format(emp.createdAt)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <EmployeeActions employeePk={emp.id} employeeId={emp.employeeId} active={emp.active} />
              </div>
            </li>
          ))}
          {roster.length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-fg-muted">
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
            </li>
          ) : null}
        </ul>

        <div className="hidden overflow-x-auto sm:block">
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
    </div>
  )
}
