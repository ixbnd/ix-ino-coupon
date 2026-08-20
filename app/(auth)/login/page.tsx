import { Suspense } from 'react'
import { LoginForm } from './login-form'
import { CenteredPage } from '@/components/ui'

export default function LoginPage() {
  return (
    <CenteredPage>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </CenteredPage>
  )
}
