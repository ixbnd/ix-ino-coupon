'use client'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { amendClaim, voidClaim } from './claim-actions'
import { coveredCents, excessCents, formatCents, parseBillToCents } from '@/lib/money'

export type DrawerEmployee = { id: number; employeeId: string; name: string }
// Time/date strings are precomputed server-side (see admin/page.tsx, lib/thursday.ts) and passed
// in as plain strings rather than Dates — localHm()/formatYmdLong() default to
// process.env.APP_TIMEZONE, which is undefined in the browser, so formatting must happen on the
// server where that env var is actually set.
export type DrawerClaim = {
  id: number
  billTotalCents: number
  capCents: number
  timeHm: string
  thursdayLabel: string
  amended: boolean
  amendedLabel: string | null
}

const inputClass =
  'w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-fg outline-none'
const primaryBtnClass =
  'w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50'

export function ClaimDrawer({
  employee, claim, onClose,
}: {
  employee: DrawerEmployee
  claim: DrawerClaim
  onClose: () => void
}) {
  const boundAmend = amendClaim.bind(null, claim.id)
  const [state, formAction, amendPending] = useActionState(boundAmend, null)
  const [bill, setBill] = useState((claim.billTotalCents / 100).toFixed(2))
  const [confirmingVoid, setConfirmingVoid] = useState(false)
  const [voidPending, startVoidTransition] = useTransition()
  const [voidError, setVoidError] = useState<string | null>(null)

  // A successful amend resolves to {} (no `error` key) — close the drawer so the refreshed
  // week table (revalidatePath('/admin')) is what the admin sees next.
  useEffect(() => {
    if (state && !state.error) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const cents = parseBillToCents(bill)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close claim details"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-border bg-surface p-6 shadow-raised">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-fg">{employee.name}</h2>
            <p className="font-mono text-sm text-fg-muted">{employee.employeeId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        <dl className="mb-6 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-fg-muted">Thursday</dt>
          <dd className="text-right text-fg">{claim.thursdayLabel}</dd>
          <dt className="text-fg-muted">Claimed at</dt>
          <dd className="text-right text-fg">{claim.timeHm}</dd>
          <dt className="text-fg-muted">Covered</dt>
          <dd className="text-right text-fg">
            {formatCents(coveredCents(claim.billTotalCents, claim.capCents))}
          </dd>
          <dt className="text-fg-muted">Excess</dt>
          <dd className="text-right text-fg">
            {formatCents(excessCents(claim.billTotalCents, claim.capCents))}
          </dd>
          {claim.amendedLabel ? (
            <>
              <dt className="text-fg-muted">Amended</dt>
              <dd className="text-right text-fg-muted">{claim.amendedLabel}</dd>
            </>
          ) : null}
        </dl>

        <form action={formAction} className="mb-6">
          <label htmlFor="drawer-bill" className="mb-1 block text-sm font-medium text-fg">
            Bill total
          </label>
          <input
            id="drawer-bill"
            name="bill"
            type="text"
            inputMode="decimal"
            required
            autoComplete="off"
            value={bill}
            onChange={(e) => setBill(e.target.value)}
            className={`${inputClass} mb-2`}
          />
          {cents !== null ? (
            <p className="mb-3 text-sm text-fg">
              Covered {formatCents(coveredCents(cents, claim.capCents))} / Excess{' '}
              {formatCents(excessCents(cents, claim.capCents))}
            </p>
          ) : null}
          {state?.error ? <p className="mb-3 text-sm text-danger">{state.error}</p> : null}
          <button type="submit" disabled={amendPending} className={primaryBtnClass}>
            {amendPending ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <div className="mt-auto border-t border-border pt-4">
          {voidError ? <p className="mb-3 text-sm text-danger">{voidError}</p> : null}
          {confirmingVoid ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-fg">Void this claim? This can&apos;t be undone from here.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={voidPending}
                  onClick={() =>
                    startVoidTransition(async () => {
                      const result = await voidClaim(claim.id)
                      if (result?.error) {
                        setVoidError(result.error)
                        setConfirmingVoid(false)
                      } else {
                        onClose()
                      }
                    })
                  }
                  className="flex-1 rounded-lg border border-danger/50 bg-danger-subtle px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:border-danger disabled:opacity-50"
                >
                  {voidPending ? 'Voiding…' : 'Confirm void'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingVoid(false)}
                  disabled={voidPending}
                  className="flex-1 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-muted disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setVoidError(null)
                setConfirmingVoid(true)
              }}
              className="w-full rounded-lg border border-danger/40 bg-danger-subtle px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:border-danger"
            >
              Void claim
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
