'use client'
import { useActionState, useEffect, useState, useTransition } from 'react'
import { amendClaim, voidClaim } from './claim-actions'
import { coveredCents, excessCents, formatCents, parseBillToCents } from '@/lib/money'
import { formatYmdLong, localHm } from '@/lib/thursday'

type DrawerEmployee = { id: number; employeeId: string; name: string }
type DrawerClaim = {
  id: number
  claimDate: string
  claimedAt: Date
  billTotalCents: number
  capCents: number
  amendedBy: number | null
  amendedAt: Date | null
}

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50'
const primaryBtnClass =
  'w-full rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200'

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
      <div className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-900">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{employee.name}</h2>
            <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">{employee.employeeId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            ✕
          </button>
        </div>

        <dl className="mb-6 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">Thursday</dt>
          <dd className="text-right text-zinc-950 dark:text-zinc-50">{formatYmdLong(claim.claimDate)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Claimed at</dt>
          <dd className="text-right text-zinc-950 dark:text-zinc-50">{localHm(claim.claimedAt)}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Covered</dt>
          <dd className="text-right text-zinc-950 dark:text-zinc-50">
            {formatCents(coveredCents(claim.billTotalCents, claim.capCents))}
          </dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Excess</dt>
          <dd className="text-right text-zinc-950 dark:text-zinc-50">
            {formatCents(excessCents(claim.billTotalCents, claim.capCents))}
          </dd>
          {claim.amendedAt ? (
            <>
              <dt className="text-zinc-500 dark:text-zinc-400">Amended</dt>
              <dd className="text-right text-amber-700 dark:text-amber-400">
                {localHm(claim.amendedAt)} by admin #{claim.amendedBy}
              </dd>
            </>
          ) : null}
        </dl>

        <form action={formAction} className="mb-6">
          <label htmlFor="drawer-bill" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
            <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
              Covered {formatCents(coveredCents(cents, claim.capCents))} / Excess{' '}
              {formatCents(excessCents(cents, claim.capCents))}
            </p>
          ) : null}
          {state?.error ? <p className="mb-3 text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
          <button type="submit" disabled={amendPending} className={primaryBtnClass}>
            {amendPending ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <div className="mt-auto border-t border-black/10 pt-4 dark:border-white/10">
          {confirmingVoid ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">Void this claim? This can&apos;t be undone from here.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={voidPending}
                  onClick={() =>
                    startVoidTransition(async () => {
                      await voidClaim(claim.id)
                      onClose()
                    })
                  }
                  className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {voidPending ? 'Voiding…' : 'Confirm void'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingVoid(false)}
                  disabled={voidPending}
                  className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingVoid(true)}
              className="w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Void claim
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
