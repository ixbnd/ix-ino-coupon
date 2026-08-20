'use client'
import { useActionState, useState } from 'react'
import { submitClaim } from './actions'
import { coveredCents, excessCents, formatCents, parseBillToCents } from '@/lib/money'
import { Button, ErrorNote, Field } from '@/components/ui'

const LARGE_BILL_CENTS = 10_000 // $100.00

export function BillForm({ t, capCents }: { t: string; capCents: number }) {
  const [state, formAction, pending] = useActionState(submitClaim, null)
  const [bill, setBill] = useState('')
  const [confirming, setConfirming] = useState(false)

  const cents = parseBillToCents(bill)
  const isLarge = cents !== null && cents > LARGE_BILL_CENTS
  const covered = cents === null ? null : coveredCents(cents, capCents)
  const excess = cents === null ? null : excessCents(cents, capCents)

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
      <h1 className="text-xl font-semibold tracking-tight text-fg">Claim your coupon</h1>
      <p className="mt-1 mb-6 text-sm text-fg-muted">
        Enter what the bill came to. We cover up to {formatCents(capCents)}.
      </p>

      <input type="hidden" name="t" value={t} />

      <Field label="Bill total" htmlFor="bill">
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-2xl font-medium text-fg-subtle"
          >
            $
          </span>
          <input
            id="bill"
            name="bill"
            type="text"
            inputMode="decimal"
            required
            autoComplete="off"
            autoFocus
            value={bill}
            onChange={(e) => {
              setBill(e.target.value)
              setConfirming(false)
            }}
            placeholder="0.00"
            className="tnum w-full rounded-lg border border-border-strong bg-surface py-4 pr-4 pl-9 text-2xl font-medium text-fg placeholder:text-fg-subtle focus:outline-none"
          />
        </div>
      </Field>

      {/* Reserve the row so the layout doesn't jump on the first keystroke. */}
      <div className="mb-5 min-h-16">
        {covered !== null && excess !== null ? (
          <dl className="rounded-lg bg-surface-sunken px-4 py-3 text-sm">
            <div className="flex items-baseline justify-between">
              <dt className="text-fg-muted">Covered</dt>
              <dd className="tnum font-semibold text-fg">{formatCents(covered)}</dd>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <dt className="text-fg-muted">You pay</dt>
              <dd className="tnum font-semibold text-fg">{formatCents(excess)}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <Button type="submit" disabled={pending} variant={confirming ? 'danger' : 'primary'} full>
        {pending ? 'Submitting…' : confirming ? `Confirm ${formatCents(cents ?? 0)} — tap again` : 'Submit claim'}
      </Button>

      <p aria-live="polite" className="sr-only">
        {confirming ? 'That is an unusually large bill. Tap the button again to confirm.' : ''}
      </p>
    </form>
  )
}
