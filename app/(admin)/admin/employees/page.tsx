import { asc } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/auth/session'
import { AddEmployee } from './AddEmployee'
import { EmployeeActions } from './EmployeeActions'

export default async function EmployeesPage() {
  // Page segments render independently of the (admin) layout, so the layout's requireAdmin()
  // alone does not gate this route — see app/(admin)/admin/page.tsx for the same fix.
  await requireAdmin()
  // Narrow columns even though this table is only ever rendered server-side (passwordHash/
  // tokenVersion never reach a client component here) — defense in depth against a future
  // change accidentally passing `roster` rows into a client component.
  const roster = await db.query.employees.findMany({
    orderBy: asc(employees.employeeId),
    columns: { id: true, employeeId: true, name: true, role: true, active: true, createdAt: true },
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">Employees</h1>
        <AddEmployee />
      </div>
      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className="px-4 py-2 font-medium">ID</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Active</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {roster.map((emp) => (
              <tr key={emp.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-4 py-3 font-mono text-zinc-950 dark:text-zinc-50">{emp.employeeId}</td>
                <td className="px-4 py-3 text-zinc-950 dark:text-zinc-50">{emp.name}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{emp.role}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{emp.active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
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
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                  No employees yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
