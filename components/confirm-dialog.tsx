'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A confirmation step built on the native <dialog> element, which gives us the
 * modal backdrop, focus trapping, Esc-to-dismiss and inertness of the page
 * behind it without a dependency or a focus-management hook of our own.
 *
 * `trigger` renders the button that opens it; `onConfirm` runs on confirm. For
 * plain navigation (a download link) pass `href` instead and the confirm button
 * becomes an anchor.
 */
export function ConfirmDialog({
  trigger,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  href,
  download,
  onConfirm,
}: {
  trigger: (open: () => void) => ReactNode
  title: string
  body?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  href?: string
  download?: boolean
  onConfirm?: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  const confirmClass =
    tone === 'danger'
      ? 'flex min-h-11 flex-1 items-center justify-center rounded-lg border border-danger/50 bg-danger-subtle px-4 text-sm font-semibold text-danger transition-colors hover:border-danger'
      : 'flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover'

  return (
    <>
      {trigger(() => setOpen(true))}

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Clicking the backdrop (the dialog element itself, outside its box) dismisses.
          if (e.target === ref.current) setOpen(false)
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-card border border-border bg-surface p-6 text-fg shadow-raised backdrop:bg-black/40"
      >
        <h2 className="text-base font-semibold text-fg">{title}</h2>
        {body ? <div className="mt-2 text-sm text-fg-muted">{body}</div> : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-surface-muted"
          >
            {cancelLabel}
          </button>

          {href ? (
            <a href={href} download={download} onClick={() => setOpen(false)} className={confirmClass}>
              {confirmLabel}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onConfirm?.()
              }}
              className={confirmClass}
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </dialog>
    </>
  )
}
