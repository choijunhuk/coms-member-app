import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  pushPermissionActionLabel,
  pushStatusFromPermission,
} from '../src/utils/pushPermissionStatus.js'

assert.equal(pushStatusFromPermission('granted', 'idle'), 'server-unavailable')
assert.equal(pushStatusFromPermission('granted', 'registered'), 'registered')
assert.equal(pushStatusFromPermission('denied', 'idle'), 'denied')
assert.equal(pushStatusFromPermission('prompt', 'idle'), 'idle')

assert.equal(pushPermissionActionLabel('granted', true), '허용됨')
assert.equal(pushPermissionActionLabel('denied', true), '설정 필요')
assert.equal(pushPermissionActionLabel('prompt', true), '켜기')
assert.equal(pushPermissionActionLabel('granted', false), '비활성')

const css = readFileSync('src/styles.css', 'utf8')
assert.match(css, /\.tab\s*\{[^}]*min-height:\s*3\.85rem/s)
assert.match(css, /\.tab-icon\s*\{[^}]*width:\s*1\.55rem/s)
assert.match(css, /\.tab-icon svg\s*\{[^}]*width:\s*1\.15rem/s)
assert.match(css, /\.card,\n\.panel,\n\.detail,\n\.empty-panel\s*\{[^}]*padding:\s*0\.9rem/s)

console.log('mobile ui contract passed')
