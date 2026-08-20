'use client'
import { useActionState } from 'react'
import { changePassword } from './actions'
import { Button, Card, ErrorNote, Field, Input } from '@/components/ui'
import { Wordmark } from '@/components/wordmark'

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, null)

  return (
    <Card>
      <form action={formAction}>
        <div className="mb-6">
          <Wordmark />
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-fg">Change your password</h1>
          <p className="mt-1 text-sm text-fg-muted">Pick something only you know.</p>
        </div>

        <Field label="New password" htmlFor="password" hint="At least 8 characters.">
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>

        <div className="mb-6">
          <Field label="Confirm new password" htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
        </div>

        {state?.error ? <ErrorNote>{state.error}</ErrorNote> : null}

        <Button type="submit" disabled={pending} full>
          {pending ? 'Saving…' : 'Save password'}
        </Button>
      </form>
    </Card>
  )
}
