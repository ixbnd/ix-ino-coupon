import { db } from '@/lib/db/client'
import { employees } from '@/lib/db/schema'
import { hashPassword, EMPLOYEE_ID_RE } from '@/lib/auth/password'

async function main() {
  const id = process.env.SEED_ADMIN_ID!, name = process.env.SEED_ADMIN_NAME ?? 'Admin', pw = process.env.SEED_ADMIN_PASSWORD!
  if (!EMPLOYEE_ID_RE.test(id)) throw new Error('SEED_ADMIN_ID must match ABC-0000')
  if (!pw || pw.length < 8) throw new Error('SEED_ADMIN_PASSWORD must be 8+ chars')
  await db.insert(employees)
    .values({ employeeId: id, name, role: 'admin', passwordHash: await hashPassword(pw), mustChangePassword: false })
    .onConflictDoNothing({ target: employees.employeeId })
  console.log(`seeded admin ${id} (no-op if existing)`)
  process.exit(0)
}
main()
