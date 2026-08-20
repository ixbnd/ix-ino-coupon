'use client'
import { ConfirmDialog } from '@/components/confirm-dialog'

/**
 * Sits below the data it exports, so you scroll past what you are about to
 * download before you download it. Confirmed because it is the one control on
 * the page that produces a file, and on a phone it is easy to hit by accident
 * while scrolling to the totals.
 */
export function ExportBar({ href, periodLabel }: { href: string; periodLabel: string }) {
  return (
    <div className="mt-6 flex justify-center sm:justify-end">
      <ConfirmDialog
        title="Download this report?"
        body={
          <>
            An Excel file for <span className="font-medium text-fg">{periodLabel}</span> will be saved to your device.
          </>
        }
        confirmLabel="Download"
        href={href}
        download
        trigger={(open) => (
          <button
            type="button"
            onClick={open}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-5 text-sm font-semibold text-fg shadow-card transition-colors hover:bg-surface-muted sm:w-auto"
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
              <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            Export .xlsx
          </button>
        )}
      />
    </div>
  )
}
