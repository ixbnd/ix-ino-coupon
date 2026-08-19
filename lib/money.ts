export function coveredCents(billTotalCents: number, capCents: number): number {
  return Math.min(billTotalCents, capCents)
}
export function excessCents(billTotalCents: number, capCents: number): number {
  return Math.max(0, billTotalCents - capCents)
}
export function parseBillToCents(input: string): number | null {
  const m = input.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!m) return null
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0)
}
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
export function capCents(): number {
  return Number(process.env.CLAIM_CAP_CENTS ?? 1500)
}
