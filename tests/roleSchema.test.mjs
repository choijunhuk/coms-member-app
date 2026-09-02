import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MemberRole } from '../src/contract/enums.ts'
import { ROLE_LABELS } from '../src/utils/helpers.ts'
import {
  CurrentUserSchema,
  MemberRoleSchema,
  degradeInvalidApiResponse,
  parseApiResponse,
} from '../src/services/responseSchemas.ts'

// The vendored enum only knew USER/ADMIN, so /api/auth/me for an
// OFFICER / VICE_PRESIDENT / ASSOCIATE member failed validation, restoreSession
// caught it, and those roles could never leave the login screen. All five
// backend Member.Role values must parse.
const ALL_ROLES = ['ASSOCIATE', 'USER', 'OFFICER', 'VICE_PRESIDENT', 'ADMIN']
assert.deepEqual(Object.values(MemberRole), ALL_ROLES)

for (const role of ALL_ROLES) {
  assert.equal(MemberRoleSchema.parse(role), role)
  const user = parseApiResponse(CurrentUserSchema, { id: 1, studentId: '2024000001', role }, '현재 사용자')
  assert.equal(user.role, role)
}

// Every role still has a Korean label (drift guard lives in enumLabels).
for (const role of ALL_ROLES) assert.ok(ROLE_LABELS[role])
assert.equal(ROLE_LABELS.VICE_PRESIDENT, '부회장')

// The drift guard stays: an unknown role is still rejected, not silently accepted.
assert.throws(
  () => parseApiResponse(CurrentUserSchema, { id: 2, role: 'TREASURER' }, '현재 사용자'),
  (error) => error.code === 'INVALID_API_RESPONSE',
)

// ...but a future drift must DEGRADE rather than brick the app: the raw payload
// rides along on the error, and dropping the one field zod rejected yields a
// usable user with `role` undefined.
let driftError
try {
  parseApiResponse(CurrentUserSchema, { id: 3, studentId: '2025000002', name: '표류', role: 'TREASURER' }, '현재 사용자')
} catch (error) {
  driftError = error
}
assert.equal(driftError.data.role, 'TREASURER')
const degraded = degradeInvalidApiResponse(CurrentUserSchema, driftError)
assert.equal(degraded.role, undefined)
assert.equal(degraded.id, 3)
assert.equal(degraded.name, '표류')

// Unsalvageable payloads keep the hard-failure path (caller drops to login).
assert.equal(degradeInvalidApiResponse(CurrentUserSchema, driftError && { code: 'INVALID_API_RESPONSE', data: null }), null)
assert.equal(degradeInvalidApiResponse(CurrentUserSchema, Object.assign(new Error('401'), { status: 401 })), null)

// The server-sent 기수 field survives validation (website #431).
assert.equal(parseApiResponse(CurrentUserSchema, { id: 4, generation: 59 }, '현재 사용자').generation, 59)

// restoreSession must actually take the degrade path before the logout path.
const appSource = readFileSync('src/App.tsx', 'utf8')
assert.match(appSource, /const degraded = degradeInvalidApiResponse\(CurrentUserSchema, error\)[\s\S]*?setUser\(degraded\)[\s\S]*?return/)

console.log('member role schema contract passed')
