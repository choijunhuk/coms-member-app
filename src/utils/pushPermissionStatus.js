export function pushStatusFromPermission(permission, currentStatus = 'idle') {
  if (permission === 'granted') {
    if (currentStatus === 'registered') return 'registered'
    return 'server-unavailable'
  }
  if (permission === 'denied') return 'denied'
  if (permission === 'unavailable') return 'unavailable'
  if (currentStatus === 'requesting' || currentStatus === 'requested') return currentStatus
  return 'idle'
}

export function pushPermissionActionLabel(permission, pushEnabled = true) {
  if (!pushEnabled) return '비활성'
  if (permission === 'granted') return '허용됨'
  if (permission === 'denied') return '설정 필요'
  return '켜기'
}
