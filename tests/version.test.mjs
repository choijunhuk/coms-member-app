import assert from 'node:assert/strict'
import { compareVersion, isVersionBelow, parseVersion } from '../src/utils/version.ts'

assert.deepEqual(parseVersion('1.2.3'), [1, 2, 3])
assert.deepEqual(parseVersion('1.2'), [1, 2, 0])
assert.deepEqual(parseVersion(''), [0, 0, 0])
assert.deepEqual(parseVersion('1.2.3.4'), [1, 2, 3])
assert.deepEqual(parseVersion('a.b.c'), [0, 0, 0])

assert.equal(compareVersion('1.0.0', '1.0.0'), 0)
assert.equal(compareVersion('1.0.0', '1.0.1'), -1)
assert.equal(compareVersion('1.1.0', '1.0.9'), 1)
assert.equal(compareVersion('2.0.0', '1.99.99'), 1)
assert.equal(compareVersion('0.1.0', '0.10.0'), -1)

assert.equal(isVersionBelow('0.1.0', '0.2.0'), true)
assert.equal(isVersionBelow('0.2.0', '0.2.0'), false)
assert.equal(isVersionBelow('1.0.0', '0.9.9'), false)
assert.equal(isVersionBelow(null, '1.0.0'), false)
assert.equal(isVersionBelow('1.0.0', null), false)

console.log('version contract passed')
