'use client'
import { useActionState, useState } from 'react'
import { createEmployee } from './actions'
import { TempPasswordBox } from './TempPasswordBox'
import { formatEmployeeIdInput } from '@/lib/employee-id'

type State = { error?: string; tempPassword?: string; employeeId?: string } | null

export function AddEmployee() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        Add employee
      </button>

      {open ? <AddEmployeeModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState<State, FormData>(createEmployee, null)

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-zinc-900">
        {state?.tempPassword && state.employeeId ? (
          <>
            <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">Employee added</h2>
            <TempPasswordBox employeeId={state.employeeId} tempPassword={state.tempPassword} onDismiss={onClose} />
          </>
        ) : (
          <form action={formAction}>
            <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">Add employee</h2>
            <div className="mb-4">
              <label htmlFor="employeeId" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Employee ID
              </label>
              <input
                id="employeeId"
                name="employeeId"
                type="text"
                required
                autoCapitalize="characters"
                pattern="[A-Za-z]{2,3}-[0-9]{4}"
                placeholder="ABC-0001"
                onInput={(e) => {
                  e.currentTarget.value = formatEmployeeIdInput(e.currentTarget.value)
                }}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
            </div>
            {state?.error ? (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{state.error}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {pending ? 'Adding…' : 'Add'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
