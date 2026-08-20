/**
 * The app's only piece of identity: a gold coupon ticket mark plus the name.
 * Deliberately generic — this repo is public and carries no company branding.
 */
export function Wordmark({ size = 'md' }: { size?: 'md' | 'sm' }) {
  const dim = size === 'sm' ? 20 : 24
  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0 text-brand"
      >
        {/* Ticket outline with the classic notch on each side. */}
        <path
          d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v2.25a2.25 2.25 0 0 0 0 4.5v2.25a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-2.25a2.25 2.25 0 0 0 0-4.5V7.5Z"
          fill="currentColor"
          fillOpacity="0.18"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M12 9v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 2" />
      </svg>
      <span
        className={
          size === 'sm'
            ? 'text-base font-semibold tracking-tight text-fg'
            : 'text-xl font-semibold tracking-tight text-fg'
        }
      >
        Coupon
      </span>
    </div>
  )
}
