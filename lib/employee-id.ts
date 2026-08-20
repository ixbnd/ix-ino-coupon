// Formats raw Employee ID input as the user types: uppercase, 2-3 letters,
// auto-insert the dash when digits start, cap at 4 digits.
export function formatEmployeeIdInput(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const m = s.match(/[A-Z]{1,3}/)
  if (!m) return ''
  const letters = m[0]
  const digits = s.slice(s.indexOf(letters) + letters.length).replace(/[^0-9]/g, '').slice(0, 4)
  return digits ? `${letters}-${digits}` : letters
}
