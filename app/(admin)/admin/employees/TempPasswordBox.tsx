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
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950">
      <p className="mb-1 font-medium text-amber-900 dark:text-amber-200">
        Temporary password for {employeeId}
      </p>
      <div className="mb-2 flex items-center gap-2">
        <code className="rounded bg-white px-2 py-1 font-mono text-sm text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50">
          {tempPassword}
        </code>
        <CopyButton value={tempPassword} />
      </div>
      <p className="mb-2 text-xs text-amber-800 dark:text-amber-300">
        This won&apos;t be shown again. Share it with the employee now.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs font-medium text-amber-900 underline hover:no-underline dark:text-amber-200"
      >
        Dismiss
      </button>
    </div>
  )
}
