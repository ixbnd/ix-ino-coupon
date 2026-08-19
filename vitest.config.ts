import { defineConfig } from 'vitest/config'
import path from 'node:path'
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'tests/**/*.test.ts'],
    passWithNoTests: true,
    // Multiple test files TRUNCATE the same shared `claims`/`employees` tables in a real
    // Postgres instance (see tests/db.test.ts, tests/auth-flow.test.ts, tests/claim-flow.test.ts).
    // Running files in parallel races those TRUNCATEs against concurrent inserts in other files,
    // causing intermittent FK/unique-constraint failures. Serialize file execution instead.
    fileParallelism: false,
  },
  resolve: { alias: { '@': path.resolve(__dirname) } },
})
