'use client'
import { useState, useTransition } from 'react'
import { resetPassword, setEmployeeActive } from './actions'
import { TempPasswordBox } from './TempPasswordBox'

export function EmployeeActions({
  employeePk, employeeId, active,
}: {
  employeePk: number
  employeeId: string
  active: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [temp, setTemp] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await resetPassword(employeePk)
              setTemp(res.tempPassword)
            })
          }
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Reset password
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setEmployeeActive(employeePk, !active)
            })
          }
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {active ? 'Deactivate' : 'Reactivate'}
        </button>
      </div>
      {temp ? (
        <div className="w-64">
          <TempPasswordBox employeeId={employeeId} tempPassword={temp} onDismiss={() => setTemp(null)} />
        </div>
      ) : null}
    </div>
  )
}
