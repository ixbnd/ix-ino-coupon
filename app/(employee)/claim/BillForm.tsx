'use client'
import { useActionState, useState } from 'react'
import { submitClaim } from './actions'
import { coveredCents, excessCents, formatCents, parseBillToCents } from '@/lib/money'

const LARGE_BILL_CENTS = 10_000 // $100.00

export function BillForm({ t, capCents }: { t: string; capCents: number }) {
  const [state, formAction, pending] = useActionState(submitClaim, null)
  const [bill, setBill] = useState('')
  const [confirming, setConfirming] = useState(false)

  const cents = parseBillToCents(bill)
  const isLarge = cents !== null && cents > LARGE_BILL_CENTS

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (isLarge && !confirming) {
          e.preventDefault()
          setConfirming(true)
        }
      }}
      className="w-full"
    >
      <h1 className="mb-6 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Claim your coupon</h1>
      <input type="hidden" name="t" value={t} />
      <div className="mb-4">
        <label htmlFor="bill" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Bill total
        </label>
        <input
          id="bill"
          name="bill"
          type="text"
          inputMode="decimal"
          required
          autoComplete="off"
          value={bill}
          onChange={(e) => {
            setBill(e.target.value)
            setConfirming(false)
          }}
          placeholder="18.50"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </div>
      {cents !== null ? (
        <p className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
          Covered {formatCents(coveredCents(cents, capCents))} / You pay {formatCents(excessCents(cents, capCents))}
        </p>
      ) : null}
      {state?.error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {pending ? 'Submitting…' : confirming ? 'Unusually large — tap again to confirm' : 'Submit'}
      </button>
    </form>
  )
}
