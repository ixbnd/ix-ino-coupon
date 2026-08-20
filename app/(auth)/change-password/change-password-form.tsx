'use client'
import Link from 'next/link'
import { useActionState } from 'react'
import { changePassword } from './actions'
import { Button, Card, ErrorNote, Field, Input } from '@/components/ui'
import { Wordmark } from '@/components/wordmark'

export function ChangePasswordForm({ back, forced }: { back: string | null; forced: boolean }) {
  const [state, formAction, pending] = useActionState(changePassword, null)

  return (
    <>
      {back ? (
        <Link
          href={back}
          className="mb-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </Link>
      ) : null}

      <Card>
        <form action={formAction}>
          <div className="mb-6">
            <Wordmark />
            <h1 className="mt-4 text-lg font-semibold tracking-tight text-fg">Change your password</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {forced
                ? 'Replace the temporary password you were given to finish signing in.'
                : 'Pick something only you know.'}
            </p>
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
    </>
  )
}
