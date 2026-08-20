import { pgTable, serial, text, boolean, integer, timestamp, date, uniqueIndex, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  employeeId: text('employee_id').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['employee', 'admin'] }).notNull().default('employee'),
  passwordHash: text('password_hash').notNull(),
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  tokenVersion: integer('token_version').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('employee_id_format', sql`${t.employeeId} ~ '^[A-Z]{2,3}-[0-9]{4}$'`),
])

export const claims = pgTable('claims', {
  id: serial('id').primaryKey(),
  employeePk: integer('employee_pk').notNull().references(() => employees.id),
  claimDate: date('claim_date').notNull(),
  claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
  // The grand total charged, car wash included. Every money query and export sums this one
  // column, so coverage and excess keep working untouched as more line items appear.
  billTotalCents: integer('bill_total_cents').notNull(),
  // How much of that total was a car wash — a breakdown of billTotalCents, never an addition
  // to it. 0 means no car wash on this visit.
  carWashCents: integer('car_wash_cents').notNull().default(0),
  capCents: integer('cap_cents').notNull(),
  voided: boolean('voided').notNull().default(false),
  amendedBy: integer('amended_by').references(() => employees.id),
  amendedAt: timestamp('amended_at', { withTimezone: true }),
  voidedBy: integer('voided_by').references(() => employees.id),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('claims_one_per_thursday').on(t.employeePk, t.claimDate).where(sql`NOT voided`),
])
