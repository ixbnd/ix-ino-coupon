// Shared table/chip class strings for the week / month / year admin views.
// Colors come from the semantic tokens in globals.css, so these need no dark: variants.
// Nav and period-stepper styling lives in ViewChrome.tsx, which owns that chrome.
export const thClass =
  'sticky top-0 z-10 bg-surface-muted px-4 py-2.5 text-xs font-semibold tracking-wide text-fg-muted uppercase'
export const tdClass = 'px-4 py-3 text-fg'
export const chipClass =
  'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-brand-strong hover:text-fg'
