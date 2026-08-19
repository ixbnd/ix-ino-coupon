'use client'
import { useState } from 'react'
import { ClaimDrawer } from './ClaimDrawer'
import { AmendedTag } from './AmendedTag'
import { thClass, tdClass } from './adminStyles'
import { coveredCents, excessCents, formatCents } from '@/lib/money'
import { localHm } from '@/lib/thursday'
import type { employees, claims } from '@/lib/db/schema'

type Employee = typeof employees.$inferSelect
type Claim = typeof claims.$inferSelect
type Row = { employee: Employee; claim: Claim | null }

export function ClaimsTable({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<{ employee: Employee; claim: Claim } | null>(null)

  const claimedRows = rows.filter((r) => r.claim !== null)
  const totalCovered = claimedRows.reduce((sum, r) => sum + coveredCents(r.claim!.billTotalCents, r.claim!.capCents), 0)
  const totalExcess = claimedRows.reduce((sum, r) => sum + excessCents(r.claim!.billTotalCents, r.claim!.capCents), 0)

  return (
    <>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
            <th className={thClass}>Employee ID</th>
            <th className={thClass}>Name</th>
            <th className={thClass}>Claimed</th>
            <th className={thClass}>Time</th>
            <th className={thClass}>Bill</th>
            <th className={thClass}>Covered</th>
            <th className={thClass}>Excess</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ employee, claim }) => (
            <tr
              key={employee.id}
              onClick={claim ? () => setSelected({ employee, claim }) : undefined}
              onKeyDown={
                claim
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelected({ employee, claim })
                      }
                    }
                  : undefined
              }
              role={claim ? 'button' : undefined}
              tabIndex={claim ? 0 : undefined}
              aria-label={claim ? `View claim details for ${employee.name}` : undefined}
              className={`border-b border-black/5 last:border-0 outline-none dark:border-white/5 ${
                claim
                  ? 'cursor-pointer hover:bg-zinc-50 focus-visible:bg-zinc-100 dark:hover:bg-zinc-800/50 dark:focus-visible:bg-zinc-800'
                  : ''
              }`}
            >
              <td className={`${tdClass} font-mono text-zinc-950 dark:text-zinc-50`}>{employee.employeeId}</td>
              <td className={`${tdClass} text-zinc-950 dark:text-zinc-50`}>{employee.name}</td>
              <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>
                {claim ? '✓' : '—'}
                {claim?.amendedAt ? <AmendedTag /> : null}
              </td>
              <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>{claim ? localHm(claim.claimedAt) : '—'}</td>
              <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>{claim ? formatCents(claim.billTotalCents) : '—'}</td>
              <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>
                {claim ? formatCents(coveredCents(claim.billTotalCents, claim.capCents)) : '—'}
              </td>
              <td className={`${tdClass} text-zinc-700 dark:text-zinc-300`}>
                {claim ? formatCents(excessCents(claim.billTotalCents, claim.capCents)) : '—'}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                No active employees.
              </td>
            </tr>
          ) : null}
        </tbody>
        <tfoot>
          <tr className="border-t border-black/10 text-sm font-semibold text-zinc-950 dark:border-white/10 dark:text-zinc-50">
            <td className={tdClass} colSpan={3}>
              Claimed {claimedRows.length} / {rows.length}
            </td>
            <td className={tdClass} />
            <td className={tdClass} />
            <td className={tdClass}>{formatCents(totalCovered)}</td>
            <td className={tdClass}>{formatCents(totalExcess)}</td>
          </tr>
        </tfoot>
      </table>

      {selected ? (
        <ClaimDrawer employee={selected.employee} claim={selected.claim} onClose={() => setSelected(null)} />
      ) : null}
    </>
  )
}
