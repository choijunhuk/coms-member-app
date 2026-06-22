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
const appSource = readFileSync('src/App.jsx', 'utf8')
const nativeBridgeSource = readFileSync('src/services/nativeBridge.js', 'utf8')
const notificationsSource = readFileSync('src/screens/NotificationsTab.jsx', 'utf8')
const postContentSource = readFileSync('src/screens/community/PostContent.jsx', 'utf8')
const imageGallerySource = readFileSync('src/components/ImageGallery.jsx', 'utf8')
const composerSource = readFileSync('src/screens/community/Composer.jsx', 'utf8')
const pollBlockSource = readFileSync('src/screens/community/PollBlock.jsx', 'utf8')

assert.match(appSource, /onOpenPushSettings=\{openPushSettings\}/)
assert.match(nativeBridgeSource, /app-settings:/)
assert.match(nativeBridgeSource, /android\.settings\.APP_NOTIFICATION_SETTINGS/)
assert.match(notificationsSource, /pushStatus === 'error' \|\| pushStatus === 'server-unavailable'/)
assert.match(notificationsSource, /> 재시도/)
assert.match(notificationsSource, /> 설정 열기/)

assert.match(postContentSource, /className="post-image"[\s\S]*?loading="lazy"[\s\S]*?decoding="async"/)
assert.match(imageGallerySource, /<img src=\{src\} alt="" loading="lazy" decoding="async"/)
assert.match(composerSource, /<img src=\{src\} alt="" loading="lazy" decoding="async"/)
assert.match(pollBlockSource, /<img src=\{row\.imageUrl\} alt="" loading="lazy" decoding="async"/)

assert.match(css, /\.tab\s*\{[^}]*min-height:\s*3\.85rem/s)
assert.match(css, /\.tab-icon\s*\{[^}]*width:\s*1\.55rem/s)
assert.match(css, /\.tab-icon svg\s*\{[^}]*width:\s*1\.15rem/s)
assert.match(css, /\.card,\n\.panel,\n\.detail,\n\.empty-panel\s*\{[^}]*padding:\s*0\.9rem/s)

console.log('mobile ui contract passed')
