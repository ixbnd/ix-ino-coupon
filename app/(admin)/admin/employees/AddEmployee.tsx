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
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
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
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-raised">
        {state?.tempPassword && state.employeeId ? (
          <>
            <h2 className="mb-4 text-lg font-semibold text-fg">Employee added</h2>
            <TempPasswordBox employeeId={state.employeeId} tempPassword={state.tempPassword} onDismiss={onClose} />
          </>
        ) : (
          <form action={formAction}>
            <h2 className="mb-4 text-lg font-semibold text-fg">Add employee</h2>
            <div className="mb-4">
              <label htmlFor="employeeId" className="mb-1 block text-sm font-medium text-fg">
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
                className="w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-fg outline-none"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-fg">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-fg outline-none"
              />
            </div>
            {state?.error ? (
              <p className="mb-4 text-sm text-danger">{state.error}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50"
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
