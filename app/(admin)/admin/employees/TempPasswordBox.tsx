'use client'
import { CopyButton } from './CopyButton'

export function TempPasswordBox({
  employeeId, tempPassword, onDismiss,
}: {
  employeeId: string
  tempPassword: string
  onDismiss: () => void
}) {
  return (
    <div className="rounded-lg border border-brand bg-brand-subtle p-3 text-sm">
      <p className="mb-1 font-medium text-fg">
        Temporary password for {employeeId}
      </p>
      <div className="mb-2 flex items-center gap-2">
        <code className="rounded bg-surface px-2 py-1 font-mono text-sm text-fg">
          {tempPassword}
        </code>
        <CopyButton value={tempPassword} />
      </div>
      <p className="mb-2 text-xs text-fg-muted">
        This won&apos;t be shown again. Share it with the employee now.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs font-medium text-fg underline hover:no-underline"
      >
        Dismiss
      </button>
    </div>
  )
}
