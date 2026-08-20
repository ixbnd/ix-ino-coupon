'use client'
import { useActionState, useState } from 'react'
import { submitClaim } from './actions'
import { coveredCents, excessCents, formatCents, parseBillToCents } from '@/lib/money'
import { Button, ErrorNote, Field } from '@/components/ui'

const LARGE_BILL_CENTS = 10_000 // $100.00

const AMOUNT_INPUT =
  'tnum w-full rounded-lg border border-border-strong bg-surface py-4 pr-4 pl-9 text-2xl font-medium text-fg placeholder:text-fg-subtle focus:outline-none'

function AmountInput({
  id,
  name,
  value,
  onChange,
  autoFocus,
  required,
}: {
  id: string
  name: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  required?: boolean
}) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-2xl font-medium text-fg-subtle"
      >
        $
      </span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        required={required}
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className={AMOUNT_INPUT}
      />
    </div>
  )
}

export function BillForm({ t, capCents }: { t: string; capCents: number }) {
  const [state, formAction, pending] = useActionState(submitClaim, null)
  const [bill, setBill] = useState('')
  const [carWash, setCarWash] = useState(false)
  const [carWashAmount, setCarWashAmount] = useState('')
  const [confirming, setConfirming] = useState(false)

  const billCents = parseBillToCents(bill)
  const washCents = carWash ? parseBillToCents(carWashAmount) : 0
  const totalCents = billCents === null || washCents === null ? null : billCents + washCents

  const isLarge = totalCents !== null && totalCents > LARGE_BILL_CENTS
  const covered = totalCents === null ? null : coveredCents(totalCents, capCents)
  const excess = totalCents === null ? null : excessCents(totalCents, capCents)

  const reset = () => setConfirming(false)

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
        <AmountInput
          id="bill"
          name="bill"
          value={bill}
          onChange={(v) => {
            setBill(v)
            reset()
          }}
          autoFocus
          required
        />
      </Field>

      {/* The whole row is the label, so the tap target is the width of the card
          rather than a 16px box. */}
      <label
        htmlFor="carWash"
        className="mb-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2.5"
      >
        <input
          id="carWash"
          name="carWash"
          type="checkbox"
          checked={carWash}
          onChange={(e) => {
            setCarWash(e.target.checked)
            if (!e.target.checked) setCarWashAmount('')
            reset()
          }}
          className="h-5 w-5 shrink-0 accent-primary"
        />
        <span className="text-sm font-medium text-fg">Car wash included</span>
      </label>

      {carWash ? (
        <Field label="Car wash amount" htmlFor="carWashAmount">
          <AmountInput
            id="carWashAmount"
            name="carWashAmount"
            value={carWashAmount}
            onChange={(v) => {
              setCarWashAmount(v)
              reset()
            }}
            required
          />
        </Field>
      ) : null}

      {/* Reserve the row so the layout doesn't jump on the first keystroke. */}
      <div className="mb-5 min-h-16">
        {totalCents !== null && covered !== null && excess !== null ? (
          <dl className="rounded-lg bg-surface-sunken px-4 py-3 text-sm">
            {washCents ? (
              <>
                <div className="flex items-baseline justify-between text-fg-muted">
                  <dt>Bill</dt>
                  <dd className="tnum">{formatCents(billCents ?? 0)}</dd>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-fg-muted">
                  <dt>Car wash</dt>
                  <dd className="tnum">{formatCents(washCents)}</dd>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between border-t border-border pt-1.5">
                  <dt className="font-medium text-fg">Total</dt>
                  <dd className="tnum font-semibold text-fg">{formatCents(totalCents)}</dd>
                </div>
              </>
            ) : null}
            <div className={`flex items-baseline justify-between ${washCents ? 'mt-2' : ''}`}>
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
        {pending
          ? 'Submitting…'
          : confirming
            ? `Confirm ${formatCents(totalCents ?? 0)} — tap again`
            : 'Submit claim'}
      </Button>

      <p aria-live="polite" className="sr-only">
        {confirming ? 'That is an unusually large bill. Tap the button again to confirm.' : ''}
      </p>
    </form>
  )
}
