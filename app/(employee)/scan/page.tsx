import { redirect } from 'next/navigation'
import { requireDbSession } from '@/lib/auth/session'
import { Scanner } from './Scanner'

export default async function ScanPage() {
  const auth = await requireDbSession()
  if (!auth) redirect('/login?next=/scan')

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <h1 className="mb-6 text-xl font-semibold text-zinc-950 dark:text-zinc-50">Scan the coupon poster</h1>
        <Scanner />
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          You can also scan the poster with your phone&apos;s own camera app.
        </p>
        <p className="mt-2 text-sm">
          <a href="/change-password" className="text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
            Change password
          </a>
        </p>
      </div>
    </div>
  )
}
