'use client'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { login } from './actions'
import { formatEmployeeIdInput } from '@/lib/employee-id'
import { Button, Card, ErrorNote, Field, Input } from '@/components/ui'
import { Wordmark } from '@/components/wordmark'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null)
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? ''

  return (
    <Card>
      <form action={formAction}>
        <div className="mb-6">
          <Wordmark />
          <p className="mt-2 text-sm text-fg-muted">Sign in to claim your Thursday coupon.</p>
        </div>

        <input type="hidden" name="next" value={next} />

        <Field label="Employee ID" htmlFor="employeeId">
          <Input
            id="employeeId"
            name="employeeId"
            type="text"
            required
            autoCapitalize="characters"
            autoComplete="username"
            spellCheck={false}
            inputMode="text"
            pattern="[A-Za-z]{2,3}-[0-9]{4}"
            placeholder="ABC-0001"
            className="tnum tracking-wide"
            onInput={(e) => {
              e.currentTarget.value = formatEmployeeIdInput(e.currentTarget.value)
            }}
          />
        </Field>

        <div className="mb-6">
          <Field label="Password" htmlFor="password">
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </Field>
        </div>

        {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}

        <Button type="submit" disabled={pending} full>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </Card>
  )
}
