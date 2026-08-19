'use client'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { login } from './actions'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null)
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? ''

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900"
    >
      <h1 className="mb-6 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Coupon</h1>
      <input type="hidden" name="next" value={next} />
      <div className="mb-4">
        <label htmlFor="employeeId" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Employee ID
        </label>
        <input
          id="employeeId"
          name="employeeId"
          type="text"
          required
          autoCapitalize="characters"
          autoComplete="username"
          pattern="[A-Za-z]{3}-[0-9]{4}"
          placeholder="ABC-0001"
          onInput={(e) => {
            e.currentTarget.value = e.currentTarget.value.toUpperCase()
          }}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
        />
      </div>
      <div className="mb-6">
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
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
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
