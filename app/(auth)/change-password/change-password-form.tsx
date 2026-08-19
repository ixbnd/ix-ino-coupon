'use client'
import { useActionState } from 'react'
import { changePassword } from './actions'

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, null)

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900"
    >
      <h1 className="mb-2 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Change your password</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Choose your own password to replace the temporary one.
      </p>
      <div className="mb-4">
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">At least 8 characters.</p>
      </div>
      <div className="mb-6">
        <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </div>
      {state?.error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {pending ? 'Saving…' : 'Save password'}
      </button>
    </form>
  )
}
