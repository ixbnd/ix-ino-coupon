import * as React from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/* --- layout ------------------------------------------------------------- */

export function CenteredPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 justify-center bg-bg px-4 pt-10 pb-8 sm:items-center sm:pt-8">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'rounded-card border border-border bg-surface p-6 shadow-card sm:p-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PageHeading({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight text-fg">{children}</h1>
      {sub ? <p className="mt-1 text-sm text-fg-muted">{sub}</p> : null}
    </div>
  )
}

/* --- controls ----------------------------------------------------------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'md' | 'sm'
  full?: boolean
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

const BUTTON_VARIANT: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'border border-border-strong bg-surface text-fg hover:bg-surface-muted',
  danger: 'border border-danger/40 bg-danger-subtle text-danger hover:border-danger/70',
  ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
}

/* 44px min height on md: this is used one-handed at a counter. */
const BUTTON_SIZE: Record<NonNullable<ButtonProps['size']>, string> = {
  md: 'min-h-11 px-4 py-2.5 text-sm',
  sm: 'min-h-9 px-3 py-1.5 text-sm',
}

export function Button({ variant = 'primary', size = 'md', full, className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], full && 'w-full', className)}
    />
  )
}

export function LinkButton({
  variant = 'secondary',
  size = 'md',
  full,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & Pick<ButtonProps, 'variant' | 'size' | 'full'>) {
  return (
    <a
      {...props}
      className={cx(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], full && 'w-full', className)}
    />
  )
}

export function TextLink({ className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      className={cx('font-medium text-primary underline underline-offset-4 decoration-brand-strong/50 hover:decoration-brand-strong', className)}
    />
  )
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: React.ReactNode
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  )
}

export const INPUT_CLASS =
  'w-full rounded-lg border border-border-strong bg-surface px-3 py-2.5 text-base text-fg ' +
  'placeholder:text-fg-subtle focus:outline-none'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(INPUT_CLASS, className)} />
}

/* --- feedback ----------------------------------------------------------- */

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mb-4 rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger"
    >
      {children}
    </p>
  )
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'success' | 'danger' | 'brand'
  children: React.ReactNode
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface-muted text-fg-muted',
    success: 'bg-success-subtle text-success',
    danger: 'bg-danger-subtle text-danger',
    brand: 'bg-brand-subtle text-fg',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-border-strong bg-surface-muted/50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      {children ? <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">{children}</p> : null}
    </div>
  )
}

/* --- data --------------------------------------------------------------- */

export const TH_CLASS =
  'sticky top-0 z-10 bg-surface-muted px-3 py-2.5 text-left text-xs font-semibold ' +
  'tracking-wide text-fg-muted uppercase'
export const TD_CLASS = 'px-3 py-2.5 text-sm text-fg'

export function TableFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
      <table className="w-full border-collapse">{children}</table>
    </div>
  )
}

export function Money({ cents, format }: { cents: number | null; format: (c: number) => string }) {
  if (cents === null) return <span className="text-fg-subtle">—</span>
  return <span className="tnum">{format(cents)}</span>
}
