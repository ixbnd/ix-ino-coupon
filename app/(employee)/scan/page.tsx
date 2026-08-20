import { redirect } from 'next/navigation'
import { requireDbSession } from '@/lib/auth/session'
import { Scanner } from './Scanner'
import { Card, CenteredPage, TextLink } from '@/components/ui'
import { Wordmark } from '@/components/wordmark'

export default async function ScanPage() {
  const auth = await requireDbSession()
  if (!auth) redirect('/login?next=%2Fscan')

  return (
    <CenteredPage>
      <div className="mb-6 flex justify-center">
        <Wordmark size="sm" />
      </div>

      <Card>
        <h1 className="text-xl font-semibold tracking-tight text-fg">Scan the coupon poster</h1>
        <p className="mt-1 mb-5 text-sm text-fg-muted">Point your camera at the code on the counter.</p>
        <Scanner />
        <p className="mt-4 text-sm text-fg-subtle">
          Your phone&apos;s own camera app works too — it opens the same page.
        </p>
      </Card>

      <p className="mt-6 flex items-center justify-center gap-4 text-sm">
        <TextLink href="/history">My claim history</TextLink>
        <span aria-hidden="true" className="text-fg-subtle">·</span>
        <TextLink href="/change-password">Change password</TextLink>
      </p>
    </CenteredPage>
  )
}
